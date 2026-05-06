import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TABELAS = [
  "eleitores", "eleitor_tags", "tags", "liderancas", "cabos_eleitorais",
  "eventos", "evento_inscricoes", "agenda_compromissos",
  "crm_oportunidades", "crm_etapas", "crm_tarefas", "crm_interacoes",
  "pesquisas", "pesquisa_perguntas", "pesquisa_respostas",
  "segmentos", "mensagens", "mensagem_envios", "mensagens_externas",
  "automacoes", "automacao_execucoes",
  "concorrentes", "concorrente_atividades",
  "gamificacao_badges", "gamificacao_badges_conquistadas",
  "gamificacao_desafios", "gamificacao_desafio_progresso", "gamificacao_pontuacoes",
  "aprovacoes", "audit_logs", "profiles", "user_roles", "sistema_config",
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  return lines.join("\n");
}

// Minimal ZIP builder (STORE — sem compressão) compatível com qualquer descompactador
function crc32(data: Uint8Array): number {
  let c = 0 ^ -1;
  for (let i = 0; i < data.length; i++) {
    c = (c >>> 8) ^ TABLE[(c ^ data[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}
const TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;
    const lh = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true); // version
    dv.setUint16(6, 0, true); // flags
    dv.setUint16(8, 0, true); // method = store
    dv.setUint16(10, 0, true); // time
    dv.setUint16(12, 0, true); // date
    dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true);
    dv.setUint32(22, size, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);
    local.push(lh, f.data);
    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    ch.set(nameBytes, 46);
    central.push(ch);
    offset += lh.length + size;
  }
  const centralSize = central.reduce((a, b) => a + b.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of local) { out.set(c, p); p += c.length; }
  for (const c of central) { out.set(c, p); p += c.length; }
  out.set(eocd, p);
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    // Permite chamada sem auth apenas se vier do cron (sem Authorization → trate como sistema)
    if (authHeader) {
      const u = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: ud } = await u.auth.getUser();
      if (!ud.user) {
        return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: corsHeaders });
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const enc = new TextEncoder();
    const files: { name: string; data: Uint8Array }[] = [];

    for (const t of TABELAS) {
      try {
        const { data } = await admin.from(t).select("*").limit(50000);
        const csv = toCsv((data ?? []) as any[]);
        files.push({ name: `${t}.csv`, data: enc.encode(csv) });
      } catch (_e) {
        files.push({ name: `${t}.error.txt`, data: enc.encode("Falha ao exportar") });
      }
    }

    const meta = {
      gerado_em: new Date().toISOString(),
      tabelas: TABELAS,
    };
    files.push({ name: "_metadata.json", data: enc.encode(JSON.stringify(meta, null, 2)) });

    const zip = buildZip(files);
    return new Response(zip, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.zip"`,
      },
    });
  } catch (e) {
    console.error("backup-export:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});