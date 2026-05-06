import { supabase } from "@/integrations/supabase/client";

export type TriggerTipo =
  | "novo_eleitor"
  | "eleitor_respondeu_pesquisa"
  | "eleitor_participou_evento"
  | "aniversario_eleitor"
  | "data_especifica"
  | "manual";

export type AutomacaoStatus = "Rascunho" | "Ativa" | "Pausada";
export type ExecucaoStatus = "Sucesso" | "Erro" | "Em andamento";

export type FlowNode = {
  id: string;
  type: "trigger" | "condicao" | "acao";
  position: { x: number; y: number };
  data: Record<string, any>;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
};

export type Automacao = {
  id: string;
  nome: string;
  descricao: string | null;
  trigger_tipo: TriggerTipo;
  trigger_config: Record<string, any>;
  nodes: FlowNode[];
  edges: FlowEdge[];
  status: AutomacaoStatus;
  total_execucoes: number;
  ultima_execucao_em: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Execucao = {
  id: string;
  automacao_id: string;
  status: ExecucaoStatus;
  trigger_origem: string | null;
  contexto: Record<string, any>;
  acoes_executadas: any[];
  erro: string | null;
  created_at: string;
};

export const automacaoService = {
  async listar(): Promise<Automacao[]> {
    const { data, error } = await supabase
      .from("automacoes")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Automacao[];
  },

  async obter(id: string): Promise<Automacao> {
    const { data, error } = await supabase.from("automacoes").select("*").eq("id", id).single();
    if (error) throw error;
    return data as unknown as Automacao;
  },

  async criar(input: Partial<Automacao>): Promise<Automacao> {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from("automacoes")
      .insert({
        nome: input.nome ?? "Nova automação",
        descricao: input.descricao ?? null,
        trigger_tipo: input.trigger_tipo ?? "manual",
        trigger_config: input.trigger_config ?? {},
        nodes: (input.nodes ?? []) as any,
        edges: (input.edges ?? []) as any,
        status: input.status ?? "Rascunho",
        created_by: user?.id ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as Automacao;
  },

  async salvar(id: string, input: Partial<Automacao>): Promise<void> {
    const { error } = await supabase
      .from("automacoes")
      .update({
        nome: input.nome,
        descricao: input.descricao,
        trigger_tipo: input.trigger_tipo,
        trigger_config: input.trigger_config,
        nodes: input.nodes as any,
        edges: input.edges as any,
        status: input.status,
      })
      .eq("id", id);
    if (error) throw error;
  },

  async atualizarStatus(id: string, status: AutomacaoStatus): Promise<void> {
    const { error } = await supabase.from("automacoes").update({ status }).eq("id", id);
    if (error) throw error;
  },

  async duplicar(id: string): Promise<Automacao> {
    const orig = await this.obter(id);
    return this.criar({
      nome: `${orig.nome} (cópia)`,
      descricao: orig.descricao ?? undefined,
      trigger_tipo: orig.trigger_tipo,
      trigger_config: orig.trigger_config,
      nodes: orig.nodes,
      edges: orig.edges,
      status: "Rascunho",
    });
  },

  async remover(id: string): Promise<void> {
    const { error } = await supabase.from("automacoes").delete().eq("id", id);
    if (error) throw error;
  },

  async listarExecucoes(automacao_id?: string, limite = 50): Promise<Execucao[]> {
    let q = supabase
      .from("automacao_execucoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limite);
    if (automacao_id) q = q.eq("automacao_id", automacao_id);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as Execucao[];
  },

  async executarManual(id: string): Promise<Execucao> {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/automacao-executar`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ automacao_id: id, contexto: { origem: "manual" } }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json?.error || "Falha ao executar automação");
    // retorna a última execução criada
    const { data } = await supabase
      .from("automacao_execucoes")
      .select("*")
      .eq("automacao_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data as unknown as Execucao;
  },
};