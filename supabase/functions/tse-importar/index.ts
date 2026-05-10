import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { montarMensagemUfAusente } from "./uf-matcher.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TSE_CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele";

function normalizeOptionalText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function buildImportDedupeKey(input: {
  ano_eleicao: number;
  turno: number;
  uf: string;
  cargo: string | null;
  numero_candidato: string | null;
  partido: string | null;
  codigo_municipio: string | null;
}) {
  return [
    input.ano_eleicao,
    input.turno,
    input.uf,
    input.cargo ?? "",
    input.numero_candidato ?? "",
    input.partido ?? "",
    input.codigo_municipio ?? "",
  ].join("|");
}

function buildRawDedupeKey(input: {
  ano_eleicao: number;
  turno: number;
  uf: string;
  cargo: string | null;
  arquivo: string;
  url: string;
}) {
  return [
    input.ano_eleicao,
    input.turno,
    input.uf,
    input.cargo ?? "",
    input.arquivo,
    input.url,
  ].join("|");
}

function urlVotacaoSecao(ano: number) {
  // O TSE publica um único ZIP nacional por ano (contém um CSV por UF).
  return `${TSE_CDN}/votacao_secao/votacao_secao_${ano}.zip`;
}

function urlVotacaoMunZona(ano: number) {
  return `${TSE_CDN}/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`;
}

