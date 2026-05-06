import { supabase } from "@/integrations/supabase/client";

export interface Template {
  id: string;
  nome: string;
  conteudo: string;
  atalho: string | null;
  departamento_id: string | null;
  ativo: boolean;
  categoria: string | null;
  descricao: string | null;
  usos: number;
  ultimo_uso_em: string | null;
  created_at: string;
  updated_at: string;
}

export const templateService = {
  async listar(filtros?: { departamentoId?: string | null; apenasAtivos?: boolean }) {
    let q = supabase.from("whatsapp_templates").select("*").order("nome");
    if (filtros?.apenasAtivos) q = q.eq("ativo", true);
    if (filtros?.departamentoId !== undefined) {
      // null = templates globais; um id = só do depto; undefined = todos
      if (filtros.departamentoId === null) q = q.is("departamento_id", null);
      else if (filtros.departamentoId) q = q.or(`departamento_id.eq.${filtros.departamentoId},departamento_id.is.null`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as Template[];
  },

  async criar(input: Omit<Template, "id" | "created_at" | "updated_at">) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("whatsapp_templates").insert({
      ...input,
      created_by: u.user?.id ?? null,
    });
    if (error) throw error;
  },

  async atualizar(id: string, input: Partial<Template>) {
    const { error } = await supabase.from("whatsapp_templates").update({
      nome: input.nome,
      conteudo: input.conteudo,
      atalho: input.atalho,
      departamento_id: input.departamento_id,
      ativo: input.ativo,
      categoria: input.categoria,
      descricao: input.descricao,
    }).eq("id", id);
    if (error) throw error;
  },

  async remover(id: string) {
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
    if (error) throw error;
  },

  async registrarUso(id: string) {
    try { await supabase.rpc("template_registrar_uso", { _template_id: id }); } catch { /* best-effort */ }
  },

  /** Aplica variáveis no conteúdo do template */
  aplicarVariaveis(
    conteudo: string,
    nomeContato: string | null,
    extra?: { atendenteNome?: string | null },
  ): string {
    const nome = nomeContato || "amigo(a)";
    const primeiro = nome.split(" ")[0] || nome;
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    const data = new Date().toLocaleDateString("pt-BR");
    const horaFmt = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return conteudo
      .split("{nome}").join(nome)
      .split("{primeiro_nome}").join(primeiro)
      .split("{saudacao}").join(saudacao)
      .split("{data}").join(data)
      .split("{hora}").join(horaFmt)
      .split("{atendente}").join(extra?.atendenteNome || "");
  },
};

export const VARIAVEIS_DISPONIVEIS = [
  { token: "{nome}", desc: "Nome completo do contato" },
  { token: "{primeiro_nome}", desc: "Primeiro nome" },
  { token: "{saudacao}", desc: "Bom dia/tarde/noite" },
  { token: "{data}", desc: "Data atual" },
  { token: "{hora}", desc: "Hora atual" },
  { token: "{atendente}", desc: "Nome do atendente" },
];

export const CATEGORIAS_PADRAO = [
  "Saudação", "Encerramento", "Pedido de informação", "Confirmação",
  "Aguardando", "Encaminhamento", "Agradecimento", "Outro",
];