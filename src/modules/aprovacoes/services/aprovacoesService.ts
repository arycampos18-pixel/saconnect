import { supabase } from "@/integrations/supabase/client";

export type AprovacaoStatus = "Pendente" | "Aprovado" | "Rejeitado" | "Cancelado";
export type AprovacaoTipo = "Campanha" | "Evento" | "ExclusaoEmMassa" | "EdicaoLideranca" | "Outro";

export interface Aprovacao {
  id: string;
  tipo: AprovacaoTipo;
  titulo: string;
  descricao: string | null;
  dados: any;
  status: AprovacaoStatus;
  motivo_decisao: string | null;
  solicitado_por: string | null;
  decidido_por: string | null;
  decidido_em: string | null;
  executado: boolean;
  executado_em: string | null;
  created_at: string;
  solicitante?: { nome: string; email: string } | null;
  decisor?: { nome: string; email: string } | null;
}

export const aprovacoesService = {
  async listar(filtros?: { status?: AprovacaoStatus; tipo?: AprovacaoTipo }): Promise<Aprovacao[]> {
    let q = supabase
      .from("aprovacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filtros?.status) q = q.eq("status", filtros.status);
    if (filtros?.tipo) q = q.eq("tipo", filtros.tipo);
    const { data, error } = await q;
    if (error) throw error;

    const items = (data ?? []) as any[];
    const userIds = Array.from(new Set([
      ...items.map((i) => i.solicitado_por).filter(Boolean),
      ...items.map((i) => i.decidido_por).filter(Boolean),
    ]));
    if (userIds.length === 0) return items as Aprovacao[];

    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, nome, email")
      .in("user_id", userIds);
    const map = new Map<string, { nome: string; email: string }>();
    (profs ?? []).forEach((p: any) => map.set(p.user_id, { nome: p.nome, email: p.email }));

    return items.map((i) => ({
      ...i,
      solicitante: i.solicitado_por ? map.get(i.solicitado_por) ?? null : null,
      decisor: i.decidido_por ? map.get(i.decidido_por) ?? null : null,
    })) as Aprovacao[];
  },

  async solicitar(payload: {
    tipo: AprovacaoTipo;
    titulo: string;
    descricao?: string;
    dados?: any;
  }) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("aprovacoes").insert({
      tipo: payload.tipo,
      titulo: payload.titulo,
      descricao: payload.descricao ?? null,
      dados: payload.dados ?? {},
      solicitado_por: u.user?.id ?? null,
    } as any);
    if (error) throw error;
  },

  async aprovar(id: string, motivo?: string) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("aprovacoes")
      .update({
        status: "Aprovado",
        motivo_decisao: motivo ?? null,
        decidido_por: u.user?.id ?? null,
        decidido_em: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  },

  async rejeitar(id: string, motivo: string) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("aprovacoes")
      .update({
        status: "Rejeitado",
        motivo_decisao: motivo,
        decidido_por: u.user?.id ?? null,
        decidido_em: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  },

  async cancelar(id: string) {
    const { error } = await supabase
      .from("aprovacoes")
      .update({ status: "Cancelado" })
      .eq("id", id);
    if (error) throw error;
  },

  async marcarExecutado(id: string) {
    const { error } = await supabase
      .from("aprovacoes")
      .update({ executado: true, executado_em: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async resumo() {
    const { data, error } = await supabase
      .from("aprovacoes")
      .select("status");
    if (error) throw error;
    const all = data ?? [];
    return {
      pendentes: all.filter((a: any) => a.status === "Pendente").length,
      aprovadas: all.filter((a: any) => a.status === "Aprovado").length,
      rejeitadas: all.filter((a: any) => a.status === "Rejeitado").length,
      total: all.length,
    };
  },
};