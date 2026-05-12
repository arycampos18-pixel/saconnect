import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook público Z-API — Fluxo de ingestão robusto.
 *
 * Segurança:
 *   - Verifica o header Client-Token (ZAPI_CLIENT_TOKEN) se configurado.
 *
 * Idempotência (2 camadas):
 *   - 1ª: provedor_message_id (messageId único do Z-API)
 *   - 2ª: SHA-256 do corpo raw → coluna event_hash em whatsapp_webhook_raw
 *
 * Mídia suportada:
 *   - Imagens (.jpg, .png, .webp, .gif)
 *   - Vídeos (.mp4, .avi, .mov)
 *   - Áudios (.ogg, .webm, .opus, .mp3, .m4a) — incluindo gravações WhatsApp
 *   - Documentos (extrai nome e extensão originais)
 *   - Localização, Contacto, Sticker
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ── Segurança: Client-Token ─────────────────────────────────────────────
  if (CLIENT_TOKEN) {
    const headerToken =
      req.headers.get("Client-Token") ??
      req.headers.get("client-token") ??
      req.headers.get("x-client-token") ??
      "";
    if (headerToken !== CLIENT_TOKEN) {
      console.warn("[webhook] Client-Token inválido:", headerToken.slice(0, 8) + "…");
      return new Response(JSON.stringify({ ok: false, reason: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ── Leitura do body ─────────────────────────────────────────────────────
  let rawText = "";
  let payload: any = {};
  try {
    rawText = await req.text();
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = { __raw: rawText };
  }

  // ── Idempotência 2ª camada: hash do corpo raw ───────────────────────────
  let eventHash: string | null = null;
  if (rawText) {
    try {
      const buf = new TextEncoder().encode(rawText);
      const digest = await crypto.subtle.digest("SHA-256", buf);
      eventHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
      // Verifica se já processámos este hash exato
      const { data: existingHash } = await admin
        .from("whatsapp_webhook_raw")
        .select("id, processado")
        .eq("event_hash", eventHash)
        .maybeSingle();
      if (existingHash?.processado) {
        return new Response(JSON.stringify({ ok: true, ignored: "duplicate-hash" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch { /* hash opcional — não bloqueia */ }
  }

  const messageId: string | null =
    payload?.messageId || payload?.id || payload?.data?.messageId || null;
  const evento: string | null = payload?.type || payload?.event || null;
  const instancia: string | null = payload?.instanceId || null;

  // ── Grava RAW (sempre) ──────────────────────────────────────────────────
  let rawId: string | null = null;
  try {
    const rawInsert: Record<string, unknown> = {
      provedor: "Z-API",
      evento,
      provedor_message_id: messageId,
      payload,
    };
    if (eventHash) rawInsert.event_hash = eventHash;
    const { data: rawRow, error: rawErr } = await admin
      .from("whatsapp_webhook_raw")
      .insert(rawInsert)
      .select("id")
      .single();
    if (rawErr) throw rawErr;
    rawId = rawRow.id;
  } catch (e) {
    console.error("FALHA CRÍTICA ao salvar raw:", e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const tipoEvento = String(evento || "").toLowerCase();

    // ── Mudança de status ───────────────────────────────────────────────
    if (tipoEvento === "messagestatuscallback") {
      if (messageId) {
        const zapiStatus = String(payload.status ?? "").toUpperCase();
        const statusMap: Record<string, string> = {
          SENT: "Enviado", DELIVERED: "Entregue", READ: "Lido", RECEIVED: "Recebido",
        };
        await admin
          .from("whatsapp_mensagens")
          .update({ status: statusMap[zapiStatus] ?? zapiStatus })
          .eq("provedor_message_id", messageId);
      }
      await markRawProcessed(admin, rawId, null, null, "status_updated");
      return ok({ processed: "status" });
    }

    // ── Presença ────────────────────────────────────────────────────────
    if (tipoEvento === "presencechatcallback" || tipoEvento === "chatpresence") {
      await markRawProcessed(admin, rawId, null, null, "presence_ignored");
      return ok({ processed: "presence" });
    }

    // ── Desconexão / Conexão ────────────────────────────────────────────
    if (tipoEvento === "onwhatsappdisconnected") {
      console.warn(`[webhook] Instância ${instancia} desconectada.`);
      await markRawProcessed(admin, rawId, null, null, "disconnected_noted");
      return ok({ processed: "disconnection" });
    }
    if (tipoEvento === "onwebhookconnected") {
      console.log("[webhook] Webhook Z-API conectado.");
      await markRawProcessed(admin, rawId, null, null, "connected_noted");
      return ok({ processed: "connection" });
    }

    // ── Mensagens ───────────────────────────────────────────────────────
    const isMessage =
      tipoEvento.includes("received") ||
      tipoEvento.includes("sentcallback") ||
      tipoEvento === "sent" ||
      (!!payload?.phone &&
        (payload.text || payload.image || payload.audio || payload.video ||
          payload.document || payload.sticker || payload.body));

    if (!isMessage) {
      await markRawProcessed(admin, rawId, null, null, "unhandled_event");
      return ok({ ignored: "unhandled", evento: tipoEvento });
    }

    const fromMe = Boolean(payload?.fromMe);
    const phoneRaw: string = payload?.phone || payload?.from || payload?.author || "";
    // Normaliza sempre para formato completo com código de país BR (55)
    // ex.: "62999999999" → "5562999999999" | "5562999999999" → "5562999999999"
    const phoneDigits = normalizarTelefone(phoneRaw);

    if (!phoneDigits) {
      await markRawProcessed(admin, rawId, null, null, "no phone");
      return ok({ ignored: "no phone" });
    }

    const senderName: string | null =
      payload?.senderName || payload?.chatName || payload?.notifyName || null;

    // ── Idempotência 1ª camada: provedor_message_id ─────────────────────
    if (messageId) {
      const { data: dup } = await admin
        .from("whatsapp_mensagens")
        .select("id, conversa_id")
        .eq("provedor_message_id", messageId)
        .maybeSingle();
      if (dup) {
        await markRawProcessed(admin, rawId, dup.conversa_id, dup.id, "duplicate");
        return ok({ ignored: "duplicate" });
      }
    }

    // ── Parser de conteúdo / mídia ──────────────────────────────────────
    let tipo = "texto";
    let conteudo: string | null = null;
    let midia_url: string | null = null;
    let midia_mime: string | null = null;
    let nome_arquivo: string | null = null;

    if (payload.text?.message) {
      tipo = "texto";
      conteudo = payload.text.message;
    } else if (payload.image) {
      tipo = "imagem";
      conteudo = payload.image.caption ?? null;
      midia_url = payload.image.imageUrl ?? payload.image.url ?? null;
      midia_mime = payload.image.mimeType ?? "image/jpeg";
    } else if (payload.video) {
      tipo = "video";
      conteudo = payload.video.caption ?? null;
      midia_url = payload.video.videoUrl ?? payload.video.url ?? null;
      midia_mime = payload.video.mimeType ?? "video/mp4";
    } else if (payload.audio) {
      tipo = "audio";
      midia_url = payload.audio.audioUrl ?? payload.audio.url ?? null;
      // WhatsApp grava em ogg/opus — normaliza o mime para browser-friendly
      const rawMime = String(payload.audio.mimeType ?? "audio/ogg").toLowerCase();
      midia_mime = rawMime.includes("webm") ? "audio/webm" : "audio/ogg";
    } else if (payload.document) {
      tipo = "documento";
      nome_arquivo = payload.document.fileName ?? payload.document.filename ?? null;
      conteudo = nome_arquivo;
      midia_url = payload.document.documentUrl ?? payload.document.url ?? null;
      midia_mime = payload.document.mimeType ?? "application/octet-stream";
    } else if (payload.sticker) {
      tipo = "imagem";
      midia_url = payload.sticker.stickerUrl ?? payload.sticker.url ?? null;
      midia_mime = payload.sticker.mimeType ?? "image/webp";
      conteudo = "[sticker]";
    } else if (payload.location) {
      tipo = "localizacao";
      const lat = payload.location.latitude ?? payload.location.lat;
      const lng = payload.location.longitude ?? payload.location.lon ?? payload.location.lng;
      conteudo = `${lat},${lng}`;
    } else if (payload.contact) {
      tipo = "contato";
      conteudo = payload.contact.displayName ?? payload.contact.name ?? null;
    } else {
      tipo = "outro";
      conteudo = typeof payload.body === "string" ? payload.body : null;
    }

    // ── Download e upload de mídia para Supabase Storage ───────────────
    if (midia_url && tipo !== "localizacao" && tipo !== "contato" && tipo !== "outro") {
      try {
        const mediaResp = await fetch(midia_url);
        if (mediaResp.ok) {
          const bytes = new Uint8Array(await mediaResp.arrayBuffer());
          const ct = mediaResp.headers.get("content-type") || midia_mime || "application/octet-stream";
          const ext = guessExt(ct, nome_arquivo) || "bin";
          const path = `${tipo}/${phoneDigits}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
          const { error: upErr } = await admin.storage
            .from("whatsapp-media")
            .upload(path, bytes, { contentType: ct });
          if (!upErr) {
            const { data: pub } = admin.storage.from("whatsapp-media").getPublicUrl(path);
            midia_url = pub.publicUrl;
            midia_mime = ct;
          }
        }
      } catch (e) {
        console.warn("[webhook] upload mídia falhou:", e);
      }
    }

    // ── Upsert conversa ─────────────────────────────────────────────────
    const agora = new Date().toISOString();
    const resumo = conteudo
      ? (conteudo.length > 80 ? conteudo.slice(0, 80) + "…" : conteudo)
      : `[${tipo}]`;

    const { data: existing } = await admin
      .from("whatsapp_conversas")
      .select("id, contato_nome")
      .eq("telefone_digits", phoneDigits)
      .maybeSingle();

    let conversaId: string | null = existing?.id ?? null;

    if (!conversaId) {
      const { data: created } = await admin
        .from("whatsapp_conversas")
        .insert({
          telefone: phoneRaw || phoneDigits,
          telefone_digits: phoneDigits,
          contato_nome: senderName,
          status: "Pendente",
          instancia,
          ultima_mensagem: resumo,
          ultima_mensagem_em: agora,
          ultima_direcao: fromMe ? "saida" : "entrada",
          nao_lidas: fromMe ? 0 : 1,
        })
        .select("id")
        .single();
      conversaId = created?.id ?? null;
      if (!conversaId) throw new Error("Não foi possível criar a conversa");
    } else {
      // Actualiza últimos dados; o trigger DB cuida de nao_lidas
      const updPatch: Record<string, unknown> = {
        ultima_mensagem: resumo,
        ultima_mensagem_em: agora,
        ultima_direcao: fromMe ? "saida" : "entrada",
      };
      if (senderName && !existing?.contato_nome) updPatch.contato_nome = senderName;
      if (instancia) updPatch.instancia = instancia;
      await admin.from("whatsapp_conversas").update(updPatch).eq("id", conversaId);
    }

    // ── Insere mensagem ─────────────────────────────────────────────────
    const direcao = fromMe ? "saida" : "entrada";
    const status = fromMe ? "Enviado" : "Recebido";

    const { data: msgRow, error: insErr } = await admin
      .from("whatsapp_mensagens")
      .insert({
        conversa_id: conversaId,
        direcao, tipo, conteudo, midia_url, midia_mime,
        provedor_message_id: messageId,
        status,
        enviado_em: agora,
        created_at: agora,
        metadata: { ...payload, _nome_arquivo: nome_arquivo },
      })
      .select("id")
      .single();

    if (insErr) {
      if (String(insErr.message).includes("uq_whatsapp_mensagens_provedor_msgid")) {
        return ok({ ignored: "duplicate-race" });
      }
      throw insErr;
    }

    // ── Roteamento automático ───────────────────────────────────────────
    if (!fromMe && conteudo) {
      await roteamentoAutomatico(admin, conversaId, conteudo).catch(
        (e) => console.warn("[webhook] roteamento falhou:", e),
      );
    }

    await markRawProcessed(admin, rawId, conversaId, msgRow.id, null);
    return ok({ rawId, conversaId, mensagemId: msgRow.id });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[webhook] erro não tratado:", msg);
    if (rawId) {
      await admin
        .from("whatsapp_webhook_raw")
        .update({ erro: msg, processado_em: new Date().toISOString() })
        .eq("id", rawId);
    }
    return ok({ error: msg });
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function markRawProcessed(
  admin: ReturnType<typeof createClient>,
  rawId: string | null,
  conversaId: string | null,
  mensagemId: string | null,
  motivo: string | null,
) {
  if (!rawId) return;
  await admin
    .from("whatsapp_webhook_raw")
    .update({
      processado: true,
      processado_em: new Date().toISOString(),
      conversa_id: conversaId,
      mensagem_id: mensagemId,
      erro: motivo,
    })
    .eq("id", rawId);
}

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Detecta extensão a partir do Content-Type ou do nome original do ficheiro.
 * Cobre todos os formatos relevantes para WhatsApp.
 */
/**
 * Normaliza o número para dígitos com prefixo 55 (Brasil), formato canónico.
 *
 * Reforma do 9 dígito (Brazil):
 *  - Celulares brasileiros passaram de 8 para 9 dígitos (DDD + 9 + 8 dígitos).
 *  - Z-API pode enviar o número com ou sem o 9 inicial nos celulares.
 *  - Esta função garante o formato correcto: 55 + DDD(2) + 9 + 8dígitos = 13 dígitos.
 */
function normalizarTelefone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return digits;

  // Remove prefixo 55 temporariamente para trabalhar com o número local
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);

  // Número local:
  //  11 dígitos = DDD(2) + 9 + 8 dígitos → correcto (celular com 9)
  //  10 dígitos = DDD(2) + 8 dígitos → pode ser celular sem o 9 ou fixo
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2); // 8 dígitos
    // Celulares brasileiros começam com 6,7,8,9 após o DDD.
    // Se começar com 9 já está correctamente sem o "nono dígito" extra;
    // Se não começar com 9 (ex.: 8xxx,7xxx) pode ser fixo — mantemos.
    // A reforma adicionou 9 ANTES do número móvel existente: 8877-xxxx → 9 8877-xxxx.
    // Portanto, se o número tem 8 dígitos e é mobile (começa com ≥6), adicionar 9.
    const firstDigit = parseInt(rest[0], 10);
    if (firstDigit >= 6) {
      // Provavelmente celular sem o nono dígito — adiciona 9
      digits = ddd + "9" + rest;
    }
    // Fixo (começa com 2,3,4,5) → mantém 10 dígitos
  }

  return "55" + digits;
}

function guessExt(ct: string, originalName?: string | null): string | null {
  // Tenta pelo nome original primeiro
  if (originalName) {
    const m = originalName.match(/\.([a-z0-9]+)$/i);
    if (m) return m[1].toLowerCase();
  }
  const mime = ct.toLowerCase().split(";")[0].trim();
  const map: Record<string, string> = {
    // Imagens
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    // Vídeos
    "video/mp4": "mp4",
    "video/mpeg": "mpeg",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/webm": "webm",
    "video/3gpp": "3gp",
    // Áudios — WhatsApp usa ogg/opus e webm/opus
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "audio/opus": "opus",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/x-m4a": "m4a",
    "audio/wav": "wav",
    // Documentos
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
  };
  return map[mime] ?? null;
}

async function roteamentoAutomatico(
  admin: ReturnType<typeof createClient>,
  conversaId: string,
  texto: string,
) {
  const { data: conv } = await admin
    .from("whatsapp_conversas")
    .select("atendente_id, status")
    .eq("id", conversaId)
    .single();
  if (!conv || conv.atendente_id || conv.status !== "Pendente") return;

  const { data: regras } = await admin
    .from("whatsapp_roteamento_regras")
    .select("*")
    .eq("ativo", true)
    .order("prioridade", { ascending: false });

  const lower = texto.toLowerCase();
  const match = (regras ?? []).find((r: any) =>
    Array.isArray(r.palavras_chave)
      ? r.palavras_chave.some((kw: string) => lower.includes(kw.toLowerCase()))
      : false,
  );
  if (!match) return;

  const upd: Record<string, unknown> = {};
  if (match.acao_departamento_id) upd.departamento_id = match.acao_departamento_id;
  if (match.acao_atendente_id) {
    upd.atendente_id = match.acao_atendente_id;
    upd.status = "Em atendimento";
    upd.assumida_em = new Date().toISOString();
  }
  if (Object.keys(upd).length > 0) {
    await admin.from("whatsapp_conversas").update(upd).eq("id", conversaId);
    await admin.from("whatsapp_conversa_notas").insert({
      conversa_id: conversaId,
      conteudo: `🤖 Roteado automaticamente: ${match.nome ?? "regra"}`,
    });
  }
}
