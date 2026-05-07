import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

export type LiderancaStat = {
  id: string;
  nome: string;
  status: string;
  regiao: string | null;
  total_cabos: number;
  total_eleitores: number;
  cadastros_30d: number;
};

export type CaboStat = {
  id: string;
  nome: string;
  status: string;
  zona: string | null;
  lideranca_id: string | null;
  lideranca_nome: string | null;
  total_eleitores: number;
  cadastros_30d: number;
  via_link: number;
  via_qrcode: number;
  manual: number;
};

export type SerieDia = { dia: string; cadastros: number };

function startOfDays(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const hierarquiaDashboardService = {
  async resumoGeral() {
    const since = startOfDays(29).toISOString();
    const [lid, cab, ele, ele30, links] = await Promise.all([
      sb.from("liderancas").select("id", { count: "exact", head: true }),
      sb.from("cabos_eleitorais").select("id", { count: "exact", head: true }),
      sb.from("eleitores").select("id", { count: "exact", head: true }).not("cabo_eleitoral_id", "is", null),
      sb.from("eleitores").select("id", { count: "exact", head: true })
        .not("cabo_eleitoral_id", "is", null).gte("created_at", since),
      sb.from("cabo_links_captacao").select("total_cadastros").eq("ativo", true),
    ]);
    const totalCaptacaoLinks = (links.data ?? []).reduce(
      (a: number, l: any) => a + (l.total_cadastros ?? 0), 0,
    );
    return {
      totalLiderancas: lid.count ?? 0,
      totalCabos: cab.count ?? 0,
      totalEleitoresHierarquia: ele.count ?? 0,
      cadastros30d: ele30.count ?? 0,
      totalCaptacaoLinks,
    };
  },

  async statsPorLideranca(): Promise<LiderancaStat[]> {
    const since = startOfDays(29).toISOString();
    const [{ data: lids }, { data: cabos }, { data: eleitores }] = await Promise.all([
      sb.from("liderancas").select("id, nome, status, regiao").order("nome"),
      sb.from("cabos_eleitorais").select("id, lideranca_id"),
      sb.from("eleitores").select("lideranca_id, created_at")
        .not("lideranca_id", "is", null).limit(10000),
    ]);
    const cabosBy: Record<string, number> = {};
    (cabos ?? []).forEach((c: any) => {
      if (c.lideranca_id) cabosBy[c.lideranca_id] = (cabosBy[c.lideranca_id] ?? 0) + 1;
    });
    const elBy: Record<string, number> = {};
    const el30By: Record<string, number> = {};
    (eleitores ?? []).forEach((e: any) => {
      elBy[e.lideranca_id] = (elBy[e.lideranca_id] ?? 0) + 1;
      if (e.created_at >= since) el30By[e.lideranca_id] = (el30By[e.lideranca_id] ?? 0) + 1;
    });
    return (lids ?? []).map((l: any) => ({
      id: l.id, nome: l.nome, status: l.status, regiao: l.regiao,
      total_cabos: cabosBy[l.id] ?? 0,
      total_eleitores: elBy[l.id] ?? 0,
      cadastros_30d: el30By[l.id] ?? 0,
    }));
  },

  async statsPorCabo(liderancaId?: string): Promise<CaboStat[]> {
    const since = startOfDays(29).toISOString();
    let cq = sb.from("cabos_eleitorais")
      .select("id, nome, status, zona, lideranca_id, lideranca:liderancas(id, nome)")
      .order("nome");
    if (liderancaId) cq = cq.eq("lideranca_id", liderancaId);
    const { data: cabos } = await cq;
    const { data: eleitores } = await sb.from("eleitores")
      .select("cabo_eleitoral_id, origem, created_at")
      .not("cabo_eleitoral_id", "is", null).limit(10000);

    const stats: Record<string, Omit<CaboStat, "id" | "nome" | "status" | "zona" | "lideranca_id" | "lideranca_nome">> = {};
    (eleitores ?? []).forEach((e: any) => {
      const k = e.cabo_eleitoral_id;
      if (!stats[k]) stats[k] = { total_eleitores: 0, cadastros_30d: 0, via_link: 0, via_qrcode: 0, manual: 0 };
      stats[k].total_eleitores++;
      if (e.created_at >= since) stats[k].cadastros_30d++;
      if (e.origem === "Link Cabo") stats[k].via_link++;
      else if (e.origem === "QR Cabo") stats[k].via_qrcode++;
      else if (e.origem === "Manual Cabo") stats[k].manual++;
    });

    return (cabos ?? []).map((c: any) => ({
      id: c.id, nome: c.nome, status: c.status, zona: c.zona,
      lideranca_id: c.lideranca_id,
      lideranca_nome: c.lideranca?.nome ?? null,
      ...(stats[c.id] ?? { total_eleitores: 0, cadastros_30d: 0, via_link: 0, via_qrcode: 0, manual: 0 }),
    }));
  },

  async serieCadastros30d(filtros?: { liderancaId?: string; caboId?: string }): Promise<SerieDia[]> {
    const since = startOfDays(29);
    let q = sb.from("eleitores").select("created_at, lideranca_id, cabo_eleitoral_id")
      .gte("created_at", since.toISOString()).limit(10000);
    if (filtros?.liderancaId) q = q.eq("lideranca_id", filtros.liderancaId);
    if (filtros?.caboId) q = q.eq("cabo_eleitoral_id", filtros.caboId);
    const { data } = await q;
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    (data ?? []).forEach((r: any) => {
      const k = r.created_at.slice(0, 10);
      if (k in buckets) buckets[k]++;
    });
    return Object.entries(buckets).map(([k, v]) => ({
      dia: new Date(k).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      cadastros: v,
    }));
  },

  async serieMeuCabo7d(caboId: string): Promise<SerieDia[]> {
    const since = startOfDays(6);
    const { data } = await sb.from("eleitores")
      .select("created_at").eq("cabo_eleitoral_id", caboId)
      .gte("created_at", since.toISOString()).limit(5000);
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    (data ?? []).forEach((r: any) => {
      const k = r.created_at.slice(0, 10);
      if (k in buckets) buckets[k]++;
    });
    return Object.entries(buckets).map(([k, v]) => ({
      dia: new Date(k).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      cadastros: v,
    }));
  },
};