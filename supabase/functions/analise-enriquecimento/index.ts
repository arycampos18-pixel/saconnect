import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { analisarDivergencia } from "./divergencia.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Campos permitidos pela política do módulo. Telefone NUNCA sobrescreve telefone_original.
type TelefoneApi = {
  numero: string;
  tipo?: string | null;
  operadora?: string | null;
  ativo?: boolean | null;
};

type EnderecoApi = {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  tipo?: string | null;
  principal?: boolean | null;
};

type EnrichResult = {
  cpf?: string | null;
  nome_completo?: string | null;
  data_nascimento?: string | null;
  nome_mae?: string | null;
  email?: string | null;
  genero?: string | null;
  estado_civil?: string | null;
  nacionalidade?: string | null;
  profissao?: string | null;
  titulo_eleitoral?: string | null;
  municipio_eleitoral?: string | null;
  endereco?: EnderecoApi | null;
  telefones_api?: TelefoneApi[];
  enderecos_api?: EnderecoApi[];
  // Telefone NÃO é exposto ao app — vai apenas para log técnico.
  _telefone_api_log?: string | null;
};

const onlyDigits = (v?: string | null) => (v ?? "").replace(/\D/g, "");

// Custo por consulta cobrada pelo provedor SA Connect Data. Cada chamada
// real conta como uma cobrança independente — inclusive as 404
// ("nenhuma pessoa vinculada") e o follow-up por CPF.
const CUSTO_CENTAVOS_POR_CONSULTA = 59;

// Converte datas vindas do provedor (dd/mm/yyyy ou ISO) para ISO yyyy-mm-dd
function toIsoDate(v?: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

// ============================================================================
// SA Connect Data OAuth2 token (cache em memória da instância da edge function)
// ----------------------------------------------------------------------------
// Fluxo oficial:
//   POST {AUTH_BASE}/oauth2/v3/token  (Basic client_id:client_secret)
//        body: grant_type=client_credentials
//   → { access_token, expires_in, token_type }
// Depois: GET {API_BASE}/localize/v3/cpf/{cpf}  com Bearer access_token
// ============================================================================
let cachedToken: { value: string; expira_em: number } | null = null;
let ultimoOauthEndpoint: string | null = null;

// Lê credenciais (e id_finalidade) da tabela `analise_provedor_credenciais`,
// caindo para os secrets do servidor quando a tabela não tiver registro.
async function lerCredenciaisProvedor(): Promise<{
  user: string | null;
  pass: string | null;
  id_finalidade: number;
  origem: "db" | "env" | "missing";
}> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && srk) {
      const admin = createClient(url, srk);
      const { data } = await admin
        .from("analise_provedor_credenciais")
        .select("client_id, client_secret, id_finalidade")
        .eq("provedor", "assertiva")
        .maybeSingle();
      if (data?.client_id && data?.client_secret) {
        return {
          user: data.client_id,
          pass: data.client_secret,
          id_finalidade: Number(data.id_finalidade ?? 1),
          origem: "db",
        };
      }
    }
  } catch (_) { /* fallback para env */ }
  const envUser = Deno.env.get("ANALISE_ELEITORAL_API_USER") ?? null;
  const envPass = Deno.env.get("ANALISE_ELEITORAL_API_PASSWORD") ?? null;
  return {
    user: envUser, pass: envPass,
    id_finalidade: 1,
    origem: envUser && envPass ? "env" : "missing",
  };
}

function gerarDicaOAuth(http_status: number, erro?: string, raw?: unknown): string | null {
  const txt = `${erro ?? ""} ${typeof raw === "string" ? raw : JSON.stringify(raw ?? {})}`.toLowerCase();
  if (http_status === 401 || /invalid[_ ]client|unauthorized/.test(txt)) {
    return "Credenciais OAuth2 inválidas. Verifique ANALISE_ELEITORAL_API_USER (client_id) e ANALISE_ELEITORAL_API_PASSWORD (client_secret) no painel do SA Connect Data.";
  }
  if (http_status === 403 && /missing equal-sign|authorization header/.test(txt)) {
    return "O SA Connect Data rejeitou o cabeçalho Authorization. Confirme que ANALISE_ELEITORAL_API_URL aponta para a URL raiz da API (e não para o portal de docs/sandbox).";
  }
  if (http_status === 403 || /forbidden|access_denied/.test(txt)) {
    return "O SA Connect Data recusou o acesso a essas credenciais. Confirme se o par salvo é o mesmo que você validou e se sua conta tem permissão para usar a API em produção.";
  }
  if (http_status === 0 || /timeout|abort|network/.test(txt)) {
    return "Falha de rede ao acessar o provedor OAuth2. Tente novamente em instantes; se persistir, verifique a URL configurada.";
  }
  if (http_status === 404) {
    return "Endpoint OAuth2 não encontrado. Use https://integracao.assertivasolucoes.com.br como URL base — o /v3/token é adicionado automaticamente.";
  }
  return null;
}

/** Rótulo público nas respostas JSON (evita expor hostname comercial do provedor). */
const ROTULO_PROVEDOR_ENRIQUECIMENTO = "SA Connect Data";

function oauthEndpointRespostaPublica(absUrl: string): string {
  try {
    return `${new URL(absUrl).pathname} (${ROTULO_PROVEDOR_ENRIQUECIMENTO})`;
  } catch {
    return `(${ROTULO_PROVEDOR_ENRIQUECIMENTO})`;
  }
}

