import { supabase } from "@/integrations/supabase/client";
import type {
  DepartamentoGab, MembroDep, InteracaoDep, FuncaoMembro, TipoInteracao,
} from "../data/mock";

const funcaoToDb = (f: FuncaoMembro) =>
  f === "Coordenador" ? "coordenador" : f === "Voluntário" ? "voluntario" : "membro";
const funcaoFromDb = (f: string | null | undefined): FuncaoMembro =>
  f === "coordenador" ? "Coordenador" : f === "voluntario" ? "Voluntário" : "Membro";
const tipoToDb = (t: TipoInteracao) =>
  t === "Atendimento" ? "atendimento" : t === "Evento" ? "evento" : t === "Doação" ? "doacao" : "contato";
const tipoFromDb = (t: string | null | undefined): TipoInteracao =>
  t === "atendimento" ? "Atendimento" : t === "evento" ? "Evento" : t === "doacao" ? "Doação" : "Contato";
const statusInteracaoFromDb = (s: string | null | undefined): InteracaoDep["status"] =>
  s === "pendente" ? "Pendente" : s === "em_andamento" ? "Em andamento" : "Concluído";
const statusInteracaoToDb = (s: InteracaoDep["status"]) =>
  s === "Pendente" ? "pendente" : s === "Em andamento" ? "em_andamento" : "concluido";

const mapDep = (r: any): DepartamentoGab => ({
  id: r.id,
  nome: r.nome,
  descricao: r.descricao ?? "",
  responsavel: r.responsavel_nome ?? "",
  objetivo: r.objetivo ?? undefined,
  area: r.area_atuacao ?? undefined,
  telefone: r.telefone ?? undefined,
  email: r.email ?? undefined,
  status: r.status === "inativo" ? "Inativo" : "Ativo",
  criadoEm: (r.created_at ?? new Date().toISOString()).slice(0, 10),
});

const mapMembro = (r: any): MembroDep => ({
  id: r.id,
  departamentoId: r.departamento_id,
  nome: r.nome ?? "",
  telefone: r.telefone ?? "",
  email: r.email ?? undefined,
  cpf: r.cpf ?? undefined,
  bairro: r.bairro ?? undefined,
  funcao: funcaoFromDb(r.funcao),
  entradaEm: (r.entrou_em ?? r.created_at ?? new Date().toISOString()).slice(0, 10),
  status: r.status === "inativo" ? "Inativo" : "Ativo",
});

const mapInteracao = (r: any): InteracaoDep => ({
  id: r.id,
  departamentoId: r.departamento_id,
  dataHora: r.data_interacao ?? r.created_at,
  tipo: tipoFromDb(r.tipo),
  descricao: r.descricao ?? "",
  responsavel: r.responsavel_nome ?? "",
  status: statusInteracaoFromDb(r.status),
});

