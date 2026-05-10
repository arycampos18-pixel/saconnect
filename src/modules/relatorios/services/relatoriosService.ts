import { supabase } from "@/integrations/supabase/client";

export type Periodo = "7d" | "30d" | "90d" | "ano";

export type RelatorioGeral = {
  eleitores: {
    total: number;
    novosPeriodo: number;
    porBairro: { nome: string; total: number }[];
    porCidade: { nome: string; total: number }[];
    porGenero: { nome: string; total: number }[];
    porOrigem: { nome: string; total: number }[];
    porLideranca: { nome: string; total: number }[];
    porTag: { nome: string; cor: string; total: number }[];
    serieDiaria: { dia: string; total: number }[];
  };
  eventos: {
    total: number;
    porStatus: { nome: string; total: number }[];
    porTipo: { nome: string; total: number }[];
    proximos: { id: string; nome: string; data_hora: string; local: string }[];
    inscritos: number;
    presentes: number;
  };
  pesquisas: {
    total: number;
    ativas: number;
    respostas: number;
    sessoes: number;
    porStatus: { nome: string; total: number }[];
  };
  comunicacao: {
    totalEnvios: number;
    destinatarios: number;
    porCanal: { nome: string; total: number }[];
  };
};

function diasAtras(p: Periodo): number {
  switch (p) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "ano": return 365;
  }
}