/** Sanitiza campos expostos ao browser (mantém host real só em logs internos / DB). */
function metaProvedorRespostaCliente(provedorHost: string, oauthAbs: string | null): {
  provedor: string;
  oauth_endpoint: string | null;
} {
  const ocultar = provedorHost.toLowerCase().includes("assertivasolucoes")
    || (oauthAbs?.toLowerCase().includes("assertivasolucoes") ?? false);
  if (!ocultar) {
    return { provedor: provedorHost, oauth_endpoint: oauthAbs };
  }
  return {
    provedor: ROTULO_PROVEDOR_ENRIQUECIMENTO,
    oauth_endpoint: oauthAbs ? oauthEndpointRespostaPublica(oauthAbs) : null,
  };
}

/** Qualquer string em JSON ao cliente: substitui hostname comercial por "SA Connect". */
const RE_ASSERTIVA_SUBSTRING = /assertivasolucoes/gi;

function sanitizarJsonCliente<T>(data: T): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      return RE_ASSERTIVA_SUBSTRING.test(v) ? v.replace(RE_ASSERTIVA_SUBSTRING, "SA Connect") : v;
    }
    if (v === null || v === undefined) return v;
    if (typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(walk);
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) out[k] = walk(val);
    return out;
  };
  return walk(data) as T;
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(sanitizarJsonCliente(data)), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveProvedorApiHost(base?: string | null): string {
  // Servidor de produção Assertiva: api.assertivasolucoes.com.br
  // integracao.assertivasolucoes.com.br é o portal de documentação/sandbox
  if (!base) return "api.assertivasolucoes.com.br";
  try {
    const url = new URL(base.replace(/\/+$/, ""));
    if (url.pathname.includes("/v3/doc") || url.host.startsWith("integracao.")) {
      return "api.assertivasolucoes.com.br";
    }
    return url.host;
  } catch {
    return "api.assertivasolucoes.com.br";
  }
}

async function obterTokenProvedor(): Promise<
  | { ok: true; token: string; cached: boolean }
  | { ok: false; http_status: number; erro: string; raw?: unknown }
> {
  const creds = await lerCredenciaisProvedor();
  const user = creds.user;
  const pass = creds.pass;
  // URL vazia: mesmo comportamento do modal de validação — host OAuth padrão Assertiva.
  const base = (Deno.env.get("ANALISE_ELEITORAL_API_URL") ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!user || !pass) {
    return { ok: false, http_status: 0, erro: "Credenciais OAuth2 ausentes (USER/PASSWORD ou credenciais salvas na base)" };
  }
  if (cachedToken && cachedToken.expira_em - 30_000 > Date.now()) {
    return { ok: true, token: cachedToken.value, cached: true };
  }
  // O endpoint de OAuth2 do SA Connect Data é sempre o mesmo host de API,
  // independente da URL configurada (que pode apontar p/ docs/sandbox).
  // Extraímos só o host e forçamos `api.assertivasolucoes.com.br` quando
  // o usuário colou a URL de documentação (`integracao...` ou `/v3/doc`).
  const host = resolveProvedorApiHost(base || null);
  const tokenUrl = `https://${host}/oauth2/v3/token`;
  // Exposto p/ logs/diagnóstico (último endpoint usado nesta instância)
  ultimoOauthEndpoint = tokenUrl;
  console.log("[assertiva] solicitando token em", tokenUrl);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${user}:${pass}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    const raw = await resp.json().catch(() => ({}));
    console.log("[assertiva] token http", resp.status);
    if (!resp.ok) {
      return {
        ok: false, http_status: resp.status,
        erro: `Falha OAuth2 (HTTP ${resp.status})`, raw,
      };
    }
    const token = (raw as any).access_token as string | undefined;
    const expiresIn = Number((raw as any).expires_in ?? 3600);
    if (!token) {
      return { ok: false, http_status: resp.status, erro: "Token ausente na resposta", raw };
    }
    cachedToken = { value: token, expira_em: Date.now() + expiresIn * 1000 };
    return { ok: true, token, cached: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[assertiva] erro token:", msg);
    return {
      ok: false, http_status: 0,
      erro: msg.includes("aborted") ? "Timeout (15s) ao conectar no provedor OAuth2" : msg,
    };
  }
}

