import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://apiv3.directd.com.br/api";

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function lerToken(supabaseUrl: string, srk: string): Promise<string | null> {
  try {
    const admin = createClient(supabaseUrl, srk);
    const { data } = await admin
      .from("analise_provedor_credenciais")
      .select("client_id")
      .eq("provedor", "directd")
      .maybeSingle();
    if (data?.client_id) return data.client_id as string;
  } catch { /**/ }
  return Deno.env.get("DIRECTD_TOKEN") ?? Deno.env.get("INFOSIMPLES_TOKEN") ?? null;
}

function toApiDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  if (/^\d{2}[/\-]\d{2}[/\-]\d{4}$/.test(s)) return s.replace(/-/g, "/");
  return null;
}

function extrairDados(json: any): Record<string, any> {
  const retorno = json?.retorno ?? {};
  const ident = retorno?.identificacao ?? {};
  const dom   = retorno?.domicilioEleitoral ?? {};
  return {
    titulo_eleitoral:    ident.inscricao         ?? null,
    nome_eleitor:        ident.eleitor           ?? null,
    zona_eleitoral:      dom.zona                ?? null,
    secao_eleitoral:     dom.secao               ?? null,
    local_votacao:       dom.local               ?? null,
    municipio_eleitoral: dom.municipio           ?? null,
    uf_eleitoral:        dom.uf                  ?? null,
    logradouro_local:    dom.logradouro          ?? null,
    bairro_local:        dom.bairro              ?? null,
    numero_local:        dom.numero              ?? null,
    proxima_eleicao:     dom.proximaEleicao      ?? null,
    situacao_eleitoral:  retorno.status          ?? null,
    biometria_coletada:  retorno.biometriaColetada ?? null,
    _uid:                json?.metaDados?.consultaUid   ?? null,
    _msg:                json?.metaDados?.mensagem      ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SRK           = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return jsonRes({ error: "Não autenticado" }, 401);

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const userId = (() => {
      try {
        const part = (jwt.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
        const padded = part + "=".repeat((4 - part.length % 4) % 4);
        const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
        const sub = payload.sub ?? payload.user_id;
        return typeof sub === "string" && sub.length > 0 ? sub : null;
      } catch { return null; }
    })();
    if (!userId) return jsonRes({ error: "Token inválido." }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SRK);

    const body = await req.json().catch(() => ({})) as {
      eleitor_id?: string;
      cpf?: string;
      nome?: string;
      titulo?: string;
      data_nascimento?: string;
      nome_mae?: string;
      ping?: boolean;
      save_token?: boolean;
      token?: string;
    };

    // ── Salvar token ────────────────────────────────────────────────────────
    if (body.save_token) {
      const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: userId });
      if (!isSA) return jsonRes({ error: "Apenas super admins podem salvar credenciais." }, 403);
      const tok = (body.token ?? "").trim();
      if (!tok) return jsonRes({ error: "Informe o token." }, 400);
      const { error: upErr } = await admin
        .from("analise_provedor_credenciais")
        .upsert(
          { provedor: "directd", client_id: tok, client_secret: "", updated_by: userId, updated_at: new Date().toISOString() },
          { onConflict: "provedor" },
        );
      if (upErr) return jsonRes({ error: upErr.message }, 500);
      return jsonRes({ ok: true, mensagem: "Token TSE salvo com sucesso." });
    }

    // ── Token ────────────────────────────────────────────────────────────────
    const token = await lerToken(SUPABASE_URL, SRK);
    if (!token) {
      return jsonRes({ ok: false, erro: "Token TSE não configurado. Clique em 'Conectar' no cartão da integração." });
    }

    // ── Ping ─────────────────────────────────────────────────────────────────
    if (body.ping) {
      const qs = new URLSearchParams({
        TOKEN: token, CPF: "00000000000",
        DATANASCIMENTO: "01/01/2000", NOMEMAE: "TESTE",
      });
      const t0 = Date.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      try {
        const r = await fetch(`${BASE_URL}/TituloLocalVotacao?${qs.toString()}`, { signal: ctrl.signal });
        clearTimeout(timer);
        const dur = Date.now() - t0;
        if (r.status === 401 || r.status === 403) {
          return jsonRes({ ok: false, erro: "Token inválido ou sem permissão.", duracao_ms: dur });
        }
        return jsonRes({ ok: true, duracao_ms: dur, mensagem: `Token TSE activo e acessível (HTTP ${r.status} · ${dur}ms)` });
      } catch {
        clearTimeout(timer);
        return jsonRes({ ok: false, erro: "Sem resposta da API TSE.", duracao_ms: Date.now() - t0 });
      }
    }

    // ── Consulta real ─────────────────────────────────────────────────────────
    let eleitor: any = null;
    if (body.eleitor_id) {
      const { data, error: eErr } = await supabase
        .from("eleitores")
        .select("id, cpf, nome, nome_mae, data_nascimento, titulo_eleitoral, zona_eleitoral, secao_eleitoral, municipio_eleitoral, uf_eleitoral, local_votacao")
        .eq("id", body.eleitor_id)
        .maybeSingle();
      if (eErr) return jsonRes({ error: `Erro ao buscar eleitor: ${eErr.message}` }, 422);
      if (!data) return jsonRes({ error: "Eleitor não encontrado." }, 404);
      eleitor = data;
    }

    const cpf     = (body.cpf    ?? eleitor?.cpf    ?? "").replace(/\D/g, "");
    const nome    = (body.nome   ?? eleitor?.nome   ?? "").trim();
    const titulo  = (body.titulo ?? eleitor?.titulo_eleitoral ?? "").replace(/\D/g, "");
    const nomeMae = (body.nome_mae ?? eleitor?.nome_mae ?? "").trim().toUpperCase();
    const dataNasc = toApiDate(body.data_nascimento ?? eleitor?.data_nascimento);

    if (!dataNasc) return jsonRes({ ok: false, skipped: true, motivo: "Data de nascimento obrigatória para a consulta TSE." });
    if (!nomeMae)  return jsonRes({ ok: false, skipped: true, motivo: "Nome da mãe obrigatório para a consulta TSE." });
    if (!cpf && !nome && !titulo) return jsonRes({ ok: false, skipped: true, motivo: "Informe ao menos CPF, nome ou número do título eleitoral." });

    // Monta URL — chamada síncrona com timeout de 55 s
    const qs = new URLSearchParams({ TOKEN: token, DATANASCIMENTO: dataNasc, NOMEMAE: nomeMae });
    if (cpf)    qs.set("CPF",                  cpf);
    if (titulo) qs.set("NUMEROTITULOELEITORAL", titulo);
    if (!cpf && !titulo && nome) qs.set("NOME", nome);

    const t0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 55_000);

    let apiResp: Response;
    try {
      apiResp = await fetch(`${BASE_URL}/TituloLocalVotacao?${qs.toString()}`, { signal: ctrl.signal });
    } catch (err: any) {
      clearTimeout(timer);
      const dur = Date.now() - t0;
      const timedOut = err?.name === "AbortError";
      return jsonRes({
        ok: false,
        erro: timedOut
          ? "A API TSE não respondeu em 55 segundos. O TSE pode estar sobrecarregado — tente novamente em alguns minutos."
          : `Falha de rede: ${err?.message ?? String(err)}`,
        duracao_ms: dur,
      });
    }
    clearTimeout(timer);

    const dur = Date.now() - t0;
    let apiJson: any = {};
    try { apiJson = await apiResp.json(); } catch { /**/ }

    const sucesso = apiResp.ok && apiJson?.retorno != null;

    // Grava log (sem bloquear resposta)
    supabase.from("analise_api_consultas").insert({
      provedor: "directd",
      endpoint: "TituloLocalVotacao",
      payload: { cpf: cpf || null, titulo: titulo || null, data_nascimento: dataNasc, nome_mae: nomeMae, eleitor_id: body.eleitor_id ?? null },
      resposta: apiJson,
      status: sucesso ? "sucesso" : "erro",
      http_status: apiResp.status,
      custo_centavos: 0,
      duracao_ms: dur,
      eleitor_id: body.eleitor_id ?? null,
      user_id: userId,
    });

    if (!sucesso) {
      const errMsg =
        apiJson?.metaDados?.mensagem ??
        apiJson?.mensagem ??
        apiJson?.Erro ??
        `HTTP ${apiResp.status}`;
      return jsonRes({ ok: false, erro: errMsg, duracao_ms: dur, _raw: apiJson });
    }

    const dados = extrairDados(apiJson);

    // Actualiza eleitor se aplicável — com await para garantir commit antes de retornar
    if (body.eleitor_id && eleitor) {
      const patch: Record<string, any> = {};
      const setIf = (k: string, v: any) => {
        if (v != null && String(v).trim() !== "" && !eleitor[k]) patch[k] = String(v).trim();
      };
      setIf("titulo_eleitoral",    dados.titulo_eleitoral);
      setIf("zona_eleitoral",      dados.zona_eleitoral);
      setIf("secao_eleitoral",     dados.secao_eleitoral);
      setIf("local_votacao",       dados.local_votacao);
      setIf("municipio_eleitoral", dados.municipio_eleitoral);
      setIf("uf_eleitoral",        dados.uf_eleitoral);
      if (dados.nome_eleitor && !eleitor.nome) patch.nome = dados.nome_eleitor;
      if (Object.keys(patch).length > 0) {
        patch.data_ultima_consulta = new Date().toISOString();
        const { error: updErr } = await supabase.from("eleitores").update(patch).eq("id", body.eleitor_id);
        if (updErr) console.warn("[tse] update:", updErr.message);
        // Inclui o patch na resposta para que o frontend possa actualizar o form directamente
        dados._patch_aplicado = patch;
      }
    }

    return jsonRes({ ok: true, duracao_ms: dur, dados });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analise-validacao-eleitoral] unhandled:", msg);
    return jsonRes({ error: msg }, 500);
  }
});
