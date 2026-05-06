import { supabase } from "@/integrations/supabase/client";

export interface Badge {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  criterio: string | null;
  pontos: number;
  ativo: boolean;
}

export interface Desafio {
  id: string;
  titulo: string;
  descricao: string | null;
  meta: number;
  metrica: string;
  recompensa_pontos: number;
  badge_id: string | null;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
}

export interface RankingItem {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  cargo: string | null;
  pontos_total: number;
  badges_count: number;
  nivel: number;
  nivel_label: string;
}

export const NIVEIS = [
  { min: 0, label: "Iniciante" },
  { min: 100, label: "Engajado" },
  { min: 300, label: "Mobilizador" },
  { min: 700, label: "Líder" },
  { min: 1500, label: "Mestre" },
];

export function calcNivel(pontos: number) {
  let nivel = 1;
  let label = NIVEIS[0].label;
  for (let i = 0; i < NIVEIS.length; i++) {
    if (pontos >= NIVEIS[i].min) {
      nivel = i + 1;
      label = NIVEIS[i].label;
    }
  }
  const proximo = NIVEIS[nivel] ?? null;
  return { nivel, label, proximoMin: proximo?.min ?? null };
}

export const gamificacaoService = {
  async listarBadges(): Promise<Badge[]> {
    const { data, error } = await supabase
      .from("gamificacao_badges")
      .select("*")
      .order("pontos", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Badge[];
  },

  async listarDesafios(): Promise<Desafio[]> {
    const { data, error } = await supabase
      .from("gamificacao_desafios")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Desafio[];
  },

  async criarDesafio(payload: Partial<Desafio>) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("gamificacao_desafios")
      .insert({ ...payload, created_by: userData.user?.id } as any);
    if (error) throw error;
  },

  async toggleDesafio(id: string, ativo: boolean) {
    const { error } = await supabase
      .from("gamificacao_desafios")
      .update({ ativo })
      .eq("id", id);
    if (error) throw error;
  },

  async removerDesafio(id: string) {
    const { error } = await supabase.from("gamificacao_desafios").delete().eq("id", id);
    if (error) throw error;
  },

  async ranking(): Promise<RankingItem[]> {
    const [pts, profs, conqs] = await Promise.all([
      supabase.from("gamificacao_pontuacoes").select("user_id, pontos"),
      supabase.from("profiles").select("user_id, nome, avatar_url, cargo"),
      supabase.from("gamificacao_badges_conquistadas").select("user_id"),
    ]);
    if (pts.error) throw pts.error;
    if (profs.error) throw profs.error;

    const totals = new Map<string, number>();
    (pts.data ?? []).forEach((p: any) => {
      totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.pontos ?? 0));
    });
    const badgeCounts = new Map<string, number>();
    (conqs.data ?? []).forEach((c: any) => {
      badgeCounts.set(c.user_id, (badgeCounts.get(c.user_id) ?? 0) + 1);
    });

    const items: RankingItem[] = (profs.data ?? []).map((p: any) => {
      const total = totals.get(p.user_id) ?? 0;
      const { nivel, label } = calcNivel(total);
      return {
        user_id: p.user_id,
        nome: p.nome,
        avatar_url: p.avatar_url,
        cargo: p.cargo,
        pontos_total: total,
        badges_count: badgeCounts.get(p.user_id) ?? 0,
        nivel,
        nivel_label: label,
      };
    });
    return items.sort((a, b) => b.pontos_total - a.pontos_total);
  },

  async badgesDoUsuario(userId: string) {
    const { data, error } = await supabase
      .from("gamificacao_badges_conquistadas")
      .select("*, badge:gamificacao_badges(*)")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  },

  async meuResumo(userId: string) {
    const [pts, conqs] = await Promise.all([
      supabase.from("gamificacao_pontuacoes").select("pontos, motivo, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("gamificacao_badges_conquistadas").select("conquistada_em, badge:gamificacao_badges(*)").eq("user_id", userId),
    ]);
    if (pts.error) throw pts.error;
    if (conqs.error) throw conqs.error;
    const total = (pts.data ?? []).reduce((acc: number, p: any) => acc + (p.pontos ?? 0), 0);
    return {
      total,
      ...calcNivel(total),
      historico: pts.data ?? [],
      badges: conqs.data ?? [],
    };
  },
};