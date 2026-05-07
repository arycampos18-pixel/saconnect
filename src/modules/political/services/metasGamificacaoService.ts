import { supabase } from "@/integrations/supabase/client";
import { auditoriaService } from "@/modules/auditoria/services/auditoriaService";

const sb: any = supabase;

export type Meta = {
  id: string;
  company_id: string;
  titulo: string;
  descricao: string | null;
  tipo_periodo: "mensal" | "semanal" | "campanha";
  data_inicio: string;
  data_fim: string;
  quantidade_alvo: number;
  lideranca_id: string | null;
  cabo_eleitoral_id: string | null;
  ativo: boolean;
  created_at: string;
};

export type Badge = {
  id: string;
  company_id: string;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  criterio_tipo: "total_eleitores" | "meta_batida" | "primeiros_n";
  criterio_valor: number;
  ativo: boolean;
};

export type CaboBadge = {
  id: string;
  cabo_eleitoral_id: string;
  badge_id: string;
  conquistado_em: string;
  badge?: Badge;
};

export type RankingItem = {
  cabo_id: string;
  cabo_nome: string;
  lideranca_nome: string | null;
  total: number;
  posicao: number;
};

export type MetaProgresso = {
  meta: Meta;
  realizado: number;
  percentual: number;
};

export const metasGamificacaoService = {
  // ---------- Metas ----------
  async listarMetas(filtros?: { caboId?: string; liderancaId?: string }): Promise<Meta[]> {
    let q = sb.from("metas_captacao").select("*").order("created_at", { ascending: false });
    if (filtros?.caboId) q = q.eq("cabo_eleitoral_id", filtros.caboId);
    if (filtros?.liderancaId) q = q.eq("lideranca_id", filtros.liderancaId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
  async criarMeta(input: Partial<Meta>) {
    const { data, error } = await sb.from("metas_captacao").insert(input).select().single();
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Criar", entidade: "Meta de Captação", entidade_id: data.id,
      modulo: "Político", descricao: `Meta criada: ${data.titulo}`, dados_novos: data,
    });
    return data as Meta;
  },
  async atualizarMeta(id: string, patch: Partial<Meta>) {
    const { error } = await sb.from("metas_captacao").update(patch).eq("id", id);
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Editar", entidade: "Meta de Captação", entidade_id: id,
      modulo: "Político", descricao: `Meta atualizada`, dados_novos: patch,
    });
  },
  async removerMeta(id: string) {
    const { error } = await sb.from("metas_captacao").delete().eq("id", id);
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Excluir", entidade: "Meta de Captação", entidade_id: id,
      modulo: "Político", descricao: `Meta removida`,
    });
  },

  async progressoDaMeta(meta: Meta): Promise<MetaProgresso> {
    let q = sb.from("eleitores").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(meta.data_inicio).toISOString())
      .lte("created_at", new Date(meta.data_fim + "T23:59:59").toISOString());
    if (meta.cabo_eleitoral_id) q = q.eq("cabo_eleitoral_id", meta.cabo_eleitoral_id);
    else if (meta.lideranca_id) q = q.eq("lideranca_id", meta.lideranca_id);
    const { count, error } = await q;
    if (error) throw error;
    const realizado = count ?? 0;
    const percentual = Math.min(100, Math.round((realizado / meta.quantidade_alvo) * 100));
    return { meta, realizado, percentual };
  },

  async progressoMetasAtivas(filtros?: { caboId?: string; liderancaId?: string }): Promise<MetaProgresso[]> {
    const hoje = new Date().toISOString().split("T")[0];
    let q = sb.from("metas_captacao").select("*")
      .eq("ativo", true)
      .lte("data_inicio", hoje)
      .gte("data_fim", hoje);
    if (filtros?.caboId) q = q.eq("cabo_eleitoral_id", filtros.caboId);
    if (filtros?.liderancaId) q = q.eq("lideranca_id", filtros.liderancaId);
    const { data, error } = await q;
    if (error) throw error;
    const metas = (data ?? []) as Meta[];
    return Promise.all(metas.map((m) => this.progressoDaMeta(m)));
  },

  // ---------- Badges ----------
  async listarBadges(): Promise<Badge[]> {
    const { data, error } = await sb.from("badges_catalogo").select("*").order("criterio_valor");
    if (error) throw error;
    return data ?? [];
  },
  async criarBadge(input: Partial<Badge>) {
    const { data, error } = await sb.from("badges_catalogo").insert(input).select().single();
    if (error) throw error;
    return data as Badge;
  },
  async atualizarBadge(id: string, patch: Partial<Badge>) {
    const { error } = await sb.from("badges_catalogo").update(patch).eq("id", id);
    if (error) throw error;
  },
  async removerBadge(id: string) {
    const { error } = await sb.from("badges_catalogo").delete().eq("id", id);
    if (error) throw error;
  },

  async badgesDoCabo(caboId: string): Promise<CaboBadge[]> {
    const { data, error } = await sb.from("cabo_badges")
      .select("*, badge:badges_catalogo(*)")
      .eq("cabo_eleitoral_id", caboId)
      .order("conquistado_em", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Avalia todos os badges para um cabo e concede os elegíveis (idempotente via UNIQUE)
  async avaliarBadgesDoCabo(caboId: string, companyId: string): Promise<number> {
    const [{ count: totalEleitores }, badges, jaConquistados] = await Promise.all([
      sb.from("eleitores").select("id", { count: "exact", head: true }).eq("cabo_eleitoral_id", caboId),
      this.listarBadges(),
      this.badgesDoCabo(caboId),
    ]);
    const total = totalEleitores ?? 0;
    const conquistadosIds = new Set(jaConquistados.map((b) => b.badge_id));
    const novos: any[] = [];
    for (const b of badges) {
      if (!b.ativo || conquistadosIds.has(b.id)) continue;
      if (b.criterio_tipo === "total_eleitores" && total >= b.criterio_valor) {
        novos.push({
          cabo_eleitoral_id: caboId, badge_id: b.id, company_id: companyId,
          contexto: { total_no_momento: total },
        });
      }
    }
    if (novos.length > 0) {
      await sb.from("cabo_badges").insert(novos);
    }
    return novos.length;
  },

  // ---------- Ranking ----------
  async ranking(opts?: { liderancaId?: string; limit?: number }): Promise<RankingItem[]> {
    const { data: cabos, error: e1 } = await sb
      .from("cabos_eleitorais")
      .select("id, nome, lideranca_id, lideranca:liderancas(nome)");
    if (e1) throw e1;
    const { data: eleitores, error: e2 } = await sb
      .from("eleitores").select("cabo_eleitoral_id");
    if (e2) throw e2;

    const counts: Record<string, number> = {};
    (eleitores ?? []).forEach((e: any) => {
      if (!e.cabo_eleitoral_id) return;
      counts[e.cabo_eleitoral_id] = (counts[e.cabo_eleitoral_id] ?? 0) + 1;
    });

    let arr = (cabos ?? [])
      .filter((c: any) => !opts?.liderancaId || c.lideranca_id === opts.liderancaId)
      .map((c: any) => ({
        cabo_id: c.id,
        cabo_nome: c.nome,
        lideranca_nome: c.lideranca?.nome ?? null,
        total: counts[c.id] ?? 0,
      }))
      .sort((a, b) => b.total - a.total);

    arr = arr.slice(0, opts?.limit ?? 50).map((it, i) => ({ ...it, posicao: i + 1 }));
    return arr;
  },
};