export const departamentosService = {
  /** Telefone/CPF já cadastrado como membro neste departamento (tabela `membros` apenas). */
  async verificarMembroDuplicadoNoDepartamento(
    departamentoId: string,
    opts: { telefoneDigits?: string; cpfDigits?: string },
  ): Promise<{
    porTelefone: { id: string; nome: string } | null;
    porCpf: { id: string; nome: string } | null;
  }> {
    const tel = (opts.telefoneDigits ?? "").replace(/\D/g, "");
    const cpf = (opts.cpfDigits ?? "").replace(/\D/g, "");
    let porTelefone: { id: string; nome: string } | null = null;
    let porCpf: { id: string; nome: string } | null = null;
    if (tel.length < 10 && cpf.length !== 11) return { porTelefone: null, porCpf: null };

    const { data, error } = await (supabase as any)
      .from("membros")
      .select("id, nome, telefone, cpf")
      .eq("departamento_id", departamentoId)
      .limit(2000);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ id: string; nome: string; telefone: string | null; cpf: string | null }>;

    const normTel = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");
    const normCpf = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

    if (tel.length >= 10) {
      const hit = rows.find((r) => {
        const rt = normTel(r.telefone);
        return rt === tel || (rt.length >= 9 && tel.length >= 9 && rt.slice(-9) === tel.slice(-9));
      });
      if (hit) porTelefone = { id: hit.id, nome: hit.nome };
    }
    if (cpf.length === 11) {
      const hit = rows.find((r) => normCpf(r.cpf) === cpf);
      if (hit) porCpf = { id: hit.id, nome: hit.nome };
    }
    return { porTelefone, porCpf };
  },

  async listarDepartamentos(): Promise<DepartamentoGab[]> {
    const { data, error } = await supabase.from("departamentos").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapDep);
  },
  async listarMembros(): Promise<MembroDep[]> {
    const { data, error } = await (supabase as any).from("membros").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapMembro);
  },
  async listarInteracoes(): Promise<InteracaoDep[]> {
    const { data, error } = await supabase.from("departamento_interacoes").select("*").order("data_interacao", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapInteracao);
  },
  async criarDepartamento(d: Omit<DepartamentoGab, "id" | "criadoEm">): Promise<DepartamentoGab> {
    const payload: any = {
      nome: d.nome, descricao: d.descricao, responsavel_nome: d.responsavel,
      objetivo: d.objetivo ?? null, area_atuacao: d.area ?? null,
      telefone: d.telefone ?? null, email: d.email ?? null,
      status: d.status === "Inativo" ? "inativo" : "ativo",
      cor: "#7C3AED", icone: "Building2", ativo: d.status !== "Inativo",
    };
    const { data, error } = await supabase.from("departamentos").insert(payload).select("*").single();
    if (error) throw error;
    return mapDep(data);
  },
  async atualizarDepartamento(id: string, p: Partial<DepartamentoGab>): Promise<void> {
    const patch: any = {};
    if (p.nome !== undefined) patch.nome = p.nome;
    if (p.descricao !== undefined) patch.descricao = p.descricao;
    if (p.responsavel !== undefined) patch.responsavel_nome = p.responsavel;
    if (p.objetivo !== undefined) patch.objetivo = p.objetivo ?? null;
    if (p.area !== undefined) patch.area_atuacao = p.area ?? null;
    if (p.telefone !== undefined) patch.telefone = p.telefone ?? null;
    if (p.email !== undefined) patch.email = p.email ?? null;
    if (p.status !== undefined) {
      patch.status = p.status === "Inativo" ? "inativo" : "ativo";
      patch.ativo = p.status !== "Inativo";
    }
    const { error } = await supabase.from("departamentos").update(patch).eq("id", id);
    if (error) throw error;
  },
  async removerDepartamento(id: string): Promise<void> {
    const { error } = await supabase.from("departamentos").delete().eq("id", id);
    if (error) throw error;
  },
  async adicionarMembro(m: Omit<MembroDep, "id" | "entradaEm" | "status"> & {
    status?: MembroDep["status"]; eleitorId?: string | null;
    cidade?: string | null; uf?: string | null; rua?: string | null;
    numero?: string | null; complemento?: string | null; cep?: string | null;
    genero?: string | null; data_nascimento?: string | null; observacoes?: string | null;
  }): Promise<MembroDep> {
    const payload: any = {
      departamento_id: m.departamentoId, eleitor_id: m.eleitorId ?? null,
      nome: m.nome, telefone: m.telefone, email: m.email ?? null,
      cpf: m.cpf ?? null, bairro: m.bairro ?? null,
      cidade: m.cidade ?? null, uf: m.uf ?? null, rua: m.rua ?? null,
      numero: m.numero ?? null, complemento: m.complemento ?? null, cep: m.cep ?? null,
      genero: m.genero ?? null, observacoes: m.observacoes ?? null,
      data_nascimento: m.data_nascimento || null,
      funcao: funcaoToDb(m.funcao),
      status: (m.status ?? "Ativo") === "Inativo" ? "inativo" : "ativo",
    };
    const { data, error } = await (supabase as any).from("membros").insert(payload).select("*").single();
    if (error) {
      if (error.code === "23505") {
        throw new Error("Este membro já está cadastrado neste departamento.");
      }
      throw error;
    }
    return mapMembro(data);
  },
  async atualizarMembro(id: string, p: Partial<MembroDep>): Promise<void> {
    const patch: any = {};
    if (p.nome !== undefined) patch.nome = p.nome;
    if (p.telefone !== undefined) patch.telefone = p.telefone;
    if (p.email !== undefined) patch.email = p.email ?? null;
    if (p.cpf !== undefined) patch.cpf = p.cpf ?? null;
    if (p.bairro !== undefined) patch.bairro = p.bairro ?? null;
    if (p.funcao !== undefined) patch.funcao = funcaoToDb(p.funcao);
    if (p.status !== undefined) patch.status = p.status === "Inativo" ? "inativo" : "ativo";
    const { error } = await (supabase as any).from("membros").update(patch).eq("id", id);
    if (error) throw error;
  },
  async removerMembro(id: string): Promise<void> {
    // Remove da tabela membros (nova) e da antiga para compatibilidade
    await (supabase as any).from("membros").delete().eq("id", id);
    await (supabase as any).from("departamento_membros").delete().eq("id", id);
  },
  async registrarInteracao(i: Omit<InteracaoDep, "id">): Promise<InteracaoDep> {
    const payload: any = {
      departamento_id: i.departamentoId, tipo: tipoToDb(i.tipo),
      descricao: i.descricao, responsavel_nome: i.responsavel,
      status: statusInteracaoToDb(i.status), data_interacao: i.dataHora,
    };
    const { data, error } = await supabase.from("departamento_interacoes").insert(payload).select("*").single();
    if (error) throw error;
    return mapInteracao(data);
  },
};
