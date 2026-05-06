import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook público Z-API "Ao receber mensagem".
 * Garantia anti-perda:
 *  1. Grava SEMPRE o payload bruto em whatsapp_webhook_raw ANTES de qualquer parsing.
 *  2. Idempotência por provedor_message_id (evita duplicatas em reentregas).
 *  3. Aceita fromMe (mensagens enviadas pelo celular também são salvas).
 *  4. Em falha real de gravação, retorna 500 → Z-API reenvia.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1) Lê o payload de forma resiliente
  let rawText = "";
  let payload: any = {};
  try {
    rawText = await req.text();
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = { __raw: rawText };
  }

  // 2) GRAVA RAW PRIMEIRO — nada se perde, mesmo que o parser falhe depois
  const messageId: string | null =
    payload?.messageId || payload?.id || payload?.data?.messageId || null;
  const evento: string | null = payload?.type || payload?.event || null;

  let rawId: string | null = null;
  try {
    const { data: rawRow, error: rawErr } = await admin
      .from("whatsapp_webhook_raw")
      .insert({
        provedor: "Z-API",
        evento,
        provedor_message_id: messageId,
        payload,
      })
      .select("id")
      .single();
    if (rawErr) {
      console.error("FALHA CRÍTICA ao salvar raw:", rawErr.message);
      // Retorna 500 → Z-API reenvia
      return new Response(JSON.stringify({ ok: false, error: "raw save failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    rawId = rawRow.id;
  } catch (e) {
    console.error("FALHA CRÍTICA raw catch:", e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3) Tenta processar — se falhar, raw já está salvo, retornamos 200 e podemos reprocessar depois
  try {
    const fromMe = Boolean(payload?.fromMe);

    // ============================================================
    // IGNORA eventos que NÃO são mensagens (callbacks de status,
    // presença, etc). A Z-API envia "MessageStatusCallback" para
    // cada mudança de status (SENT/RECEIVED/READ) — esses eventos
    // não devem virar novas mensagens na conversa.
    // ============================================================
    const tipoEvento = String(payload?.type || payload?.event || "").toLowerCase();
    // Eventos de status/presença que NÃO devem virar mensagens.
    // ATENÇÃO: usar match exato — "ReceivedCallback" contém "ack" dentro de "callback",
    // então `includes("ack")` quebra o recebimento de mensagens reais.
    const STATUS_EVENTS = new Set([
      "messagestatuscallback",
      "deliverycallback",
      "presencechatcallback",
      "chatpresence",
    ]);
    const hasContentContainer =
      !!payload?.text || !!payload?.image || !!payload?.audio ||
      !!payload?.video || !!payload?.document || !!payload?.location ||
      !!payload?.contact || typeof payload?.body === "string";
    const isStatusCallback =
      STATUS_EVENTS.has(tipoEvento) ||
      // Heurística: payload tem `status` (string tipo SENT/READ) e NÃO tem conteúdo
      (typeof payload?.status === "string" && !hasContentContainer && !payload?.fromMe && !payload?.messageId);
    if (isStatusCallback) {
      await markRawProcessed(admin, rawId, null, null, `ignored:${tipoEvento || "status"}`);
      return ok({ ignored: "status-callback", rawId });
    }

    const phoneRaw: string =
      payload?.phone || payload?.from || payload?.author || "";
    const phoneDigits = String(phoneRaw).replace(/\D/g, "");
    if (!phoneDigits) {
      await markRawProcessed(admin, rawId, null, null, "no phone");
      return ok({ ignored: "no phone", rawId });
    }

    const senderName: string | null =
      payload?.senderName || payload?.chatName || payload?.notifyName || null;
    const instancia: string | null = payload?.instanceId || null;

    // Idempotência: se já existe mensagem com esse provedor_message_id, ignora
    if (messageId) {
      const { data: dup } = await admin
        .from("whatsapp_mensagens")
        .select("id, conversa_id")
        .eq("provedor_message_id", messageId)
        .maybeSingle();
      if (dup) {
        await markRawProcessed(admin, rawId, dup.conversa_id, dup.id, "duplicate");
        return ok({ ignored: "duplicate", rawId, mensagemId: dup.id });
      }
    }

    // Detecta tipo + conteúdo
    let tipo: "texto" | "imagem" | "audio" | "video" | "documento" | "localizacao" | "contato" | "outro" = "texto";
    let conteudo: string | null = null;
    let midia_url: string | null = null;
    let midia_mime: string | null = null;

    const p: any = payload;
    if (p.text?.message) { tipo = "texto"; conteudo = p.text.message; }
    else if (p.image) { tipo = "imagem"; conteudo = p.image.caption ?? null; midia_url = p.image.imageUrl ?? null; midia_mime = p.image.mimeType ?? null; }
    else if (p.audio) { tipo = "audio"; midia_url = p.audio.audioUrl ?? null; midia_mime = p.audio.mimeType ?? null; }
    else if (p.video) { tipo = "video"; conteudo = p.video.caption ?? null; midia_url = p.video.videoUrl ?? null; midia_mime = p.video.mimeType ?? null; }
    else if (p.document) { tipo = "documento"; conteudo = p.document.fileName ?? null; midia_url = p.document.documentUrl ?? null; midia_mime = p.document.mimeType ?? null; }
    else if (p.location) { tipo = "localizacao"; conteudo = `${p.location.latitude},${p.location.longitude}`; }
    else if (p.contact) { tipo = "contato"; conteudo = p.contact.displayName ?? null; }
    else { tipo = "outro"; conteudo = typeof p.body === "string" ? p.body : null; }

    // Baixa mídia para o bucket (URLs originais expiram). Se falhar, mantém URL original — não perdemos a referência.
    if (midia_url && tipo !== "texto" && tipo !== "localizacao" && tipo !== "contato" && tipo !== "outro") {
      try {
        const resp = await fetch(midia_url);
        if (resp.ok) {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          const ct = resp.headers.get("content-type") || midia_mime || "application/octet-stream";
          const ext = guessExt(ct) || guessExtFromUrl(midia_url) || "bin";
          const path = `${tipo}/${phoneDigits}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
          const { error: upErr } = await admin.storage
            .from("whatsapp-media")
            .upload(path, bytes, { contentType: ct, upsert: false });
          if (!upErr) {
            const { data: pub } = admin.storage.from("whatsapp-media").getPublicUrl(path);
            midia_url = pub.publicUrl;
            midia_mime = ct;
          } else {
            console.warn("upload media falhou, mantendo url original:", upErr.message);
          }
        }
      } catch (e) {
        console.warn("download/upload media falhou:", e);
      }
    }

    // Upsert da conversa
    const { data: existing } = await admin
      .from("whatsapp_conversas")
      .select("id")
      .eq("telefone_digits", phoneDigits)
      .maybeSingle();

    let conversaId = existing?.id as string | undefined;
    if (!conversaId) {
      const { data: created, error: cErr } = await admin
        .from("whatsapp_conversas")
        .insert({
          telefone: phoneRaw || phoneDigits,
          telefone_digits: phoneDigits,
          contato_nome: senderName,
          status: "Pendente",
          instancia,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      conversaId = created.id;
    } else if (senderName) {
      await admin.from("whatsapp_conversas")
        .update({ contato_nome: senderName, instancia: instancia ?? undefined })
        .eq("id", conversaId)
        .is("contato_nome", null);
    }

    // Insere mensagem (direção depende de fromMe)
    const direcao = fromMe ? "saida" : "entrada";
    const status = fromMe ? "Enviado" : "Recebido";

    const { data: msgRow, error: insErr } = await admin
      .from("whatsapp_mensagens")
      .insert({
        conversa_id: conversaId,
        direcao,
        tipo,
        conteudo,
        midia_url,
        midia_mime,
        provedor_message_id: messageId,
        status,
        enviado_em: new Date().toISOString(),
        metadata: payload,
      })
      .select("id")
      .single();

    if (insErr) {
      // Se foi violação de unicidade (corrida), tratamos como duplicata
      if (String(insErr.message).includes("uq_whatsapp_mensagens_provedor_msgid")) {
        await markRawProcessed(admin, rawId, conversaId ?? null, null, "duplicate-race");
        return ok({ ignored: "duplicate-race", rawId });
      }
      throw insErr;
    }

    // ============================================================
    // OPT-OUT automático para disparos em massa
    // ============================================================
    if (!fromMe && conteudo) {
      const t = String(conteudo).trim().toLowerCase();
      if (/^(sair|parar|descadastrar|cancelar|stop|unsubscribe|remover)\b/.test(t)) {
        try {
          await admin.from("disparo_optout").upsert(
            { telefone_digits: phoneDigits, motivo: t.slice(0, 200), origem: "whatsapp" },
            { onConflict: "telefone_digits" },
          );
          console.log("opt-out registrado:", phoneDigits);
        } catch (oe) {
          console.warn("falha registrando opt-out:", oe);
        }
      }
    }

    // ============================================================
    // CHATBOT / MENU URA — executa antes do auto-roteamento
    // ============================================================
    let botEmAndamento = false;
    if (!fromMe) {
      try {
        const result = await runChatbot(admin, conversaId!, phoneDigits, conteudo, senderName);
        botEmAndamento = result.emAndamento;
      } catch (botErr) {
        console.warn("chatbot falhou:", botErr);
      }
    }

    // Auto-roteamento por palavra-chave (apenas para mensagens recebidas, em conversas pendentes sem departamento)
    if (!fromMe && conteudo && !botEmAndamento) {
      try {
        const { data: convAtual } = await admin
          .from("whatsapp_conversas")
          .select("id, status, departamento_id, atendente_id")
          .eq("id", conversaId!)
          .single();

        const elegivel = convAtual
          && !convAtual.departamento_id
          && !convAtual.atendente_id
          && (convAtual.status === "Pendente" || convAtual.status === null);

        if (elegivel) {
          const { data: regras } = await admin
            .from("whatsapp_roteamento_regras")
            .select("id, nome, palavras_chave, departamento_id, prioridade")
            .eq("ativo", true)
            .order("prioridade", { ascending: false });

          const texto = String(conteudo).toLowerCase();
          const match = (regras ?? []).find((r: any) =>
            (r.palavras_chave ?? []).some((kw: string) => kw && texto.includes(String(kw).toLowerCase()))
          );

          if (match) {
            await admin
              .from("whatsapp_conversas")
              .update({ departamento_id: match.departamento_id })
              .eq("id", conversaId!);

            await admin.from("whatsapp_conversa_notas").insert({
              conversa_id: conversaId!,
              autor_id: null,
              conteudo: `🤖 Auto-roteamento: regra "${match.nome}" → departamento atribuído.`,
            });
          }
        }
      } catch (routeErr) {
        console.warn("auto-roteamento falhou:", routeErr);
      }
    }

    await markRawProcessed(admin, rawId, conversaId ?? null, msgRow.id, null);

    // Boas-vindas e fora de expediente (apenas mensagens recebidas)
    if (!fromMe && !botEmAndamento) {
      try {
        const { data: cfg } = await admin
          .from("whatsapp_config")
          .select("*")
          .eq("chave", "principal")
          .maybeSingle();

        if (cfg) {
          const nomeContato = senderName || "";
          const primeiroNome = nomeContato.split(" ")[0] || "";
          const render = (tpl: string) =>
            String(tpl || "")
              .replaceAll("{nome}", nomeContato)
              .replaceAll("{primeiro_nome}", primeiroNome);

          // Conta quantas mensagens de entrada já existem nessa conversa
          const { count: entradas } = await admin
            .from("whatsapp_mensagens")
            .select("id", { count: "exact", head: true })
            .eq("conversa_id", conversaId!)
            .eq("direcao", "entrada");

          const isPrimeira = (entradas ?? 0) <= 1;

          // 1) Boas-vindas — só na 1ª mensagem do contato
          if (cfg.boas_vindas_ativo && isPrimeira && cfg.boas_vindas_mensagem) {
            await enviarAuto(admin, conversaId!, phoneDigits, render(cfg.boas_vindas_mensagem), "boas-vindas");
          }

          // 2) Fora de expediente — sempre que estiver fora, mas no máximo 1x a cada 6h
          if (cfg.fora_expediente_ativo && cfg.fora_expediente_mensagem) {
            const agora = new Date();
            const dia = agora.getUTCDay();
            // Considera horário local Brasil (UTC-3)
            const local = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
            const diaLocal = local.getUTCDay();
            const hhmm = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
            const dias: number[] = cfg.expediente_dias_semana ?? [];
            const inicio: string = cfg.expediente_inicio ?? "08:00";
            const fim: string = cfg.expediente_fim ?? "18:00";
            const dentroDia = dias.includes(diaLocal);
            const dentroHora = hhmm >= inicio && hhmm <= fim;
            const foraExpediente = !(dentroDia && dentroHora);

            if (foraExpediente) {
              // anti-spam: só envia se a última auto fora-expediente foi há mais de 6h
              const seisHorasAtras = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
              const { data: jaEnviou } = await admin
                .from("whatsapp_mensagens")
                .select("id")
                .eq("conversa_id", conversaId!)
                .eq("direcao", "saida")
                .contains("metadata", { auto: "fora-expediente" })
                .gte("enviado_em", seisHorasAtras)
                .limit(1);

              if (!jaEnviou || jaEnviou.length === 0) {
                await enviarAuto(admin, conversaId!, phoneDigits, render(cfg.fora_expediente_mensagem), "fora-expediente");
              }
            }
          }
        }
      } catch (autoErr) {
        console.warn("auto-mensagem falhou:", autoErr);
      }
    }

    return ok({ rawId, conversaId, mensagemId: msgRow.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("processamento falhou (raw já salvo):", msg);
    await admin.from("whatsapp_webhook_raw")
      .update({ erro: msg, processado_em: new Date().toISOString() })
      .eq("id", rawId!);
    // Retorna 200 para Z-API não ficar reenviando indefinidamente — mas raw fica disponível para reprocessar
    return ok({ rawId, error: msg });
  }
});

async function markRawProcessed(
  admin: any, rawId: string | null,
  conversaId: string | null, mensagemId: string | null,
  motivo: string | null,
) {
  if (!rawId) return;
  await admin.from("whatsapp_webhook_raw")
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
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function guessExt(ct: string): string | null {
  const m: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/wav": "wav", "audio/webm": "webm",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return m[ct.toLowerCase().split(";")[0].trim()] ?? null;
}

function guessExtFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    return m?.[1]?.toLowerCase() ?? null;
  } catch { return null; }
}

async function enviarAuto(
  admin: any,
  conversaId: string,
  phoneDigits: string,
  mensagem: string,
  tag: "boas-vindas" | "fora-expediente",
) {
  const INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
  const INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN");
  const CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
  if (!INSTANCE_ID || !INSTANCE_TOKEN || !CLIENT_TOKEN) {
    console.warn(`enviarAuto[${tag}]: credenciais Z-API ausentes`);
    return;
  }

  const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/send-text`;
  let providerId: string | null = null;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Token": CLIENT_TOKEN },
      body: JSON.stringify({ phone: phoneDigits, message: mensagem }),
    });
    const json = await resp.json().catch(() => ({}));
    providerId = json?.messageId || json?.id || null;
    if (!resp.ok) console.warn(`enviarAuto[${tag}] resposta Z-API:`, resp.status, json);
  } catch (e) {
    console.warn(`enviarAuto[${tag}] fetch falhou:`, e);
  }

  // Salva no histórico, mesmo que o envio tenha falhado (auditoria)
  await admin.from("whatsapp_mensagens").insert({
    conversa_id: conversaId,
    direcao: "saida",
    tipo: "texto",
    conteudo: mensagem,
    provedor_message_id: providerId,
    status: providerId ? "Enviado" : "Falhou",
    enviado_em: new Date().toISOString(),
    metadata: { auto: tag },
  });
}

// ================================================================
// CHATBOT — executa o fluxo URA para a conversa.
// Retorna { emAndamento: true } quando há sessão ativa do bot
// (impede auto-roteamento, boas-vindas e fora-expediente).
// ================================================================
async function runChatbot(
  admin: any,
  conversaId: string,
  phoneDigits: string,
  textoEntrada: string | null,
  nomeContato: string | null,
): Promise<{ emAndamento: boolean }> {
  // 1) Verifica se há conversa em estado pendente (sem atendente humano)
  const { data: conv } = await admin
    .from("whatsapp_conversas")
    .select("id, status, atendente_id, departamento_id")
    .eq("id", conversaId)
    .single();
  // Se já tem atendente humano, o bot não interfere
  if (conv?.atendente_id) return { emAndamento: false };

  // 2) Busca configuração: chatbot ativo + fluxo padrão
  const { data: cfg } = await admin
    .from("whatsapp_config")
    .select("chatbot_ativo, chatbot_fluxo_id")
    .eq("chave", "principal")
    .maybeSingle();
  if (!cfg?.chatbot_ativo) return { emAndamento: false };

  // 3) Busca sessão existente
  const { data: sessao } = await admin
    .from("chatbot_sessoes")
    .select("*")
    .eq("conversa_id", conversaId)
    .maybeSingle();

  let fluxoId: string | null = sessao?.fluxo_id ?? cfg.chatbot_fluxo_id ?? null;
  if (!fluxoId) return { emAndamento: false };

  const { data: fluxo } = await admin
    .from("chatbot_fluxos")
    .select("*")
    .eq("id", fluxoId)
    .maybeSingle();
  if (!fluxo || !fluxo.ativo || !fluxo.no_inicial_id) return { emAndamento: false };

  const renderVars = (tpl: string | null) => {
    if (!tpl) return "";
    const primeiro = (nomeContato ?? "").split(" ")[0] ?? "";
    return tpl.replaceAll("{nome}", nomeContato ?? "").replaceAll("{primeiro_nome}", primeiro);
  };

  const enviarBot = async (msg: string) => {
    if (!msg) return;
    await enviarMsgBot(admin, conversaId, phoneDigits, renderVars(msg));
  };

  const carregarNo = async (id: string) => {
    const { data } = await admin.from("chatbot_nos").select("*").eq("id", id).maybeSingle();
    return data;
  };

  // 4) Se não há sessão: cria, envia o nó inicial e termina (aguarda próxima entrada)
  if (!sessao) {
    const inicial = await carregarNo(fluxo.no_inicial_id);
    if (!inicial) return { emAndamento: false };
    const { data: nova } = await admin.from("chatbot_sessoes").insert({
      conversa_id: conversaId, fluxo_id: fluxo.id,
      no_atual_id: inicial.id, variaveis: {}, status: "ativo",
      ultima_interacao: new Date().toISOString(),
    }).select("*").single();
    await processarNo(admin, nova, inicial, fluxo, enviarBot, carregarNo, conversaId);
    return { emAndamento: true };
  }

  // 5) Sessão existente — só reage se ainda estiver ativa
  if (sessao.status !== "ativo") return { emAndamento: false };

  // Timeout
  const timeoutMs = (fluxo.timeout_minutos ?? 30) * 60 * 1000;
  const ultima = new Date(sessao.ultima_interacao).getTime();
  if (Date.now() - ultima > timeoutMs) {
    await enviarBot(fluxo.mensagem_timeout);
    await admin.from("chatbot_sessoes").update({
      status: "expirado", finalizado_em: new Date().toISOString(),
    }).eq("id", sessao.id);
    return { emAndamento: false };
  }

  const noAtual = sessao.no_atual_id ? await carregarNo(sessao.no_atual_id) : null;
  if (!noAtual) {
    await admin.from("chatbot_sessoes").update({
      status: "finalizado", finalizado_em: new Date().toISOString(),
    }).eq("id", sessao.id);
    return { emAndamento: false };
  }

  const entrada = String(textoEntrada ?? "").trim();

  // Trata a entrada conforme o tipo do nó atual
  if (noAtual.tipo === "menu") {
    const opcoes: any[] = noAtual.opcoes ?? [];
    const escolhida = opcoes.find((o) => String(o.tecla).trim() === entrada);
    if (!escolhida) {
      await enviarBot(fluxo.mensagem_invalida);
      await enviarBot(noAtual.mensagem ?? "");
      await admin.from("chatbot_sessoes").update({
        ultima_interacao: new Date().toISOString(),
      }).eq("id", sessao.id);
      return { emAndamento: true };
    }
    // Se opção tem departamento → encaminha para humano
    if (escolhida.departamento_id) {
      await admin.from("whatsapp_conversas").update({
        departamento_id: escolhida.departamento_id,
      }).eq("id", conversaId);
      await admin.from("whatsapp_conversa_notas").insert({
        conversa_id: conversaId, autor_id: null,
        conteudo: `🤖 Chatbot: opção "${escolhida.label}" → encaminhado.`,
      });
      await admin.from("chatbot_sessoes").update({
        status: "transferido", finalizado_em: new Date().toISOString(),
        variaveis: { ...(sessao.variaveis ?? {}), opcao_escolhida: escolhida.label },
      }).eq("id", sessao.id);
      return { emAndamento: true };
    }
    // Caso contrário, vai para o próximo nó
    if (escolhida.proximo_no_id) {
      const prox = await carregarNo(escolhida.proximo_no_id);
      if (prox) {
        await admin.from("chatbot_sessoes").update({
          no_atual_id: prox.id, ultima_interacao: new Date().toISOString(),
        }).eq("id", sessao.id);
        await processarNo(admin, sessao, prox, fluxo, enviarBot, carregarNo, conversaId);
        return { emAndamento: true };
      }
    }
    // Sem destino → encerra
    await admin.from("chatbot_sessoes").update({
      status: "finalizado", finalizado_em: new Date().toISOString(),
    }).eq("id", sessao.id);
    return { emAndamento: true };
  }

  if (noAtual.tipo === "coleta") {
    const variaveis = { ...(sessao.variaveis ?? {}) };
    if (noAtual.variavel) variaveis[noAtual.variavel] = entrada;
    if (noAtual.proximo_no_id) {
      const prox = await carregarNo(noAtual.proximo_no_id);
      if (prox) {
        await admin.from("chatbot_sessoes").update({
          no_atual_id: prox.id, variaveis,
          ultima_interacao: new Date().toISOString(),
        }).eq("id", sessao.id);
        await processarNo(admin, { ...sessao, variaveis }, prox, fluxo, enviarBot, carregarNo, conversaId);
        return { emAndamento: true };
      }
    }
    await admin.from("chatbot_sessoes").update({
      variaveis, status: "finalizado", finalizado_em: new Date().toISOString(),
    }).eq("id", sessao.id);
    return { emAndamento: true };
  }

  // Tipos terminais já não deveriam estar como no_atual aguardando input
  return { emAndamento: false };
}

// Processa um nó "ativo" (envia mensagens automáticas e avança quando aplicável).
async function processarNo(
  admin: any, sessao: any, no: any, fluxo: any,
  enviarBot: (m: string) => Promise<void>,
  carregarNo: (id: string) => Promise<any>,
  conversaId: string,
) {
  if (no.tipo === "mensagem") {
    await enviarBot(no.mensagem ?? "");
    if (no.proximo_no_id) {
      const prox = await carregarNo(no.proximo_no_id);
      if (prox) {
        await admin.from("chatbot_sessoes").update({
          no_atual_id: prox.id, ultima_interacao: new Date().toISOString(),
        }).eq("id", sessao.id);
        return processarNo(admin, sessao, prox, fluxo, enviarBot, carregarNo, conversaId);
      }
    }
    await admin.from("chatbot_sessoes").update({
      status: "finalizado", finalizado_em: new Date().toISOString(),
    }).eq("id", sessao.id);
    return;
  }

  if (no.tipo === "menu" || no.tipo === "coleta") {
    await enviarBot(no.mensagem ?? "");
    await admin.from("chatbot_sessoes").update({
      no_atual_id: no.id, ultima_interacao: new Date().toISOString(),
    }).eq("id", sessao.id);
    return;
  }

  if (no.tipo === "encaminhar") {
    if (no.mensagem) await enviarBot(no.mensagem);
    if (no.departamento_id) {
      await admin.from("whatsapp_conversas").update({
        departamento_id: no.departamento_id,
      }).eq("id", conversaId);
    }
    await admin.from("whatsapp_conversa_notas").insert({
      conversa_id: conversaId, autor_id: null,
      conteudo: `🤖 Chatbot: encaminhado pelo nó "${no.nome}".`,
    });
    await admin.from("chatbot_sessoes").update({
      status: "transferido", finalizado_em: new Date().toISOString(),
    }).eq("id", sessao.id);
    return;
  }

  if (no.tipo === "encerrar") {
    if (no.mensagem) await enviarBot(no.mensagem);
    await admin.from("chatbot_sessoes").update({
      status: "finalizado", finalizado_em: new Date().toISOString(),
    }).eq("id", sessao.id);
    return;
  }
}

async function enviarMsgBot(admin: any, conversaId: string, phoneDigits: string, mensagem: string) {
  const INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
  const INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN");
  const CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
  let providerId: string | null = null;
  if (INSTANCE_ID && INSTANCE_TOKEN && CLIENT_TOKEN) {
    try {
      const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/send-text`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": CLIENT_TOKEN },
        body: JSON.stringify({ phone: phoneDigits, message: mensagem }),
      });
      const json = await resp.json().catch(() => ({}));
      providerId = json?.messageId || json?.id || null;
    } catch (e) {
      console.warn("envio bot falhou:", e);
    }
  }
  await admin.from("whatsapp_mensagens").insert({
    conversa_id: conversaId, direcao: "saida", tipo: "texto",
    conteudo: mensagem, provedor_message_id: providerId,
    status: providerId ? "Enviado" : "Falhou",
    enviado_em: new Date().toISOString(),
    metadata: { auto: "chatbot" },
  });
}