function inicioPeriodo(p: Periodo): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras(p) + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function contar<T>(rows: T[], pick: (r: T) => string | null | undefined) {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const k = (pick(r) ?? "").trim();
    if (!k) return;
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

export const relatoriosService = {
  async carregar(periodo: Periodo = "30d"): Promise<RelatorioGeral> {
    const desde = inicioPeriodo(periodo);

    const [
      eleitoresRes,
      eventosRes,
      inscricoesRes,
      pesquisasRes,
      respostasRes,
      mensagensRes,
      tagsRel,
    ] = await Promise.all([
      supabase
        .from("eleitores")
        .select("id, bairro, cidade, genero, origem, created_at, lideranca:liderancas!eleitores_lideranca_id_fkey(nome)")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("eventos").select("id, nome, tipo, status, data_hora, local").limit(1000),
      supabase.from("evento_inscricoes").select("id, presente").limit(1000),
      supabase.from("pesquisas").select("id, status").limit(1000),
      supabase.from("pesquisa_respostas").select("id, sessao_id").limit(1000),
      supabase
        .from("mensagens")
        .select("id, canal, total_destinatarios, created_at")
        .gte("created_at", desde)
        .limit(1000),
      supabase.from("eleitor_tags").select("tag:tags(id, nome, cor)").limit(1000),
    ]);

    if (eleitoresRes.error) throw eleitoresRes.error;
    if (eventosRes.error) throw eventosRes.error;
    if (inscricoesRes.error) throw inscricoesRes.error;
    if (pesquisasRes.error) throw pesquisasRes.error;
    if (respostasRes.error) throw respostasRes.error;
    if (mensagensRes.error) throw mensagensRes.error;
    if (tagsRel.error) throw tagsRel.error;

    const eleitores = (eleitoresRes.data ?? []) as any[];
    const eventos = (eventosRes.data ?? []) as any[];
    const inscricoes = (inscricoesRes.data ?? []) as any[];
    const pesquisas = (pesquisasRes.data ?? []) as any[];
    const respostas = (respostasRes.data ?? []) as any[];
    const mensagens = (mensagensRes.data ?? []) as any[];
    const tagsRows = (tagsRel.data ?? []) as any[];

    // Série diária
    const dias = diasAtras(periodo);
    const buckets: Record<string, number> = {};
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    eleitores.forEach((e) => {
      const k = (e.created_at as string).slice(0, 10);
      if (k in buckets) buckets[k]++;
    });
    const serieDiaria = Object.entries(buckets).map(([k, total]) => ({
      dia: new Date(k).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      total,
    }));

    // Tags
    const tagsMap = new Map<string, { nome: string; cor: string; total: number }>();
    tagsRows.forEach((row) => {
      const t = row.tag;
      if (!t) return;
      const cur = tagsMap.get(t.id);
      if (cur) cur.total++;
      else tagsMap.set(t.id, { nome: t.nome, cor: t.cor, total: 1 });
    });

    const novosPeriodo = eleitores.filter((e) => e.created_at >= desde).length;

    const proximos = eventos
      .filter((e) => new Date(e.data_hora) >= new Date())
      .sort((a, b) => +new Date(a.data_hora) - +new Date(b.data_hora))
      .slice(0, 5)
      .map((e) => ({ id: e.id, nome: e.nome, data_hora: e.data_hora, local: e.local }));

    return {
      eleitores: {
        total: eleitores.length,
        novosPeriodo,
        porBairro: contar(eleitores, (e: any) => e.bairro).slice(0, 10),
        porCidade: contar(eleitores, (e: any) => e.cidade).slice(0, 10),
        porGenero: contar(eleitores, (e: any) => e.genero),
        porOrigem: contar(eleitores, (e: any) => e.origem),
        porLideranca: contar(eleitores, (e: any) => e.lideranca?.nome).slice(0, 10),
        porTag: Array.from(tagsMap.values()).sort((a, b) => b.total - a.total),
        serieDiaria,
      },
      eventos: {
        total: eventos.length,
        porStatus: contar(eventos, (e: any) => e.status),
        porTipo: contar(eventos, (e: any) => e.tipo),
        proximos,
        inscritos: inscricoes.length,
        presentes: inscricoes.filter((i) => i.presente).length,
      },
      pesquisas: {
        total: pesquisas.length,
        ativas: pesquisas.filter((p) => p.status === "Ativa").length,
        respostas: respostas.length,
        sessoes: new Set(respostas.map((r) => r.sessao_id)).size,
        porStatus: contar(pesquisas, (p: any) => p.status),
      },
      comunicacao: {
        totalEnvios: mensagens.length,
        destinatarios: mensagens.reduce((s, m) => s + (m.total_destinatarios ?? 0), 0),
        porCanal: contar(mensagens, (m: any) => m.canal),
      },
    };
  },
};

// ============== Drill-down ==============

export type DrillDimensao =
  | "bairro"
  | "cidade"
  | "genero"
  | "origem"
  | "lideranca"
  | "tag"
  | "evento_status"
  | "evento_tipo"
  | "pesquisa_status"
  | "comunicacao_canal";

export type DrillRow = {
  id: string;
  titulo: string;
  subtitulo?: string;
  meta?: string;
  /** ISO date used for client-side date filtering */
  data?: string;
};

export const drillService = {
  async buscar(dimensao: DrillDimensao, valor: string): Promise<DrillRow[]> {
    if (
      dimensao === "bairro" || dimensao === "cidade" ||
      dimensao === "genero" || dimensao === "origem"
    ) {
      const col = dimensao;
      const { data, error } = await supabase
        .from("eleitores")
        .select("id, nome, telefone, bairro, cidade, created_at")
        .eq(col, valor)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        id: e.id,
        titulo: e.nome,
        subtitulo: [e.telefone, [e.bairro, e.cidade].filter(Boolean).join(" / ")].filter(Boolean).join(" · "),
        meta: new Date(e.created_at).toLocaleDateString("pt-BR"),
        data: e.created_at,
      }));
    }

    if (dimensao === "lideranca") {
      const { data: lid, error: le } = await supabase
        .from("liderancas").select("id").eq("nome", valor).maybeSingle();
      if (le) throw le;
      if (!lid) return [];
      const { data, error } = await supabase
        .from("eleitores")
        .select("id, nome, telefone, bairro, cidade, created_at")
        .eq("lideranca_id", lid.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        id: e.id,
        titulo: e.nome,
        subtitulo: [e.telefone, [e.bairro, e.cidade].filter(Boolean).join(" / ")].filter(Boolean).join(" · "),
        meta: new Date(e.created_at).toLocaleDateString("pt-BR"),
        data: e.created_at,
      }));
    }

    if (dimensao === "tag") {
      const { data: tag, error: te } = await supabase
        .from("tags").select("id").eq("nome", valor).maybeSingle();
      if (te) throw te;
      if (!tag) return [];
      const { data, error } = await supabase
        .from("eleitor_tags")
        .select("eleitor:eleitores(id, nome, telefone, bairro, cidade, created_at)")
        .eq("tag_id", tag.id)
        .limit(500);
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => row.eleitor)
        .filter(Boolean)
        .map((e: any) => ({
          id: e.id,
          titulo: e.nome,
          subtitulo: [e.telefone, [e.bairro, e.cidade].filter(Boolean).join(" / ")].filter(Boolean).join(" · "),
          meta: new Date(e.created_at).toLocaleDateString("pt-BR"),
          data: e.created_at,
        }));
    }

    if (dimensao === "evento_status" || dimensao === "evento_tipo") {
      const q = supabase
        .from("eventos")
        .select("id, nome, local, data_hora, status, tipo");
      const filtered = dimensao === "evento_status"
        ? q.eq("status", valor as any)
        : q.eq("tipo", valor as any);
      const { data, error } = await filtered
        .order("data_hora", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        id: e.id,
        titulo: e.nome,
        subtitulo: e.local,
        meta: new Date(e.data_hora).toLocaleString("pt-BR"),
        data: e.data_hora,
      }));
    }

    if (dimensao === "pesquisa_status") {
      const { data, error } = await supabase
        .from("pesquisas")
        .select("id, titulo, tipo, status, created_at")
        .eq("status", valor as any)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id,
        titulo: p.titulo,
        subtitulo: p.tipo,
        meta: new Date(p.created_at).toLocaleDateString("pt-BR"),
        data: p.created_at,
      }));
    }

    if (dimensao === "comunicacao_canal") {
      const { data, error } = await supabase
        .from("mensagens")
        .select("id, canal, conteudo, total_destinatarios, created_at, status")
        .eq("canal", valor)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        id: m.id,
        titulo: (m.conteudo ?? "").slice(0, 80) || "(sem conteúdo)",
        subtitulo: `${m.canal} · ${m.total_destinatarios ?? 0} destinatário(s) · ${m.status}`,
        meta: new Date(m.created_at).toLocaleString("pt-BR"),
        data: m.created_at,
      }));
    }

    return [];
  },
};