async function chamarProvedor(payload: { cpf?: string; telefone?: string; idFinalidade?: number }): Promise<{
  ok: boolean;
  billable: boolean;
  http_status: number;
  raw: unknown;
  result: EnrichResult;
  provedor: string;
  duracao_ms: number;
  erro?: string;
}> {
  const creds = await lerCredenciaisProvedor();
  const user = creds.user;
  const pass = creds.pass;
  const envUrl = (Deno.env.get("ANALISE_ELEITORAL_API_URL") ?? "").trim().replace(/\/+$/, "");
  const started = Date.now();

  if (!user || !pass) {
    // Sem OAuth2 (secrets nem tabela analise_provedor_credenciais).
    return {
      ok: true,
      billable: false,
      http_status: 200,
      raw: {
        mock: true,
        motivo:
          "Provedor não configurado (client_id/client_secret ausentes em secrets ou na tabela analise_provedor_credenciais).",
      },
      result: {},
      provedor: "mock",
      duracao_ms: Date.now() - started,
    };
  }

  try {
    // 1) Obter (ou reaproveitar) Bearer via OAuth2 client_credentials.
    const tok = await obterTokenProvedor();
    const host = resolveProvedorApiHost(envUrl || null);
    if (!tok.ok) {
      return {
        ok: false, billable: false, http_status: tok.http_status, raw: (tok as any).raw ?? null,
        result: {}, provedor: host,
        duracao_ms: Date.now() - started, erro: tok.erro,
      };
    }
    // 2) Endpoints SA Connect Data Localize v3.
    // OAuth2 usa api.assertivasolucoes.com.br/oauth2/v3/token
    // Dados usam integracao.assertivasolucoes.com.br/v3/localize/v3/cpf|telefone
    // (hosts diferentes conforme documentação oficial)
    const finalidade = payload.idFinalidade ?? 1;
    const dataHost = envUrl
      ? resolveProvedorApiHost(envUrl)
      : "integracao.assertivasolucoes.com.br";
    const v3 = `https://${dataHost}/v3/localize/v3`;
    const fullUrl = payload.cpf
      ? `${v3}/cpf?cpf=${encodeURIComponent(payload.cpf)}&idFinalidade=${finalidade}`
      : `${v3}/telefone?telefone=${encodeURIComponent(payload.telefone ?? "")}&idFinalidade=${finalidade}`;
    const resp = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tok.token}`,
      },
    });
    const raw = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      // 404 do SA Connect Data = "nenhuma pessoa vinculada ao CPF/telefone".
      // Não é falha técnica — devolve resultado vazio com ok:true.
      if (resp.status === 404) {
        return {
          ok: true, billable: true, http_status: 200, raw, result: {},
          provedor: new URL(fullUrl).host, duracao_ms: Date.now() - started,
        };
      }
      return {
        ok: false, billable: true, http_status: resp.status, raw, result: {},
        provedor: new URL(fullUrl).host, duracao_ms: Date.now() - started,
        erro: `HTTP ${resp.status}`,
      };
    }
    // Estrutura real da API Assertiva Localize v3:
    // {
    //   resposta: {
    //     dadosCadastrais: { nome, cpf, dataNascimento, nomeMae, ... },  ← CPF
    //     telefones: { CELULAR: [{numero, operadora, ...}], ... },       ← objeto por tipo
    //     enderecos: [ {logradouro, numero, bairro, cidade, ...} ],
    //     emails:    [ {email, ...} ],
    //     pessoaFisica: [ {...} ]                                         ← Telefone/Nome
    //   }
    // }
    const root = raw as Record<string, any>;
    const resposta = (root?.resposta ?? root) as Record<string, any>;

    // Dados pessoais: pessoasFisicas[]/pessoaFisica[] (busca por tel/nome)
    // ou dadosCadastrais (busca por CPF)
    const pessoasFisicasArr: Record<string, any>[] =
      (Array.isArray(resposta?.pessoasFisicas) && resposta.pessoasFisicas.length > 0)
        ? resposta.pessoasFisicas
        : (Array.isArray(resposta?.pessoaFisica) && resposta.pessoaFisica.length > 0)
          ? resposta.pessoaFisica
          : [];

    const pessoaFisica: Record<string, any> | null =
      pessoasFisicasArr.length > 0 ? pessoasFisicasArr[0] : null;

    // r = dados pessoais da pessoa (de pessoaFisica[0] ou da raiz de resposta para CPF)
    let r: Record<string, any> = pessoaFisica ?? resposta;

    // dadosCadastrais pode estar dentro de pessoaFisica[0] ou diretamente em resposta
    const dc: Record<string, any> =
      (r?.dadosCadastrais ?? resposta?.dadosCadastrais ?? r?.dados_cadastrais ?? {}) as Record<string, any>;

    // CPF aninhado como objeto em r.cpf
    if (r && typeof r.cpf === "object" && r.cpf !== null) {
      r = { ...r.cpf, ...r };
      if (typeof (r.cpf as any)?.numeroCpf === "string") {
        (r as any).cpf = (r.cpf as any).numeroCpf;
      }
    }

    // ── Título de eleitor ────────────────────────────────────────────────────
    const tituloFromDc = dc.tituloEleitor ?? dc.titulo_eleitor ?? dc.titulo ?? null;
    const tituloObj = tituloFromDc ?? r.tituloEleitor ?? r.titulo_eleitor ?? null;

    // ── Email ────────────────────────────────────────────────────────────────
    // resposta.emails é array: [{email: "..."}, ...] ou [string, ...]
    const emailsArr: any[] = Array.isArray(resposta.emails)
      ? resposta.emails
      : Array.isArray(r.emails) ? r.emails : [];
    const emailRaw =
      r.email ??
      dc.email ??
      (emailsArr.length > 0
        ? (emailsArr[0]?.email ?? emailsArr[0]?.enderecoEmail ?? (typeof emailsArr[0] === "string" ? emailsArr[0] : null))
        : null);

    // ── Telefones ────────────────────────────────────────────────────────────
    // resposta.telefones é objeto: { CELULAR: [{numero, operadora, ...}], RESIDENCIAL: [...] }
    // Achata para array independente do formato
    const telefonesRaw: any = resposta.telefones ?? r.telefones ?? {};
    let telefonesApi: TelefoneApi[] = [];
    if (Array.isArray(telefonesRaw)) {
      telefonesApi = telefonesRaw;
    } else if (telefonesRaw && typeof telefonesRaw === "object") {
      // { CELULAR: [{...}], RESIDENCIAL: [{...}], ... }
      for (const [tipo, itens] of Object.entries(telefonesRaw)) {
        const lista = Array.isArray(itens) ? itens : [itens];
        for (const t of lista) {
          if (!t) continue;
          const num = String(t.numero ?? t.telefoneCompleto ?? t.telefone ?? t ?? "").replace(/\D/g, "");
          if (num.length >= 8) {
            telefonesApi.push({
              numero: num,
              tipo: t.tipo ?? t.tipoTelefone ?? tipo ?? null,
              operadora: t.operadora ?? null,
              ativo: t.ativo ?? (t.status === "ATIVO") ?? null,
            });
          }
        }
      }
    }

    // ── Endereços ────────────────────────────────────────────────────────────
    // resposta.enderecos é array de objetos de endereço
    const enderecosRaw: any[] = Array.isArray(resposta.enderecos) && resposta.enderecos.length > 0
      ? resposta.enderecos
      : Array.isArray(r.enderecos) && r.enderecos.length > 0
        ? r.enderecos
        : Array.isArray(dc?.enderecos) ? dc.enderecos : [];

    const mapEndereco = (e: any): EnderecoApi => {
      const inner = e?.dadosEndereco ?? e ?? {};
      return {
        logradouro: [inner.tipoLogradouro, inner.logradouro ?? inner.rua ?? inner.nomeLogradouro]
          .filter(Boolean).join(" ").trim() || null,
        numero: inner.numero ?? null,
        complemento: inner.complemento ?? null,
        bairro: inner.bairro ?? null,
        cidade: inner.cidade ?? inner.municipio ?? inner.localidade ?? inner.nomeCidade ?? null,
        estado: inner.uf ?? inner.estado ?? inner.siglaUf ?? inner.nomeEstado ?? null,
        cep: inner.cep ?? null,
        tipo: inner.tipo ?? inner.tipoEndereco ?? inner.tipoLogradouro ?? null,
        principal: inner.principal ?? e?.principal ?? null,
      };
    };
    const enderecosApi: EnderecoApi[] = enderecosRaw.map(mapEndereco);
    const endereco: EnderecoApi | null = enderecosApi.length > 0 ? enderecosApi[0] : (() => {
      // Fallback: cidade/UF avulsas na raiz
      const cidade = r.cidade ?? r.municipio ?? dc.cidade ?? null;
      const uf = r.uf ?? r.estado ?? dc.uf ?? null;
      return (cidade || uf) ? { cidade, estado: uf } : null;
    })();

    const result: EnrichResult = {
      cpf:
        (typeof r.cpf === "string" ? r.cpf : null) ??
        dc.cpf ?? dc.numeroCpf ?? r.numeroCpf ?? null,
      nome_completo:
        dc.nome ?? dc.nomeCompleto ?? r.nome ?? r.nomeCompleto ?? null,
      data_nascimento: toIsoDate(
        dc.dataNascimento ?? dc.data_nascimento ?? dc.nascimento ??
        r.dataNascimento ?? r.data_nascimento ?? null
      ),
      nome_mae:
        dc.maeNome ?? dc.nomeMae ?? dc.nome_mae ?? dc.mae ??
        r.nomeMae ?? r.nome_mae ?? null,
      email: typeof emailRaw === "string" ? emailRaw : (emailRaw?.email ?? null),
      genero:
        r.genero ?? r.sexo ?? dc.genero ?? dc.sexo ?? null,
      estado_civil:
        r.estadoCivil ?? r.estado_civil ?? dc.estadoCivil ?? dc.estado_civil ?? null,
      nacionalidade:
        r.nacionalidade ?? dc.nacionalidade ?? null,
      profissao:
        r.profissao ?? r.ocupacao ?? dc.profissao ?? dc.ocupacao ?? null,
      titulo_eleitoral:
        (typeof tituloObj === "object" && tituloObj
          ? tituloObj.numero ?? tituloObj.numeroTitulo ?? tituloObj.titulo ?? tituloObj.inscricao
          : tituloObj) ??
        dc.titulo ?? r.titulo ?? r.titulo_eleitoral ??
        null,
      municipio_eleitoral:
        (typeof tituloObj === "object" && tituloObj
          ? tituloObj.municipio ?? tituloObj.municipioTitulo ?? tituloObj.cidade ?? tituloObj.zona
          : null) ??
        dc.municipio_eleitoral ?? dc.municipio ??
        r.municipio_eleitoral ?? r.municipioTitulo ?? r.municipio ??
        null,
      endereco,
      telefones_api: telefonesApi,
      enderecos_api: enderecosApi,
      _telefone_api_log:
        telefonesApi[0]?.numero ??
        r.telefone ??
        r.celular ??
        null,
    };
    return {
      ok: true, billable: true, http_status: resp.status, raw, result,
      provedor: new URL(fullUrl).host, duracao_ms: Date.now() - started,
    };
  } catch (e) {
    return {
      ok: false, billable: false, http_status: 0, raw: null, result: {},
      provedor: "error", duracao_ms: Date.now() - started,
      erro: e instanceof Error ? e.message : String(e),
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonRes({ error: "Não autenticado" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Decodifica o payload do JWT localmente para evitar round-trip ao servidor
    // Auth (que falha com "Session from session_id claim in JWT does not exist"
    // quando a sessão já foi expirada na tabela auth.sessions).
    // Segurança mantida: todas as queries usam o JWT via RLS.
    const _jwtRaw = authHeader.replace(/^Bearer\s+/i, "").trim();
    const _userId = (() => {
      try {
        // JWTs usam base64url (-/_); atob() só aceita base64 padrão (+//).
        const part = (_jwtRaw.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
        const padded = part + "=".repeat((4 - part.length % 4) % 4);
        const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
        const sub = payload.sub ?? payload.user_id;
        return typeof sub === "string" && sub.length > 0 ? sub : null;
      } catch {
        return null;
      }
    })();
    if (!_userId) {
      return jsonRes({ error: "Token inválido ou ausente." }, 401);
    }
    const uid = (): string => _userId;

    const body = await req.json().catch(() => ({})) as {
      eleitor_id?: string; cpf?: string; telefone?: string; ping?: boolean;
      validate?: boolean; save_credentials?: boolean;
      client_id?: string; client_secret?: string; id_finalidade?: number;
    };

    // Modo SAVE_CREDENTIALS: persiste o par client_id/secret na tabela
    // `analise_provedor_credenciais`. Apenas super admins.
    if (body.save_credentials) {
      // Confere super admin
      const { data: superData } = await supabase.rpc("is_super_admin", { _user_id: uid() });
      if (!superData) {
        return jsonRes({ error: "Apenas super admins podem salvar credenciais" }, 403);
      }
      const cid = (body.client_id ?? "").trim();
      const csec = (body.client_secret ?? "").trim();
      if (!cid || !csec) {
        return jsonRes({ error: "Informe Client ID e Client Secret." }, 400);
      }
      const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!srk) {
        return jsonRes({ error: "Service role indisponível" }, 500);
      }
      const admin = createClient(SUPABASE_URL, srk);
      const idFin = Number(body.id_finalidade ?? 1);
      const { error: upErr } = await admin
        .from("analise_provedor_credenciais")
        .upsert(
          {
            provedor: "assertiva",
            client_id: cid,
            client_secret: csec,
            id_finalidade: idFin,
            updated_by: uid(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provedor" },
        );
      if (upErr) {
        return jsonRes({ error: upErr.message }, 500);
      }
      // Limpa o cache do token p/ forçar uso das novas credenciais
      cachedToken = null;
      return jsonRes({ ok: true, mensagem: "Credenciais salvas com sucesso." }, 200);
    }

    // Modo VALIDATE: testa um par client_id/client_secret informado no body
    // SEM usar os secrets salvos e SEM persistir nada. Útil para o usuário
    // validar credenciais antes de salvá-las nos secrets.
    if (body.validate) {
      const cid = (body.client_id ?? "").trim();
      const csec = (body.client_secret ?? "").trim();
      const modo = "oauth2_client_credentials";
      if (!cid || !csec) {
        return jsonRes({
          ok: false, modo, erro: "Informe Client ID e Client Secret para validar.",
        }, 200);
      }
      const tokenUrl = "https://api.assertivasolucoes.com.br/oauth2/v3/token";
      const started = Date.now();
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15_000);
        const resp = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${cid}:${csec}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: "grant_type=client_credentials",
          signal: ctrl.signal,
        }).finally(() => clearTimeout(timer));
        const raw = await resp.json().catch(() => ({}));
        const dur = Date.now() - started;
        if (!resp.ok) {
          return jsonRes({
            ok: false, modo, oauth_endpoint: oauthEndpointRespostaPublica(tokenUrl),
            http_status: resp.status, erro: `Falha OAuth2 (HTTP ${resp.status})`,
            detalhes: raw, duracao_ms: dur,
            dica: gerarDicaOAuth(resp.status, undefined, raw),
          }, 200);
        }
        return jsonRes({
          ok: true, modo, oauth_endpoint: oauthEndpointRespostaPublica(tokenUrl),
          duracao_ms: dur,
          expires_in: (raw as any)?.expires_in ?? null,
          token_type: (raw as any)?.token_type ?? null,
          mensagem: "Credenciais válidas. Você já pode salvá-las nos secrets.",
        }, 200);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonRes({
          ok: false, modo, oauth_endpoint: oauthEndpointRespostaPublica(tokenUrl),
          erro: msg.includes("aborted") ? "Timeout (15s) ao conectar no provedor OAuth2" : msg,
          dica: gerarDicaOAuth(0, msg),
        }, 200);
      }
    }

    // Modo PING: valida apenas a autenticação contra o provedor.
    if (body.ping) {
      const creds = await lerCredenciaisProvedor();
      const user = creds.user;
      const pass = creds.pass;
      const modo = "oauth2_client_credentials";
      if (!user || !pass) {
        return jsonRes({
          ok: false, modo,
          erro:
            "Faltam credenciais OAuth2: defina ANALISE_ELEITORAL_API_USER + ANALISE_ELEITORAL_API_PASSWORD nos secrets da função, ou salve Client ID/Secret (super admin). URL é opcional.",
        }, 200);
      }
      const started = Date.now();
      // Reseta cache para validar credenciais "ao vivo".
      cachedToken = null;
      const tok = await obterTokenProvedor();
      const dur = Date.now() - started;
      const oauthPathOnly = ultimoOauthEndpoint ? oauthEndpointRespostaPublica(ultimoOauthEndpoint) : null;
      if (!tok.ok) {
        return jsonRes({
          ok: false, modo, provedor: ROTULO_PROVEDOR_ENRIQUECIMENTO,
          oauth_endpoint: oauthPathOnly,
          http_status: tok.http_status, erro: tok.erro,
          detalhes: (tok as any).raw ?? null,
          duracao_ms: dur,
          dica: gerarDicaOAuth(tok.http_status, tok.erro, (tok as any).raw)
            ?? "Confira client_id/client_secret (tabela assertiva ou secrets). ANALISE_ELEITORAL_API_URL é opcional.",
        }, 200);
      }
      return jsonRes({
        ok: true, modo, provedor: ROTULO_PROVEDOR_ENRIQUECIMENTO,
        oauth_endpoint: oauthPathOnly,
        duracao_ms: dur,
        token_cache: tok.cached ? "reaproveitado" : "novo",
        mensagem: "Token OAuth2 obtido com sucesso. Conexão com SA Connect Data funcionando.",
      }, 200);
    }

    let eleitor: any = null;
    if (body.eleitor_id) {
      const { data, error: eleitorErr } = await supabase
        .from("eleitores")
        .select("id, cpf, telefone, telefone_original, nome, data_nascimento, nome_mae, company_id")
        .eq("id", body.eleitor_id).maybeSingle();
      if (eleitorErr) {
        console.warn("[enriquecimento] erro ao buscar eleitor:", eleitorErr.message);
        return jsonRes({ error: `Não foi possível acessar o cadastro do eleitor: ${eleitorErr.message}` }, 422);
      }
      if (!data) {
        return jsonRes({
          error: "Eleitor não encontrado ou sem permissão de acesso. Verifique as permissões de RLS.",
          eleitor_id: body.eleitor_id,
        }, 404);
      }
      eleitor = data;
    }

    const cpf = onlyDigits(body.cpf ?? eleitor?.cpf);
    const telefoneBusca = onlyDigits(body.telefone ?? eleitor?.telefone_original ?? eleitor?.telefone);

    // Prioridade: CPF, depois telefone (apenas para a busca, nunca para escrita)
    const lookupPayload = cpf
      ? { cpf }
      : telefoneBusca
        ? { telefone: telefoneBusca }
        : null;

    if (!lookupPayload) {
      return jsonRes({
        ok: true,
        skipped: true,
        motivo: "Eleitor sem CPF e sem telefone — adicione ao menos um desses dados para poder enriquecer.",
        eleitor_id: body.eleitor_id ?? null,
      }, 200);
    }

    const chave_busca = cpf ? "cpf" : "telefone";

    // ===== Verificação de limite (orçamento mensal + cota diária) =====
    // Bloqueia QUALQUER consulta (manual ou automática) quando o teto
    // configurado em `analise_provedor_limites` for atingido.
    {
      const { data: usoData } = await supabase.rpc("analise_provedor_uso", { _provedor: "assertiva" });
      const uso = (usoData ?? {}) as any;
      if (uso?.bloqueado_orcamento || uso?.bloqueado_cota || uso?.bloqueado_cota_mensal) {
        const motivo = uso.bloqueado_orcamento
          ? `Orçamento mensal de R$ ${(uso.orcamento_mensal_centavos / 100).toFixed(2)} atingido (gasto: R$ ${(uso.gasto_mes_centavos / 100).toFixed(2)}).`
          : uso.bloqueado_cota_mensal
          ? `Cota mensal de ${uso.cota_mensal_consultas} consultas atingida (mês: ${uso.consultas_mes}).`
          : `Cota diária de ${uso.cota_diaria_consultas} consultas atingida (hoje: ${uso.consultas_dia}).`;
        await supabase.from("analise_logs").insert({
          user_id: uid(),
          eleitor_id: body.eleitor_id ?? null,
          acao: "enriquecimento.bloqueado_limite",
          detalhes: { motivo, uso },
        });
        return jsonRes({
          error: motivo,
          bloqueado: true,
          uso,
        }, 200);
      }
    }

    const creds = await lerCredenciaisProvedor();
    const idFinalidade = creds.id_finalidade ?? 1;
    const call = await chamarProvedor({ ...lookupPayload, idFinalidade });

    // Encadeamento: se a busca por TELEFONE retornou um CPF mas não um
    // endereço completo (logradouro/CEP), faz uma 2ª consulta por CPF
    // para puxar o endereço detalhado do endpoint /localize/v3/cpf.
    let callCpfFollowup: Awaited<ReturnType<typeof chamarProvedor>> | null = null;
    if (
      !cpf && call.ok && call.result?.cpf &&
      !(call.result.endereco?.logradouro || call.result.endereco?.cep)
    ) {
      const cpfDescoberto = onlyDigits(call.result.cpf);
      if (cpfDescoberto.length === 11) {
        callCpfFollowup = await chamarProvedor({ cpf: cpfDescoberto, idFinalidade });
        if (callCpfFollowup.ok) {
          // Mescla campos do CPF por cima, preservando o que já veio do telefone.
          const merged: any = { ...call.result };
          for (const [k, v] of Object.entries(callCpfFollowup.result)) {
            if (v != null && v !== "" && (merged[k] == null || merged[k] === "")) {
              merged[k] = v;
            }
          }
          // Endereço: preferir o do CPF se ele tiver logradouro
          if (callCpfFollowup.result.endereco?.logradouro) {
            merged.endereco = {
              ...(call.result.endereco ?? {}),
              ...callCpfFollowup.result.endereco,
            };
          }
          call.result = merged;
          call.raw = { telefone: call.raw, cpf_followup: callCpfFollowup.raw };
        }
      }
    }

    // 1) Log da(s) consulta(s) — UMA LINHA POR CHAMADA REAL ao provedor.
    //    Cada linha conta como uma cobrança de R$ 0,59 (mock = R$ 0,00).
    const custoDe = (c: { provedor: string; ok: boolean; http_status: number }) => {
      if ((c as any).provedor === "mock" || !(c as any).billable) return 0;
      // Qualquer consulta que efetivamente chegou ao endpoint do provedor
      // (inclusive 404/erro do Localize) é cobrada.
      return CUSTO_CENTAVOS_POR_CONSULTA;
    };
    await supabase.from("analise_api_consultas").insert({
      provedor: call.provedor,
      endpoint: `enriquecimento:${chave_busca}`,
      payload: {
        ...lookupPayload,
        eleitor_id: body.eleitor_id ?? null,
        chave_busca,
        etapa: "principal",
      },
      resposta: callCpfFollowup ? { telefone: call.raw } : call.raw,
      status: call.ok ? "sucesso" : "erro",
      http_status: call.http_status,
      custo_centavos: custoDe(call),
      duracao_ms: call.duracao_ms,
      eleitor_id: body.eleitor_id ?? null,
      user_id: uid(),
    });
    if (callCpfFollowup) {
      await supabase.from("analise_api_consultas").insert({
        provedor: callCpfFollowup.provedor,
        endpoint: "enriquecimento:cpf_followup",
        payload: {
          eleitor_id: body.eleitor_id ?? null,
          chave_busca: "cpf",
          etapa: "followup",
          origem: "telefone",
        },
        resposta: callCpfFollowup.raw,
        status: callCpfFollowup.ok ? "sucesso" : "erro",
        http_status: callCpfFollowup.http_status,
        custo_centavos: custoDe(callCpfFollowup),
        duracao_ms: callCpfFollowup.duracao_ms,
        eleitor_id: body.eleitor_id ?? null,
        user_id: uid(),
      });
    }

    // 2) Log técnico do telefone retornado (sem afetar cadastro)
    if (call.result._telefone_api_log) {
      await supabase.from("analise_logs").insert({
        user_id: uid(),
        eleitor_id: body.eleitor_id ?? null,
        acao: "enriquecimento.telefone_api_ignorado",
        detalhes: {
          telefone_api: call.result._telefone_api_log,
          telefone_oficial: eleitor?.telefone_original ?? eleitor?.telefone ?? null,
          observacao: "Telefone retornado pela API foi ignorado e não substitui telefone_original.",
        },
      });
    }

    if (!call.ok) {
      await supabase.from("analise_logs").insert({
        user_id: uid(),
        eleitor_id: body.eleitor_id ?? null,
        acao: "enriquecimento.erro",
        detalhes: { erro: call.erro, http_status: call.http_status, chave_busca },
      });
      const pub = metaProvedorRespostaCliente(call.provedor, ultimoOauthEndpoint);
      return jsonRes({
        error: call.erro ?? "Falha na consulta",
        details: call.raw,
        http_status: call.http_status,
        oauth_endpoint: pub.oauth_endpoint,
        provedor: pub.provedor,
        dica: gerarDicaOAuth(call.http_status, call.erro, call.raw),
      }, 502);
    }

    // 3) Atualiza eleitor APENAS com campos permitidos e somente quando estiverem vazios
    let camposAplicados: string[] = [];
    let divergencia: ReturnType<typeof analisarDivergencia> | null = null;
    if (body.eleitor_id && eleitor) {
      const r = call.result;
      const end = r.endereco ?? {};

      // 3a) Análise de divergência (somente critérios fortes; telefone NUNCA entra)
      divergencia = analisarDivergencia(
        {
          cpf: eleitor.cpf,
          nome: eleitor.nome,
          data_nascimento: eleitor.data_nascimento,
          nome_mae: eleitor.nome_mae,
        },
        {
          cpf: r.cpf,
          nome: r.nome_completo,
          data_nascimento: r.data_nascimento,
          nome_mae: r.nome_mae,
        },
      );

      // Regra adicional (estrita): primeiro nome cadastrado precisa bater
      // exatamente com o primeiro nome retornado pelo SA Connect Data. Se não
      // bater, NENHUM campo é aplicado.
      const normalizar = (s?: string | null) =>
        (s ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      const nomeBaseNorm = normalizar(eleitor.nome);
      const nomeApiNorm = normalizar(r.nome_completo);
      const primeiroBase = nomeBaseNorm.split(" ")[0] ?? "";
      const primeiroApi = nomeApiNorm.split(" ")[0] ?? "";
      const nomeApiPresente = !!nomeApiNorm;
      const primeiroNomeBate =
        !nomeApiPresente ||
        !primeiroBase || // cadastro sem nome: não bloqueia
        (!!primeiroBase && !!primeiroApi && primeiroBase === primeiroApi);

      // Divergência "forte" de nome só bloqueia se AMBOS os nomes existem no cadastro
      // e na API e o primeiro nome é claramente diferente (ex.: nomes de pessoas distintas).
      // Quando o cadastro não tem nome ou tem apenas apelido, ainda aplicamos outros campos.
      const nomeBloqueia = !primeiroNomeBate && !!primeiroBase && !!primeiroApi;

      // CPF divergente é o único critério que bloqueia tudo (garante que não misturamos dados de pessoas distintas).
      const cpfDiverge = divergencia.divergencias_fortes.includes("cpf");

      // Bloqueio total: CPF de pessoas diferentes confirmado
      const bloquearAtualizacaoTotal = cpfDiverge;

      // Bloqueio parcial de nome: não actualizar nome mas ainda actualizar endereço/outros
      const bloquearNome = nomeBloqueia;

      const patch: Record<string, any> = {};
      const setIf = (k: string, v: any, currentKey?: string) => {
        if (v === null || v === undefined || v === "") return;
        const current = currentKey ? eleitor[currentKey] : eleitor[k];
        if (current === null || current === undefined || current === "") {
          patch[k] = v;
          camposAplicados.push(k);
        }
      };

      if (!bloquearAtualizacaoTotal) {
        if (!eleitor.cpf && r.cpf) { patch.cpf = onlyDigits(r.cpf); camposAplicados.push("cpf"); }

        if (!bloquearNome) {
          // Substitui nome curto (só primeiro nome) pelo nome completo da API quando o primeiro nome bate.
          if (
            r.nome_completo &&
            primeiroBase &&
            primeiroApi &&
            primeiroBase === primeiroApi &&
            nomeBaseNorm.split(" ").length < 2 &&
            String(r.nome_completo).trim().split(/\s+/).length >= 2
          ) {
            patch.nome = String(r.nome_completo).trim();
            camposAplicados.push("nome");
          } else if (!primeiroBase) {
            // Cadastro sem nome: preenche com o da API
            setIf("nome", r.nome_completo);
          } else {
            setIf("nome", r.nome_completo);
          }
          setIf("data_nascimento", r.data_nascimento);
          setIf("nome_mae", r.nome_mae);
        }

        // Campos independentes do nome — sempre enriquecidos se vazios
        setIf("email", r.email);
        setIf("genero", r.genero);
        setIf("estado_civil", r.estado_civil);
        setIf("nacionalidade", r.nacionalidade);
        setIf("profissao", r.profissao);
        setIf("titulo_eleitoral", r.titulo_eleitoral);
        setIf("municipio_eleitoral", r.municipio_eleitoral);
        setIf("rua", end.logradouro);
        setIf("numero", end.numero);
        setIf("complemento", end.complemento);
        setIf("bairro", end.bairro);
        setIf("cidade", end.cidade);
        setIf("uf", end.uf ?? end.estado);
        setIf("cep", end.cep);

        // Telefones e endereços: sempre sobrescreve com o array completo da API
        if ((r.telefones_api ?? []).length > 0) {
          patch.telefones_api = r.telefones_api;
        }
        if ((r.enderecos_api ?? []).length > 0) {
          patch.enderecos_api = r.enderecos_api;
        }
      }

      // PROTEÇÃO ABSOLUTA: jamais escrever telefone/telefone_original
      delete (patch as any).telefone;
      delete (patch as any).telefone_original;

      patch.data_ultima_consulta = new Date().toISOString();
      patch.data_ultimo_enriquecimento = new Date().toISOString();
      patch.status_enriquecimento = bloquearAtualizacaoTotal ? "ERRO" : "SUCESSO";
      patch.score_confianca = divergencia.score;
      // Guarda sempre o nome retornado pelo provedor para comparação — sem sobrescrever o nome manual.
      if (r.nome_completo) patch.nome_api = String(r.nome_completo).trim();
      if (bloquearAtualizacaoTotal) {
        patch.status_validacao_eleitoral = "pendente revisão";
        patch.motivo_divergencia = divergencia.motivo ?? "CPF divergente — possível cadastro de pessoa diferente";
      } else if (bloquearNome) {
        patch.status_validacao_eleitoral = "pendente revisão";
        patch.motivo_divergencia = `Nome diverge: cadastro="${eleitor.nome ?? ""}" vs SA Connect Data="${r.nome_completo ?? ""}" — outros campos foram preenchidos`;
      } else if (divergencia.status_sugerido === "validado" && eleitor.cpf) {
        patch.status_validacao_eleitoral = "validado";
        patch.motivo_divergencia = null;
      }

      if (Object.keys(patch).length > 0) {
        const { error: updErr } = await supabase
          .from("eleitores").update(patch).eq("id", body.eleitor_id);
        if (updErr) {
          console.error("[enriquecimento] update eleitor falhou:", updErr.message, "patch:", Object.keys(patch));
        }
      }

      const acaoLog = bloquearAtualizacaoTotal
        ? "enriquecimento.divergencia_forte"
        : bloquearNome
          ? "enriquecimento.nome_divergente_parcial"
          : "enriquecimento.aplicado";

      await supabase.from("analise_logs").insert({
        user_id: uid(),
        eleitor_id: body.eleitor_id,
        acao: acaoLog,
        detalhes: {
          campos: camposAplicados,
          chave_busca,
          provedor: call.provedor,
          divergencia,
          primeiro_nome_bate: primeiroNomeBate,
          bloqueio: bloquearAtualizacaoTotal ? "total" : bloquearNome ? "nome" : "nenhum",
        },
      });
    }

    // Não devolve o telefone_api_log para o cliente
    const { _telefone_api_log: _omit, ...safeResult } = call.result;

    const pubOk = metaProvedorRespostaCliente(call.provedor, ultimoOauthEndpoint);
    // Verifica se o resultado está vazio (nenhuma pessoa encontrada)
    const temDados = Object.values(safeResult).some(v => v != null && v !== "" && !(Array.isArray(v) && v.length === 0));
    if (!temDados) {
      return jsonRes({
        ok: true,
        skipped: true,
        motivo: `Nenhuma pessoa encontrada para este ${chave_busca === "cpf" ? "CPF" : "telefone"} na SA Connect Data.`,
        chave_busca,
      }, 200);
    }

    return jsonRes({
      success: true,
      chave_busca,
      oauth_endpoint: pubOk.oauth_endpoint,
      provedor: pubOk.provedor,
      campos_aplicados: camposAplicados,
      divergencia,
      dados: safeResult,
    }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return jsonRes({ error: msg }, 500);
  }
});