// Parser CSV simples (separador ;) já que é o formato do TSE
function parseCsvLine(line: string, sep = ";"): string[] {
  const out: string[] = [];
  let cur = "";
  let inside = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inside = !inside; continue; }
    if (c === sep && !inside) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function executarImportacaoTSE(params: {
  supabase: ReturnType<typeof createClient>;
  logId: string;
  ano: number;
  turno: number;
  uf: string;
  cargoFiltro: string | null;
  candidatoFiltro: string | null;
  partidoFiltro: string | null;
  codigoMunicipio: string | null;
  url: string;
  resumeFrom?: number;
  detalhesImportacao: {
    cargo: string | null;
    numero_candidato: string | null;
    partido: string | null;
    codigo_municipio: string | null;
  };
}) {
  const {
    supabase,
    logId,
    ano,
    turno,
    uf,
    cargoFiltro,
    candidatoFiltro,
    partidoFiltro,
    codigoMunicipio,
    url,
    resumeFrom = 0,
    detalhesImportacao,
  } = params;

  try {
    // Retry com backoff exponencial para 403/429/5xx (TSE costuma rate-limitar).
    const fetchHeaders = {
      "User-Agent": "Mozilla/5.0 (compatible; Lovable TSE Import/1.0)",
      "Accept": "application/zip,application/octet-stream;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    };
    const MAX_TENTATIVAS = 5;
    const RETRY_STATUSES = new Set([403, 408, 425, 429, 500, 502, 503, 504]);
    let resp: Response | null = null;
    let tentativasFeitas = 0;
    let ultimoErro = "";
    const tentativasLog: string[] = [];
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      tentativasFeitas = tentativa;
      try {
        const r = await fetch(url, { headers: fetchHeaders });
        if (r.ok) { resp = r; break; }
        try { await r.arrayBuffer(); } catch { /* ignore */ }
        ultimoErro = `HTTP ${r.status}`;
        tentativasLog.push(`tentativa ${tentativa}: HTTP ${r.status}`);
        if (!RETRY_STATUSES.has(r.status) || tentativa === MAX_TENTATIVAS) {
          await supabase.from("tse_importacao_logs").update({
            status: "erro",
            erros: `Falha ao baixar ${url} após ${tentativa} tentativa(s): ${tentativasLog.join("; ")}`,
            finished_at: new Date().toISOString(),
          }).eq("id", logId);
          return;
        }
      } catch (e: any) {
        ultimoErro = e?.message ?? String(e);
        tentativasLog.push(`tentativa ${tentativa}: ${ultimoErro}`);
        if (tentativa === MAX_TENTATIVAS) {
          await supabase.from("tse_importacao_logs").update({
            status: "erro",
            erros: `Erro de rede ao baixar ${url}: ${tentativasLog.join("; ")}`,
            finished_at: new Date().toISOString(),
          }).eq("id", logId);
          return;
        }
      }
      const delay = Math.min(30000, 2000 * Math.pow(2, tentativa - 1)) + Math.floor(Math.random() * 1000);
      await supabase.from("tse_importacao_logs").update({
        erros: `Aguardando ${Math.round(delay/1000)}s para retry (${tentativasLog.join("; ")})`,
      }).eq("id", logId);
      await new Promise((r) => setTimeout(r, delay));
    }
    if (!resp) return;
    if (tentativasLog.length > 0) {
      await supabase.from("tse_importacao_logs").update({
        erros: `Download OK após ${tentativasFeitas} tentativa(s): ${tentativasLog.join("; ")}`,
      }).eq("id", logId);
    }

    let usedFile = "";
    const zipFiles: string[] = [];
    let ufMatched = false;
    let totalBytes = 0;
    let textoBrutoAmostra = "";
    const AMOSTRA_MAX = 32_000;
    const ufRe = new RegExp(`_${uf}\\.csv$`, "i");

    let header: string[] | null = null;
    let I: Record<string, number> | null = null;
    let buffer = new Uint8Array(0);
    const amostraChunks: Uint8Array[] = [];
    let amostraSize = 0;
    let totalRows = 0;
    let importados = 0;
    let erros = 0;
    let filteredSeen = 0; // linhas que passam nos filtros (contando as puladas pelo checkpoint)
    let checkpointLinhas = resumeFrom; // linhas já confirmadas em execuções anteriores
    let pendingBatch: any[] = [];
    const BATCH_SIZE = 100;
    const MAX_QUEUED_BATCHES = 1;
    let lotesConcluidos = 0;
    let lotesComErro = 0;
    let lastProgressAt = 0;
    let cancelado = false;
    let lastCancelCheckAt = 0;
    let arquivoAlvoFinalizado = false;
    let batchQueue: any[][] = [];
    let activeFlush: Promise<void> | null = null;

    const checkCancelado = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastCancelCheckAt < 1500) return cancelado;
      lastCancelCheckAt = now;
      const { data } = await supabase.from("tse_importacao_logs")
        .select("cancel_requested").eq("id", logId).maybeSingle();
      if (data?.cancel_requested) cancelado = true;
      return cancelado;
    };

    const writeProgress = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastProgressAt < 1000) return;
      lastProgressAt = now;
      await supabase.from("tse_importacao_logs").update({
        status: "processando",
        total_registros: filteredSeen,
        registros_novos: resumeFrom + importados,
        registros_atualizados: lotesConcluidos,
        checkpoint_linhas: checkpointLinhas,
        erros: lotesComErro ? `${lotesComErro} lote(s) com erro até agora` : null,
        detalhes: {
          ...detalhesImportacao,
          progresso: {
            linhas_processadas: filteredSeen,
            retomada_a_partir_de: resumeFrom,
            lotes_concluidos: lotesConcluidos,
            lotes_com_erro: lotesComErro,
            bytes_baixados: totalBytes,
            arquivo: usedFile || null,
            atualizado_em: new Date().toISOString(),
          },
        },
      }).eq("id", logId);
    };

    const drainBatchQueue = async () => {
      try {
        while (batchQueue.length > 0) {
          if (await checkCancelado()) {
            batchQueue = [];
            return;
          }

          const chunk = batchQueue.shift();
          if (!chunk || chunk.length === 0) continue;

          const { error } = await supabase.from("resultados_eleitorais_tse")
            .upsert(chunk, {
              onConflict: "ano_eleicao,turno,uf,codigo_municipio,codigo_cargo,numero_candidato,zona_eleitoral,secao_eleitoral",
              ignoreDuplicates: false,
            });

          if (error) { erros++; lotesComErro++; }
          else {
            importados += chunk.length;
            checkpointLinhas += chunk.length;
            lotesConcluidos++;
          }

          await writeProgress();
        }
      } finally {
        activeFlush = null;
        if (batchQueue.length > 0) {
          activeFlush = drainBatchQueue();
        }
      }
    };

    const enqueueBatch = () => {
      if (pendingBatch.length === 0) return;
      batchQueue.push(pendingBatch);
      pendingBatch = [];
      if (!activeFlush) {
        activeFlush = drainBatchQueue();
      }
    };

    const processLine = (line: string) => {
      if (!line || !line.trim()) return;
      if (!header) {
        header = parseCsvLine(line).map((h) => h.replace(/"/g, "").toUpperCase());
        const idx = (n: string) => header!.indexOf(n);
        I = {
          ANO: idx("ANO_ELEICAO"),
          TURNO: idx("NR_TURNO"),
          UF: idx("SG_UF"),
          COD_MUN: idx("CD_MUNICIPIO"),
          MUN: idx("NM_MUNICIPIO"),
          ZONA: idx("NR_ZONA"),
          COD_CARGO: idx("CD_CARGO"),
          CARGO: idx("DS_CARGO"),
          NUM_CAND: idx("NR_CANDIDATO"),
          NOME_CAND: idx("NM_URNA_CANDIDATO") >= 0 ? idx("NM_URNA_CANDIDATO") : idx("NM_CANDIDATO"),
          PARTIDO: idx("SG_PARTIDO"),
          VOTOS: idx("QT_VOTOS_NOMINAIS") >= 0 ? idx("QT_VOTOS_NOMINAIS") : idx("QT_VOTOS"),
        };
        return;
      }
      try {
        const c = parseCsvLine(line);
        const i = I!;
        if (turno && Number(c[i.TURNO]) !== turno) return;
        if (cargoFiltro && c[i.CARGO] !== cargoFiltro && c[i.COD_CARGO] !== cargoFiltro) return;
        if (candidatoFiltro && c[i.NUM_CAND] !== candidatoFiltro) return;
        if (partidoFiltro && c[i.PARTIDO] !== partidoFiltro) return;
        if (codigoMunicipio && c[i.COD_MUN] !== codigoMunicipio) return;

        filteredSeen++;
        // Retomada: pula linhas já confirmadas em execução anterior
        if (filteredSeen <= resumeFrom) return;
        totalRows++;
        pendingBatch.push({
          ano_eleicao: Number(c[i.ANO]) || ano,
          turno: Number(c[i.TURNO]) || turno,
          uf: c[i.UF] || uf,
          codigo_municipio: c[i.COD_MUN] || null,
          municipio: c[i.MUN] || null,
          codigo_cargo: c[i.COD_CARGO] || null,
          cargo: c[i.CARGO] || null,
          numero_candidato: c[i.NUM_CAND] || null,
          candidato: c[i.NOME_CAND] || null,
          partido: c[i.PARTIDO] || null,
          zona_eleitoral: c[i.ZONA] || null,
          secao_eleitoral: null,
          votos: Number(c[i.VOTOS]) || 0,
          fonte_arquivo: usedFile,
          status_importacao: "importado",
        });
      } catch { erros++; }
    };

    const appendBuffer = (base: Uint8Array, chunk: Uint8Array) => {
      if (base.length === 0) return chunk.slice();
      const merged = new Uint8Array(base.length + chunk.length);
      merged.set(base, 0);
      merged.set(chunk, base.length);
      return merged;
    };

    const salvarAmostra = (chunk: Uint8Array) => {
      if (amostraSize >= AMOSTRA_MAX || chunk.length === 0) return;
      const restante = AMOSTRA_MAX - amostraSize;
      const parte = chunk.length > restante ? chunk.slice(0, restante) : chunk.slice();
      amostraChunks.push(parte);
      amostraSize += parte.length;
    };

    const processarLinhasDoBuffer = () => {
      let nl = buffer.indexOf(10);
      while (nl !== -1) {
        let lineBytes = buffer.subarray(0, nl);
        if (lineBytes.length > 0 && lineBytes[lineBytes.length - 1] === 13) {
          lineBytes = lineBytes.subarray(0, lineBytes.length - 1);
        }
        const line = decoder.decode(lineBytes).substring(0);
        buffer = buffer.slice(nl + 1);
        processLine(line);
        if (pendingBatch.length >= BATCH_SIZE) {
          enqueueBatch();
        }
        nl = buffer.indexOf(10);
      }
    };

    try {
      const { Unzip, UnzipInflate } = await import("https://esm.sh/fflate@0.8.2");
      const decoder = new TextDecoder("latin1");

      await new Promise<void>((resolve, reject) => {
        const unzipper = new Unzip((file) => {
          zipFiles.push(file.name);
          const isAlvo = ufRe.test(file.name) &&
            (/munzona/i.test(file.name) || /\.csv$/i.test(file.name));
          if (isAlvo && !ufMatched) {
            ufMatched = true;
            usedFile = file.name;
            file.ondata = (err, data, final) => {
              if (err) return reject(err);
              if (data && data.length) {
                salvarAmostra(data);
                buffer = appendBuffer(buffer, data);
                processarLinhasDoBuffer();
              }
              if (final) {
                if (buffer.length) {
                  let lineBytes = buffer;
                  if (lineBytes.length > 0 && lineBytes[lineBytes.length - 1] === 13) {
                    lineBytes = lineBytes.subarray(0, lineBytes.length - 1);
                  }
                  processLine(decoder.decode(lineBytes).substring(0));
                  buffer = new Uint8Array(0);
                }
                arquivoAlvoFinalizado = true;
              }
            };
            file.start();
          }
        });
        unzipper.register(UnzipInflate);

        const reader = resp.body!.getReader();
        (async () => {
          try {
            while (true) {
              if (await checkCancelado()) {
                try { await reader.cancel("cancelado pelo usuário"); } catch { /* ignore */ }
                pendingBatch = [];
                batchQueue = [];
                if (activeFlush) await activeFlush;
                resolve();
                return;
              }
              const { value, done } = await reader.read();
              if (done) {
                unzipper.push(new Uint8Array(0), true);
                enqueueBatch();
                if (activeFlush) await activeFlush;
                resolve();
                return;
              }
              if (value) {
                totalBytes += value.length;
                unzipper.push(value, false);
                while (batchQueue.length >= MAX_QUEUED_BATCHES && activeFlush) {
                  await activeFlush;
                }
                if (arquivoAlvoFinalizado) {
                  try { await reader.cancel("arquivo alvo processado"); } catch { /* ignore */ }
                  enqueueBatch();
                  if (activeFlush) await activeFlush;
                  resolve();
                  return;
                }
              }
            }
          } catch (e) {
            reject(e);
          }
        })();
      });
      enqueueBatch();
      if (activeFlush) await activeFlush;
      if (amostraChunks.length > 0) {
        const amostraBytes = appendBuffer(new Uint8Array(0), amostraChunks[0]);
        let combinado = amostraBytes;
        for (let i = 1; i < amostraChunks.length; i++) {
          combinado = appendBuffer(combinado, amostraChunks[i]);
        }
        textoBrutoAmostra = decoder.decode(combinado).substring(0);
      }
    } catch (zipErr) {
      await supabase.from("tse_importacao_logs").update({
        status: "erro",
        erros: `Falha ao processar ZIP: ${(zipErr as Error).message}`,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
      return;
    }

    let ufsDisponiveis: string[] = [];
    if (!ufMatched) {
      ufsDisponiveis = Array.from(
        new Set(
          zipFiles
            .map((n) => n.match(/_([A-Z]{2})\.csv$/i)?.[1]?.toUpperCase())
            .filter(Boolean) as string[],
        ),
      ).sort();
      const msg = montarMensagemUfAusente(ano, uf, ufsDisponiveis, zipFiles);
      await supabase.from("tse_importacao_logs").update({
        status: "erro", erros: msg, finished_at: new Date().toISOString(),
      }).eq("id", logId);
      return;
    }

    if (!header) {
      await supabase.from("tse_importacao_logs").update({
        status: "erro", erros: "CSV vazio ou ilegível", finished_at: new Date().toISOString(),
      }).eq("id", logId);
      return;
    }

    await supabase.from("tse_arquivos_brutos").upsert({
      log_id: logId,
      ano_eleicao: ano,
      turno,
      uf,
      cargo: cargoFiltro,
      arquivo: usedFile,
      url,
      conteudo_texto: textoBrutoAmostra,
      size_bytes: totalBytes,
      dedupe_key: buildRawDedupeKey({ ano_eleicao: ano, turno, uf, cargo: cargoFiltro, arquivo: usedFile, url }),
    }, { onConflict: "dedupe_key", ignoreDuplicates: false });

    await supabase.from("tse_importacao_logs").update({
      status: cancelado
        ? "cancelado"
        : erros > 0 ? "concluído com erros" : "concluído",
      total_registros: filteredSeen,
      registros_novos: resumeFrom + importados,
      registros_atualizados: lotesConcluidos,
      checkpoint_linhas: checkpointLinhas,
      erros: cancelado
        ? `Cancelado pelo usuário após ${lotesConcluidos} lote(s) (${importados} registros).`
        : (erros ? `${erros} lotes/linhas com erro` : null),
      detalhes: {
        ...detalhesImportacao,
        progresso: {
          linhas_processadas: filteredSeen,
          retomada_a_partir_de: resumeFrom,
          lotes_concluidos: lotesConcluidos,
          lotes_com_erro: lotesComErro,
          bytes_baixados: totalBytes,
          arquivo: usedFile || null,
          cancelado,
          atualizado_em: new Date().toISOString(),
        },
      },
      finished_at: new Date().toISOString(),
    }).eq("id", logId);
  } catch (e) {
    await supabase.from("tse_importacao_logs").update({
      status: "erro",
      erros: (e as Error).message,
      finished_at: new Date().toISOString(),
    }).eq("id", logId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    // user (a partir do JWT)
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Verifica permissão (super admin OU admin com configuracoes.manage)
    const { data: su } = await supabase.from("settings_users").select("is_super_admin").eq("id", user.id).maybeSingle();
    let allowed = !!su?.is_super_admin;
    if (!allowed) {
      const { data: comp } = await supabase.rpc("user_default_company", { _user_id: user.id });
      const { data: hasPerm } = await supabase.rpc("user_has_permission", {
        _user_id: user.id, _company_id: comp, _permission: "configuracoes.manage",
      });
      allowed = !!hasPerm;
    }
    if (!allowed) return new Response(JSON.stringify({ error: "Acesso restrito" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const body = await req.json().catch(() => ({}));
    const ano = Number(body.ano_eleicao);
    const turno = Number(body.turno ?? 1);
    const uf = String(body.uf ?? "").toUpperCase();
    const cargoFiltro = normalizeOptionalText(body.cargo);
    const candidatoFiltro = normalizeOptionalText(body.numero_candidato);
    const partidoFiltro = normalizeOptionalText(body.partido);
    const codigoMunicipio = normalizeOptionalText(body.codigo_municipio);

    const anoMax = new Date().getFullYear() + 1;
    if (!Number.isInteger(ano) || ano < 1994 || ano > anoMax) {
      return new Response(JSON.stringify({ error: `ano_eleicao inválido (esperado inteiro entre 1994 e ${anoMax})` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[A-Z]{2}$/.test(uf)) {
      return new Response(JSON.stringify({ error: "uf inválida (esperado 2 letras maiúsculas)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (![1, 2].includes(turno)) {
      return new Response(JSON.stringify({ error: "turno inválido (1 ou 2)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dedupeKey = buildImportDedupeKey({
      ano_eleicao: ano,
      turno,
      uf,
      cargo: cargoFiltro,
      numero_candidato: candidatoFiltro,
      partido: partidoFiltro,
      codigo_municipio: codigoMunicipio,
    });
    const detalhesImportacao = {
      cargo: cargoFiltro,
      numero_candidato: candidatoFiltro,
      partido: partidoFiltro,
      codigo_municipio: codigoMunicipio,
    };
    const arquivoZip = `votacao_candidato_munzona_${ano}.zip`;
    const url = urlVotacaoMunZona(ano);

    const { data: existingLog } = await supabase.from("tse_importacao_logs")
      .select("id, status, total_registros, registros_novos, arquivo, finished_at, checkpoint_linhas")
      .eq("dedupe_key", dedupeKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Bloqueio global: impede iniciar uma nova importação enquanto outra estiver em andamento.
    const STALE_MS = 5 * 60 * 1000; // logs sem progresso há > 5min são considerados travados
    const { data: emAndamento } = await supabase.from("tse_importacao_logs")
      .select("id, ano_eleicao, turno, uf, status, created_at, detalhes")
      .in("status", ["iniciado", "processando"])
      .order("created_at", { ascending: false })
      .limit(5);
    const ativos = (emAndamento ?? []).filter((l: any) => {
      if (existingLog && l.id === existingLog.id) return false; // será reaproveitado abaixo
      const atualizadoEm = l?.detalhes?.progresso?.atualizado_em
        ? new Date(l.detalhes.progresso.atualizado_em).getTime()
        : new Date(l.created_at).getTime();
      return Date.now() - atualizadoEm < STALE_MS;
    });
    if (ativos.length > 0) {
      const a = ativos[0];
      return new Response(JSON.stringify({
        error: "Já existe uma importação TSE em andamento. Aguarde finalizar ou cancele a atual antes de iniciar outra.",
        em_andamento: {
          log_id: a.id,
          ano_eleicao: a.ano_eleicao,
          turno: a.turno,
          uf: a.uf,
          status: a.status,
        },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (existingLog?.status === "iniciado") {
      return new Response(JSON.stringify({
        success: true,
        duplicado: true,
        ignorado: true,
        motivo: "importacao_em_andamento",
        log_id: existingLog.id,
        ano_eleicao: ano,
        turno,
        uf,
        total: existingLog.total_registros ?? 0,
        importados: 0,
        arquivo: existingLog.arquivo ?? arquivoZip,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (existingLog && existingLog.status !== "erro") {
      return new Response(JSON.stringify({
        success: true,
        duplicado: true,
        ignorado: true,
        motivo: "importacao_ja_registrada",
        log_id: existingLog.id,
        ano_eleicao: ano,
        turno,
        uf,
        total: existingLog.total_registros ?? 0,
        importados: existingLog.registros_novos ?? 0,
        arquivo: existingLog.arquivo ?? arquivoZip,
        finished_at: existingLog.finished_at ?? null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let logId = existingLog?.id ?? null;
    let resumeFrom = 0;
    if (logId) {
      // Retomada: se houve erro anterior, mantém o checkpoint para continuar do último lote.
      resumeFrom = (existingLog?.status === "erro" && existingLog?.checkpoint_linhas)
        ? Number(existingLog.checkpoint_linhas) || 0
        : 0;
      const { error: resetLogError } = await supabase.from("tse_importacao_logs").update({
        user_id: user.id,
        ano_eleicao: ano,
        turno,
        uf,
        cargo: cargoFiltro,
        arquivo: arquivoZip,
        url,
        status: "iniciado",
        total_registros: resumeFrom,
        registros_novos: resumeFrom,
        registros_atualizados: 0,
        erros: resumeFrom > 0 ? `Retomando a partir da linha ${resumeFrom}` : null,
        detalhes: detalhesImportacao,
        finished_at: null,
        dedupe_key: dedupeKey,
      }).eq("id", logId);
      if (resetLogError) throw resetLogError;
    } else {
      const { data: log, error: logInsertError } = await supabase.from("tse_importacao_logs").insert({
        user_id: user.id,
        ano_eleicao: ano,
        turno,
        uf,
        cargo: cargoFiltro,
        arquivo: arquivoZip,
        url,
        status: "iniciado",
        detalhes: detalhesImportacao,
        dedupe_key: dedupeKey,
      }).select("id").single();

      if (logInsertError) {
        if (String((logInsertError as { code?: string }).code) === "23505") {
          const { data: duplicateLog } = await supabase.from("tse_importacao_logs")
            .select("id, status, total_registros, registros_novos, arquivo, finished_at")
            .eq("dedupe_key", dedupeKey)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return new Response(JSON.stringify({
            success: true,
            duplicado: true,
            ignorado: true,
            motivo: duplicateLog?.status === "iniciado" ? "importacao_em_andamento" : "importacao_ja_registrada",
            log_id: duplicateLog?.id ?? null,
            ano_eleicao: ano,
            turno,
            uf,
            total: duplicateLog?.total_registros ?? 0,
            importados: duplicateLog?.registros_novos ?? 0,
            arquivo: duplicateLog?.arquivo ?? arquivoZip,
            finished_at: duplicateLog?.finished_at ?? null,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        throw logInsertError;
      }

      logId = log?.id ?? null;
    }

    await supabase.from("tse_importacao_logs").update({
      status: "iniciado",
      erros: resumeFrom > 0 ? `Retomando a partir da linha ${resumeFrom}` : null,
      detalhes: {
        ...detalhesImportacao,
        progresso: {
          linhas_processadas: resumeFrom,
          retomada_a_partir_de: resumeFrom,
          lotes_concluidos: 0,
          lotes_com_erro: 0,
          bytes_baixados: 0,
          arquivo: null,
          atualizado_em: new Date().toISOString(),
        },
      },
    }).eq("id", logId);

    const run = executarImportacaoTSE({
      supabase,
      logId,
      ano,
      turno,
      uf,
      cargoFiltro,
      candidatoFiltro,
      partidoFiltro,
      codigoMunicipio,
      url,
      resumeFrom,
      detalhesImportacao,
    });

    // @ts-ignore EdgeRuntime global
    if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any)?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(run);
    } else {
      void run;
    }

    return new Response(JSON.stringify({
      success: true,
      started: true,
      log_id: logId,
      ano_eleicao: ano,
      turno,
      uf,
      total: 0,
      importados: 0,
      arquivo: arquivoZip,
      mensagem: "Importação iniciada em background",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
