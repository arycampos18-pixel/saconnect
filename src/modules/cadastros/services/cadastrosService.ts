import { supabase } from "@/integrations/supabase/client";

export type Organizacao = {
  id: string;
  nome: string;
  tipo: string;
  cidade: string | null;
  uf: string | null;
  responsavel_id: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

export type AppRole = "admin" | "lideranca" | "operador";

export type Lideranca = {
  id: string;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  meta: number;
  ativo: boolean;
  superior_id: string | null;
  organizacao_id: string | null;
  user_id: string | null;
  created_at: string;
};

export type Cabo = {
  id: string;
  nome: string;
  telefone: string | null;
  lideranca_id: string;
  meta: number;
  ativo: boolean;
  user_id: string | null;
  created_at: string;
};

export const cadastrosService = {
  // ------- Lideranças -------
  async listarLiderancas(): Promise<Lideranca[]> {
    const { data, error } = await supabase
      .from("liderancas")
      .select("id, nome, telefone, cidade, meta, ativo, superior_id, organizacao_id, user_id, created_at")
      .order("nome");
    if (error) throw error;
    return (data ?? []) as Lideranca[];
  },

  async criarLideranca(input: Partial<Lideranca>) {
    const { data: auth } = await supabase.auth.getUser();
    const payload: any = {
      nome: input.nome!,
      telefone: input.telefone ?? null,
      cidade: input.cidade ?? null,
      meta: input.meta ?? 100,
      ativo: input.ativo ?? true,
      superior_id: input.superior_id ?? null,
      organizacao_id: input.organizacao_id ?? null,
      created_by: auth.user?.id ?? null,
    };
    const { data, error } = await supabase
      .from("liderancas")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async atualizarLideranca(id: string, input: Partial<Lideranca>) {
    const { data, error } = await supabase
      .from("liderancas")
      .update(input as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removerLideranca(id: string) {
    const { error } = await supabase.from("liderancas").delete().eq("id", id);
    if (error) throw error;
  },

  // ------- Cabos -------
  async listarCabos(): Promise<Cabo[]> {
    const { data, error } = await supabase
      .from("cabos_eleitorais")
      .select("id, nome, telefone, lideranca_id, meta, ativo, user_id, created_at")
      .order("nome");
    if (error) throw error;
    return (data ?? []) as Cabo[];
  },

  async criarCabo(input: Partial<Cabo>) {
    const { data: auth } = await supabase.auth.getUser();
    const payload: any = {
      nome: input.nome!,
      telefone: input.telefone ?? null,
      lideranca_id: input.lideranca_id!,
      meta: input.meta ?? 50,
      ativo: input.ativo ?? true,
      created_by: auth.user?.id ?? null,
    };
    const { data, error } = await supabase
      .from("cabos_eleitorais")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async atualizarCabo(id: string, input: Partial<Cabo>) {
    const { data, error } = await supabase
      .from("cabos_eleitorais")
      .update(input as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removerCabo(id: string) {
    const { error } = await supabase.from("cabos_eleitorais").delete().eq("id", id);
    if (error) throw error;
  },

  // ------- Usuários (profiles + roles) -------
  async listarUsuarios() {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, user_id, nome, email, telefone, cargo, ativo, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const userIds = (profiles ?? []).map((p) => p.user_id);
    let roles: { user_id: string; role: string }[] = [];
    if (userIds.length) {
      const { data: r } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      roles = (r ?? []) as any;
    }
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: roles.filter((r) => r.user_id === p.user_id).map((r) => r.role),
    }));
  },

  async atualizarUsuario(id: string, input: { nome?: string; telefone?: string | null; cargo?: string | null; ativo?: boolean }) {
    const { data, error } = await supabase
      .from("profiles")
      .update(input)
      .eq("id", id)
      .select("id, user_id, nome, email, telefone, cargo, ativo, created_at")
      .single();
    if (error) throw error;
    return data;
  },

  async metricasResumo() {
    const [u, ca, l, o] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("cabos_eleitorais").select("id", { count: "exact", head: true }),
      supabase.from("liderancas").select("id", { count: "exact", head: true }),
      supabase.from("organizacoes").select("id", { count: "exact", head: true }),
    ]);
    return {
      usuarios: u.count ?? 0,
      cabos: ca.count ?? 0,
      liderancas: l.count ?? 0,
      organizacoes: o.count ?? 0,
    };
  },

  // ------- Organizações -------
  async listarOrganizacoes(): Promise<Organizacao[]> {
    const { data, error } = await supabase
      .from("organizacoes")
      .select("id, nome, tipo, cidade, uf, responsavel_id, observacoes, ativo, created_at")
      .order("nome");
    if (error) throw error;
    return (data ?? []) as Organizacao[];
  },

  async criarOrganizacao(input: Partial<Organizacao>) {
    const { data: auth } = await supabase.auth.getUser();
    const payload: any = {
      nome: input.nome!,
      tipo: input.tipo ?? "Gabinete",
      cidade: input.cidade ?? null,
      uf: input.uf ?? null,
      responsavel_id: input.responsavel_id ?? null,
      observacoes: input.observacoes ?? null,
      ativo: input.ativo ?? true,
      created_by: auth.user?.id ?? null,
    };
    const { data, error } = await supabase
      .from("organizacoes")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async atualizarOrganizacao(id: string, input: Partial<Organizacao>) {
    const { data, error } = await supabase
      .from("organizacoes")
      .update(input as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removerOrganizacao(id: string) {
    const { error } = await supabase.from("organizacoes").delete().eq("id", id);
    if (error) throw error;
  },

  // ------- Permissões (user_roles) -------
  async definirRole(userId: string, role: AppRole) {
    // remove roles anteriores do usuário e define a nova (papel único)
    const { error: delErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw delErr;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (error) throw error;
  },
};