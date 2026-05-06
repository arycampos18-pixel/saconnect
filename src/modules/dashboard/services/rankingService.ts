import { supabase } from "@/integrations/supabase/client";

export type RankingLiderancaItem = {
  id: string;
  nome: string;
  meta: number;
  total: number;
  posicao: number;
  cabos: { id: string; nome: string; meta: number; cadastros: number }[];
};

export const rankingService = {
  async ranking(): Promise<RankingLiderancaItem[]> {
    const [lidRes, caboRes, eleitoresRes] = await Promise.all([
      supabase.from("liderancas").select("id, nome, meta").eq("ativo", true),
      supabase.from("cabos_eleitorais").select("id, lideranca_id, nome, meta").eq("ativo", true),
      supabase.from("eleitores").select("lideranca_id, cabo_id").limit(10000),
    ]);
    if (lidRes.error) throw lidRes.error;
    if (caboRes.error) throw caboRes.error;
    if (eleitoresRes.error) throw eleitoresRes.error;

    const totalPorLideranca: Record<string, number> = {};
    const totalPorCabo: Record<string, number> = {};
    (eleitoresRes.data ?? []).forEach((e: any) => {
      if (e.lideranca_id) totalPorLideranca[e.lideranca_id] = (totalPorLideranca[e.lideranca_id] ?? 0) + 1;
      if (e.cabo_id) totalPorCabo[e.cabo_id] = (totalPorCabo[e.cabo_id] ?? 0) + 1;
    });

    const cabosPorLid: Record<string, { id: string; nome: string; meta: number; cadastros: number }[]> = {};
    (caboRes.data ?? []).forEach((c: any) => {
      const arr = cabosPorLid[c.lideranca_id] ?? (cabosPorLid[c.lideranca_id] = []);
      arr.push({ id: c.id, nome: c.nome, meta: c.meta, cadastros: totalPorCabo[c.id] ?? 0 });
    });

    const enriched = (lidRes.data ?? []).map((l: any) => ({
      id: l.id,
      nome: l.nome,
      meta: l.meta,
      total: totalPorLideranca[l.id] ?? 0,
      cabos: cabosPorLid[l.id] ?? [],
      posicao: 0,
    }));
    enriched.sort((a, b) => b.total - a.total);
    return enriched.map((l, i) => ({ ...l, posicao: i + 1 }));
  },
};