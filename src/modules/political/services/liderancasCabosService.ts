import { supabase } from "@/integrations/supabase/client";
import { auditoriaService } from "@/modules/auditoria/services/auditoriaService";

export type Lideranca = {
  id: string;
  company_id: string;
  user_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  regiao: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  cpf?: string | null;
  rg?: string | null;
  nome_mae?: string | null;
  data_nascimento?: string | null;
  genero?: string | null;
  origem?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  meta?: number;
  ativo?: boolean;
};

export type Cabo = {
  id: string;
  company_id: string;
  user_id: string | null;
  lideranca_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  zona: string | null;
  rua: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
};

export type CaboLink = {
  id: string;
  company_id: string;
  cabo_eleitoral_id: string;
  token: string;
  tipo: "link" | "qrcode";
  nome: string | null;
  ativo: boolean;
  total_cadastros: number;
  expires_at: string | null;
  created_at: string;
};

const sb: any = supabase;

export const liderancasCabosService = {
  // ---------- Lideranças ----------
  async listarLiderancas(companyId?: string | null): Promise<Lideranca[]> {
    let q = sb
      .from("liderancas")
      .select("*")
      .order("nome");
    if (companyId) q = q.eq("company_id", companyId);
    const { data, error } = await q;
    if (error) {
      console.error("[listarLiderancas] erro:", error);
      throw new Error(error.message ?? error.details ?? JSON.stringify(error));
    }
    return data ?? [];
  },
  async criarLideranca(input: Partial<Lideranca>) {
    // Bloqueia telefone duplicado (RLS restringe ao escopo da empresa)
    const tel = (input.telefone ?? "").replace(/\D/g, "");
    if (tel) {
      const { count } = await sb
        .from("liderancas")
        .select("id", { count: "exact", head: true })
        .ilike("telefone", tel);
      if ((count ?? 0) > 0) {
        throw new Error("Este telefone já está cadastrado em outra liderança.");
      }
    }

    const cpfDigits = (input.cpf ?? "").replace(/\D/g, "");
    const payload = {
      ...input,
      telefone: tel || null,
      cpf: cpfDigits.length ? cpfDigits : null,
    };
    const { data, error } = await sb.from("liderancas").insert(payload).select().single();
    if (error) {
      if (error.code === "23505") throw new Error("Este telefone já está cadastrado em outra liderança.");
      throw error;
    }
    auditoriaService.registrar({
      acao: "Criar", entidade: "Liderança", entidade_id: data.id,
      modulo: "Político", descricao: `Liderança criada: ${data.nome}`, dados_novos: data,
    });
    return data as Lideranca;
  },
  async atualizarLideranca(id: string, patch: Partial<Lideranca>) {
    const next = { ...patch } as Record<string, unknown>;
    if (patch.telefone !== undefined) {
      const t = (patch.telefone ?? "").replace(/\D/g, "");
      next.telefone = t || null;
    }
    if (patch.cpf !== undefined) {
      const c = (patch.cpf ?? "").replace(/\D/g, "");
      next.cpf = c.length ? c : null;
    }
    const { error } = await sb.from("liderancas").update(next).eq("id", id);
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Editar", entidade: "Liderança", entidade_id: id,
      modulo: "Político", descricao: `Liderança atualizada`, dados_novos: next as Partial<Lideranca>,
    });
  },
  async removerLideranca(id: string) {
    const { error } = await sb.from("liderancas").delete().eq("id", id);
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Excluir", entidade: "Liderança", entidade_id: id, modulo: "Político",
      descricao: `Liderança removida`,
    });
  },

  // ---------- Cabos ----------
  async listarCabos(companyId?: string | null): Promise<Cabo[]> {
    let q = sb
      .from("cabos_eleitorais")
      .select("*")
      .order("nome");
    if (companyId) q = q.eq("company_id", companyId);
    const { data, error } = await q;
    if (error) {
      console.error("[listarCabos] erro:", error);
      throw new Error(error.message ?? error.details ?? JSON.stringify(error));
    }
    return data ?? [];
  },
  async criarCabo(input: Partial<Cabo>) {
    const { data, error } = await sb.from("cabos_eleitorais").insert(input).select().single();
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Criar", entidade: "Cabo Eleitoral", entidade_id: data.id,
      modulo: "Político", descricao: `Cabo criado: ${data.nome}`, dados_novos: data,
    });
    return data as Cabo;
  },
  async atualizarCabo(id: string, patch: Partial<Cabo>) {
    const { error } = await sb.from("cabos_eleitorais").update(patch).eq("id", id);
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Editar", entidade: "Cabo Eleitoral", entidade_id: id,
      modulo: "Político", descricao: `Cabo atualizado`, dados_novos: patch,
    });
  },
  async removerCabo(id: string) {
    const { error } = await sb.from("cabos_eleitorais").delete().eq("id", id);
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Excluir", entidade: "Cabo Eleitoral", entidade_id: id, modulo: "Político",
      descricao: `Cabo removido`,
    });
  },

  // ---------- Cabo logado ----------
  async meuCabo(userId: string): Promise<Cabo | null> {
    const { data } = await sb
      .from("cabos_eleitorais")
      .select("id, company_id, user_id, lideranca_id, nome, email, telefone, zona, rua, status, observacoes, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    return data ?? null;
  },
  async eleitoresDoCabo(caboId: string) {
    const { data, error } = await sb
      .from("eleitores")
      .select("id, nome, telefone, bairro, cidade, uf, origem, ativo, created_at")
      .eq("cabo_eleitoral_id", caboId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async cadastrarEleitorManual(payload: {
    nome: string;
    telefone: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  }) {
    const { data, error } = await sb
      .from("eleitores")
      .insert({
        ...payload,
        origem: "Manual Cabo",
        consentimento_lgpd: true,
        ativo: true,
      })
      .select()
      .single();
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Criar", entidade: "Eleitor (Cabo)", entidade_id: data.id,
      modulo: "Político", descricao: `Cadastro manual de eleitor: ${payload.nome}`,
      dados_novos: { nome: payload.nome, telefone: payload.telefone },
    });
    return data;
  },

  // ---------- Links / QR ----------
  async listarLinks(caboId: string): Promise<CaboLink[]> {
    const { data, error } = await sb
      .from("cabo_links_captacao")
      .select("*")
      .eq("cabo_eleitoral_id", caboId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async criarLink(input: { cabo_eleitoral_id: string; company_id: string; tipo: "link" | "qrcode"; nome?: string }) {
    const { data, error } = await sb.from("cabo_links_captacao").insert(input).select().single();
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Criar", entidade: "Link Captação", entidade_id: data.id,
      modulo: "Político", descricao: `${input.tipo === "qrcode" ? "QR Code" : "Link"} de captação criado`,
    });
    return data as CaboLink;
  },
  async toggleLink(id: string, ativo: boolean) {
    const { error } = await sb.from("cabo_links_captacao").update({ ativo }).eq("id", id);
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Editar", entidade: "Link Captação", entidade_id: id,
      modulo: "Político", descricao: `Link ${ativo ? "ativado" : "desativado"}`,
    });
  },
  async removerLink(id: string) {
    const { error } = await sb.from("cabo_links_captacao").delete().eq("id", id);
    if (error) throw error;
    auditoriaService.registrar({
      acao: "Excluir", entidade: "Link Captação", entidade_id: id,
      modulo: "Político", descricao: `Link removido`,
    });
  },
};