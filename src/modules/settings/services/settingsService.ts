import { supabase } from "@/integrations/supabase/client";

export interface SettingsCompany {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string | null;
  status: "active" | "inactive" | "suspended";
  plan: string;
  created_at: string;
}

export interface SettingsUser {
  id: string;
  nome: string;
  email: string;
  status: "active" | "inactive";
  is_super_admin: boolean;
  created_at: string;
}

export interface SettingsProfile {
  id: string;
  company_id: string | null;
  nome: string;
  descricao: string | null;
  is_system_default: boolean;
}

export interface SettingsPermission {
  id: string;
  module: string;
  description: string;
}

export interface UserCompanyLink {
  user_id: string;
  company_id: string;
  profile_id: string | null;
  is_default: boolean;
  status: string;
  settings_companies?: SettingsCompany;
  settings_users?: SettingsUser;
  settings_profiles?: SettingsProfile;
}

export interface AuditLog {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
}

export interface SettingsGlobalRow {
  company_id: string;
  system_name: string;
  timezone: string;
  active_modules: string[];
  feature_flags: Record<string, any>;
}

const sb: any = supabase;

export const settingsService = {
  // ---------- Empresas ----------
  async listarEmpresas(): Promise<SettingsCompany[]> {
    const { data, error } = await sb.from("settings_companies").select("*").order("created_at");
    if (error) throw error;
    return data ?? [];
  },
  async criarEmpresa(input: Partial<SettingsCompany>) {
    const { data, error } = await sb.from("settings_companies").insert(input).select().single();
    if (error) throw error;
    // cria settings_global default
    await sb.from("settings_global").insert({ company_id: data.id }).select();
    return data;
  },
  async atualizarEmpresa(id: string, patch: Partial<SettingsCompany>) {
    const { error } = await sb.from("settings_companies").update(patch).eq("id", id);
    if (error) throw error;
  },
  async removerEmpresa(id: string) {
    const { error } = await sb.from("settings_companies").delete().eq("id", id);
    if (error) throw error;
  },

  // ---------- Usuários ----------
  async listarUsuariosDaEmpresa(companyId: string) {
    const { data, error } = await sb
      .from("settings_user_companies")
      .select("user_id, profile_id, is_default, status, settings_users(*), settings_profiles(*)")
      .eq("company_id", companyId);
    if (error) throw error;
    return data ?? [];
  },
  async listarEmpresasDoUsuario(userId: string) {
    const { data, error } = await sb
      .from("settings_user_companies")
      .select("company_id, profile_id, is_default, status, settings_companies(*)")
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) throw error;
    return (data ?? []) as UserCompanyLink[];
  },
  async vincularUsuarioEmpresa(userId: string, companyId: string, profileId: string | null) {
    const { error } = await sb
      .from("settings_user_companies")
      .upsert({ user_id: userId, company_id: companyId, profile_id: profileId, status: "active" });
    if (error) throw error;
  },
  async desvincularUsuario(userId: string, companyId: string) {
    const { error } = await sb
      .from("settings_user_companies")
      .delete()
      .eq("user_id", userId)
      .eq("company_id", companyId);
    if (error) throw error;
  },
  /** Marca uma empresa como padrão para o usuário (demais vínculos perdem is_default). */
  async definirEmpresaPadraoDoUsuario(userId: string, companyId: string) {
    const { error: e1 } = await sb.from("settings_user_companies").update({ is_default: false }).eq("user_id", userId);
    if (e1) throw e1;
    const { error: e2 } = await sb
      .from("settings_user_companies")
      .update({ is_default: true })
      .eq("user_id", userId)
      .eq("company_id", companyId);
    if (e2) throw e2;
  },
  /** Visão global de vínculos (depende de RLS — tipicamente super admin). */
  async listarTodosVinculosUsuarioEmpresa(limit = 500) {
    const { data, error } = await sb
      .from("settings_user_companies")
      .select(
        "user_id, company_id, profile_id, is_default, status, settings_users(nome,email,status,is_super_admin), settings_companies(nome_fantasia,razao_social), settings_profiles(nome)",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
  async atualizarStatusUsuario(userId: string, status: "active" | "inactive") {
    const { error } = await sb.from("settings_users").update({ status }).eq("id", userId);
    if (error) throw error;
  },
  async atualizarUsuario(userId: string, patch: Partial<SettingsUser>) {
    const { error } = await sb.from("settings_users").update(patch).eq("id", userId);
    if (error) throw error;
  },

  /** Nome e e-mail em `settings_users` e `profiles` (login Auth é separado). */
  async atualizarCadastroUsuario(userId: string, input: { nome: string; email: string }) {
    const nome = input.nome.trim();
    const email = input.email.trim();
    if (!nome) throw new Error("Nome é obrigatório.");
    if (!email.includes("@")) throw new Error("E-mail inválido.");
    const { error: e1 } = await sb.from("settings_users").update({ nome, email }).eq("id", userId);
    if (e1) throw e1;
    const { error: e2 } = await sb.from("profiles").update({ nome, email }).eq("user_id", userId);
    if (e2) throw e2;
  },

  // ---------- Perfis & Permissões ----------
  async listarPerfis(companyId: string): Promise<SettingsProfile[]> {
    const { data, error } = await sb
      .from("settings_profiles")
      .select("*")
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
  async criarPerfil(input: Partial<SettingsProfile>) {
    const { data, error } = await sb.from("settings_profiles").insert(input).select().single();
    if (error) throw error;
    return data;
  },
  async atualizarPerfil(id: string, patch: Partial<SettingsProfile>) {
    const { error } = await sb.from("settings_profiles").update(patch).eq("id", id);
    if (error) throw error;
  },
  async removerPerfil(id: string) {
    const { error } = await sb.from("settings_profiles").delete().eq("id", id);
    if (error) throw error;
  },
  async listarPermissoes(): Promise<SettingsPermission[]> {
    const { data, error } = await sb.from("settings_permissions").select("*").order("module").order("id");
    if (error) throw error;
    return data ?? [];
  },
  async permissoesDoPerfil(profileId: string): Promise<string[]> {
    const { data, error } = await sb
      .from("settings_profile_permissions")
      .select("permission_id")
      .eq("profile_id", profileId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.permission_id);
  },
  async definirPermissoesDoPerfil(profileId: string, permissionIds: string[]) {
    const { error: delErr } = await sb
      .from("settings_profile_permissions")
      .delete()
      .eq("profile_id", profileId);
    if (delErr) throw delErr;
    if (!permissionIds.length) return;
    const rows = permissionIds.map((p) => ({ profile_id: profileId, permission_id: p }));
    const { error } = await sb.from("settings_profile_permissions").insert(rows);
    if (error) throw error;
  },

  // ---------- Auditoria ----------
  async listarLogs(companyId?: string | null, limit = 200): Promise<AuditLog[]> {
    let q = sb.from("settings_audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (companyId) q = q.eq("company_id", companyId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
  async registrarLog(log: Partial<AuditLog>) {
    const { error } = await sb.from("settings_audit_logs").insert(log);
    if (error) console.warn("audit log error", error);
  },

  // ---------- Configurações globais ----------
  async obterGlobal(companyId: string): Promise<SettingsGlobalRow | null> {
    const { data, error } = await sb
      .from("settings_global")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async salvarGlobal(companyId: string, patch: Partial<SettingsGlobalRow>) {
    const { error } = await sb
      .from("settings_global")
      .upsert({ company_id: companyId, ...patch });
    if (error) throw error;
  },
};