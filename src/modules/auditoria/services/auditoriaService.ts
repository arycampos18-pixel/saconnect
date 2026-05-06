import { supabase } from "@/integrations/supabase/client";

export type AuditAcao =
  | "Criar"
  | "Editar"
  | "Excluir"
  | "Login"
  | "Logout"
  | "Exportar"
  | "Importar"
  | "Aprovar"
  | "Rejeitar"
  | "Outro";

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_nome: string | null;
  user_email: string | null;
  acao: AuditAcao;
  entidade: string;
  entidade_id: string | null;
  descricao: string | null;
  dados_anteriores: any;
  dados_novos: any;
  ip_address: string | null;
  user_agent: string | null;
  modulo: string | null;
  created_at: string;
}

export interface RegistrarLogInput {
  acao: AuditAcao;
  entidade: string;
  entidade_id?: string | null;
  descricao?: string;
  modulo?: string;
  dados_anteriores?: any;
  dados_novos?: any;
}

export const auditoriaService = {
  async registrar(input: RegistrarLogInput): Promise<void> {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      let nome: string | null = null;
      let email: string | null = user?.email ?? null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nome, email")
          .eq("user_id", user.id)
          .maybeSingle();
        nome = profile?.nome ?? null;
        email = profile?.email ?? email;
      }
      await supabase.from("audit_logs").insert({
        user_id: user?.id ?? null,
        user_nome: nome,
        user_email: email,
        acao: input.acao,
        entidade: input.entidade,
        entidade_id: input.entidade_id ?? null,
        descricao: input.descricao ?? null,
        modulo: input.modulo ?? null,
        dados_anteriores: input.dados_anteriores ?? null,
        dados_novos: input.dados_novos ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
    } catch (e) {
      console.warn("[auditoria] falha ao registrar log", e);
    }
  },

  async listar(filtros?: {
    acao?: AuditAcao;
    entidade?: string;
    user_id?: string;
    busca?: string;
    desde?: string;
    ate?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    let q = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(filtros?.limit ?? 500);

    if (filtros?.acao) q = q.eq("acao", filtros.acao);
    if (filtros?.entidade) q = q.eq("entidade", filtros.entidade);
    if (filtros?.user_id) q = q.eq("user_id", filtros.user_id);
    if (filtros?.desde) q = q.gte("created_at", filtros.desde);
    if (filtros?.ate) q = q.lte("created_at", filtros.ate);
    if (filtros?.busca) {
      q = q.or(
        `descricao.ilike.%${filtros.busca}%,user_nome.ilike.%${filtros.busca}%,user_email.ilike.%${filtros.busca}%`
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as AuditLog[];
  },

  async metricas() {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("acao, entidade, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;

    const total = data?.length ?? 0;
    const porAcao: Record<string, number> = {};
    const porEntidade: Record<string, number> = {};
    const usuariosUnicos = new Set<string>();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let hojeCount = 0;

    (data ?? []).forEach((l: any) => {
      porAcao[l.acao] = (porAcao[l.acao] ?? 0) + 1;
      porEntidade[l.entidade] = (porEntidade[l.entidade] ?? 0) + 1;
      if (l.user_id) usuariosUnicos.add(l.user_id);
      if (new Date(l.created_at) >= hoje) hojeCount++;
    });

    return {
      total,
      hoje: hojeCount,
      usuarios: usuariosUnicos.size,
      porAcao,
      porEntidade,
    };
  },

  async exportarCSV(logs: AuditLog[]): Promise<string> {
    const header = [
      "Data",
      "Usuário",
      "Email",
      "Ação",
      "Módulo",
      "Entidade",
      "Entidade ID",
      "Descrição",
    ].join(",");
    const linhas = logs.map((l) =>
      [
        new Date(l.created_at).toLocaleString("pt-BR"),
        l.user_nome ?? "",
        l.user_email ?? "",
        l.acao,
        l.modulo ?? "",
        l.entidade,
        l.entidade_id ?? "",
        (l.descricao ?? "").replace(/[\r\n,]+/g, " "),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    return [header, ...linhas].join("\n");
  },
};