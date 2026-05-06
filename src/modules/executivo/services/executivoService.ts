import { supabase } from "@/integrations/supabase/client";

export interface PeriodoStats {
  eleitoresNovos: number;
  eventosCriados: number;
  mensagensEnviadas: number;
  pesquisasRespostas: number;
  oportunidadesGanhas: number;
  votosGanhos: number;
}

export interface ExecutivoKPIs {
  totalEleitores: number;
  totalLiderancas: number;
  totalCabos: number;
  totalEventos: number;
  totalMensagens: number;
  totalOportunidades: number;
  totalVotosFunil: number;
  taxaConversao: number;
  consentimentoLgpdPct: number;
  eleitoresPorBairro: { bairro: string; total: number }[];
  eleitoresPorOrigem: { origem: string; total: number }[];
  evolucaoEleitores: { dia: string; total: number }[];
  periodoAtual: PeriodoStats;
  periodoAnterior: PeriodoStats;
  variacao: PeriodoStats;
}

function diasAtras(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pctVar(atual: number, anterior: number) {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return Math.round(((atual - anterior) / anterior) * 100);
}

export const executivoService = {
  async carregar(periodoDias: number = 30): Promise<ExecutivoKPIs> {
    const inicioAtual = diasAtras(periodoDias).toISOString();
    const inicioAnterior = diasAtras(periodoDias * 2).toISOString();
    const fimAnterior = diasAtras(periodoDias).toISOString();

    const [
      eleitoresAll,
      liderancas,
      cabos,
      eventos,
      mensagens,
      oportunidades,
      etapas,
      respostas,
      eventosNovos,
      mensagensNovas,
      respostasNovas,
      eventosAnt,
      mensagensAnt,
      respostasAnt,
    ] = await Promise.all([
      supabase.from("eleitores").select("id, bairro, origem, consentimento_lgpd, created_at"),
      supabase.from("liderancas").select("id", { count: "exact", head: true }),
      supabase.from("cabos_eleitorais").select("id", { count: "exact", head: true }),
      supabase.from("eventos").select("id", { count: "exact", head: true }),
      supabase.from("mensagens").select("id, total_destinatarios"),
      supabase.from("crm_oportunidades").select("id, etapa_id, valor_estimado, created_at"),
      supabase.from("crm_etapas").select("id, is_ganho"),
      supabase.from("pesquisa_respostas").select("id, created_at"),
      supabase.from("eventos").select("id", { count: "exact", head: true }).gte("created_at", inicioAtual),
      supabase.from("mensagens").select("id, total_destinatarios").gte("created_at", inicioAtual),
      supabase.from("pesquisa_respostas").select("id", { count: "exact", head: true }).gte("created_at", inicioAtual),
      supabase.from("eventos").select("id", { count: "exact", head: true }).gte("created_at", inicioAnterior).lt("created_at", fimAnterior),
      supabase.from("mensagens").select("id, total_destinatarios").gte("created_at", inicioAnterior).lt("created_at", fimAnterior),
      supabase.from("pesquisa_respostas").select("id", { count: "exact", head: true }).gte("created_at", inicioAnterior).lt("created_at", fimAnterior),
    ]);

    const els = (eleitoresAll.data ?? []) as any[];
    const totalEleitores = els.length;
    const eleitoresNovosAtual = els.filter((e) => e.created_at >= inicioAtual).length;
    const eleitoresNovosAnt = els.filter((e) => e.created_at >= inicioAnterior && e.created_at < fimAnterior).length;

    // Bairros top
    const bairroMap = new Map<string, number>();
    els.forEach((e) => {
      const b = e.bairro || "Sem bairro";
      bairroMap.set(b, (bairroMap.get(b) ?? 0) + 1);
    });
    const eleitoresPorBairro = Array.from(bairroMap.entries())
      .map(([bairro, total]) => ({ bairro, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Origens
    const origemMap = new Map<string, number>();
    els.forEach((e) => {
      const o = e.origem || "—";
      origemMap.set(o, (origemMap.get(o) ?? 0) + 1);
    });
    const eleitoresPorOrigem = Array.from(origemMap.entries()).map(([origem, total]) => ({ origem, total }));

    // Evolução diária últimos N dias
    const evolucaoMap = new Map<string, number>();
    for (let i = periodoDias - 1; i >= 0; i--) {
      const d = diasAtras(i);
      const key = d.toISOString().slice(0, 10);
      evolucaoMap.set(key, 0);
    }
    els.forEach((e) => {
      const key = String(e.created_at).slice(0, 10);
      if (evolucaoMap.has(key)) evolucaoMap.set(key, (evolucaoMap.get(key) ?? 0) + 1);
    });
    let acc = totalEleitores - eleitoresNovosAtual;
    const evolucaoEleitores = Array.from(evolucaoMap.entries()).map(([dia, qtd]) => {
      acc += qtd;
      return { dia: dia.slice(5), total: acc };
    });

    const consent = els.filter((e) => e.consentimento_lgpd).length;
    const consentimentoLgpdPct = totalEleitores > 0 ? Math.round((consent / totalEleitores) * 100) : 0;

    // Mensagens
    const totalMsgDest = (mensagens.data ?? []).reduce((a: number, m: any) => a + (m.total_destinatarios ?? 0), 0);
    const msgAtualDest = (mensagensNovas.data ?? []).reduce((a: number, m: any) => a + (m.total_destinatarios ?? 0), 0);
    const msgAntDest = (mensagensAnt.data ?? []).reduce((a: number, m: any) => a + (m.total_destinatarios ?? 0), 0);

    // Oportunidades / funil
    const ops = (oportunidades.data ?? []) as any[];
    const ganhoIds = new Set((etapas.data ?? []).filter((e: any) => e.is_ganho).map((e: any) => e.id));
    const totalVotosFunil = ops.reduce((a, o) => a + (o.valor_estimado ?? 0), 0);
    const opsGanhasAtual = ops.filter((o) => ganhoIds.has(o.etapa_id) && o.created_at >= inicioAtual);
    const opsGanhasAnt = ops.filter((o) => ganhoIds.has(o.etapa_id) && o.created_at >= inicioAnterior && o.created_at < fimAnterior);
    const votosGanhosAtual = opsGanhasAtual.reduce((a, o) => a + (o.valor_estimado ?? 0), 0);
    const votosGanhosAnt = opsGanhasAnt.reduce((a, o) => a + (o.valor_estimado ?? 0), 0);
    const totalVotosGanhos = ops.filter((o) => ganhoIds.has(o.etapa_id)).reduce((a, o) => a + (o.valor_estimado ?? 0), 0);
    const taxaConversao = totalVotosFunil > 0 ? Math.round((totalVotosGanhos / totalVotosFunil) * 100) : 0;

    const periodoAtual: PeriodoStats = {
      eleitoresNovos: eleitoresNovosAtual,
      eventosCriados: eventosNovos.count ?? 0,
      mensagensEnviadas: msgAtualDest,
      pesquisasRespostas: respostasNovas.count ?? 0,
      oportunidadesGanhas: opsGanhasAtual.length,
      votosGanhos: votosGanhosAtual,
    };
    const periodoAnterior: PeriodoStats = {
      eleitoresNovos: eleitoresNovosAnt,
      eventosCriados: eventosAnt.count ?? 0,
      mensagensEnviadas: msgAntDest,
      pesquisasRespostas: respostasAnt.count ?? 0,
      oportunidadesGanhas: opsGanhasAnt.length,
      votosGanhos: votosGanhosAnt,
    };
    const variacao: PeriodoStats = {
      eleitoresNovos: pctVar(periodoAtual.eleitoresNovos, periodoAnterior.eleitoresNovos),
      eventosCriados: pctVar(periodoAtual.eventosCriados, periodoAnterior.eventosCriados),
      mensagensEnviadas: pctVar(periodoAtual.mensagensEnviadas, periodoAnterior.mensagensEnviadas),
      pesquisasRespostas: pctVar(periodoAtual.pesquisasRespostas, periodoAnterior.pesquisasRespostas),
      oportunidadesGanhas: pctVar(periodoAtual.oportunidadesGanhas, periodoAnterior.oportunidadesGanhas),
      votosGanhos: pctVar(periodoAtual.votosGanhos, periodoAnterior.votosGanhos),
    };

    return {
      totalEleitores,
      totalLiderancas: liderancas.count ?? 0,
      totalCabos: cabos.count ?? 0,
      totalEventos: eventos.count ?? 0,
      totalMensagens: totalMsgDest,
      totalOportunidades: ops.length,
      totalVotosFunil,
      taxaConversao,
      consentimentoLgpdPct,
      eleitoresPorBairro,
      eleitoresPorOrigem,
      evolucaoEleitores,
      periodoAtual,
      periodoAnterior,
      variacao,
    };
  },
};

export function exportarCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h] ?? "";
          const s = String(v).replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportarJSON(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}