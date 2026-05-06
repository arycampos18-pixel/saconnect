import { supabase } from "@/integrations/supabase/client";

export type Mensagem = {
  id: string;
  canal: "WhatsApp" | "SMS";
  conteudo: string;
  publico_alvo: string;
  total_destinatarios: number;
  status: string;
  filtro_bairro: string | null;
  filtro_tag_id: string | null;
  enviado_por: string | null;
  created_at: string;
};

export const comunicacaoService = {
  async contarDestinatarios(filtros: { bairro?: string; tagId?: string }) {
    let query = supabase
      .from("eleitores")
      .select("id, eleitor_tags(tag_id)", { count: "exact" })
      .eq("consentimento_lgpd", true)
      .limit(5000);
    if (filtros.bairro && filtros.bairro !== "todos") query = query.eq("bairro", filtros.bairro);
    const { data, error } = await query;
    if (error) throw error;
    let rows = data ?? [];
    if (filtros.tagId && filtros.tagId !== "todas") {
      rows = rows.filter((r: any) =>
        (r.eleitor_tags ?? []).some((et: any) => et.tag_id === filtros.tagId)
      );
    }
    return rows.length;
  },

  async registrar(input: {
    canal: "WhatsApp" | "SMS";
    conteudo: string;
    publico_alvo: string;
    total_destinatarios: number;
    filtro_bairro?: string | null;
    filtro_tag_id?: string | null;
  }) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("mensagens").insert({
      ...input,
      filtro_bairro: input.filtro_bairro ?? null,
      filtro_tag_id: input.filtro_tag_id ?? null,
      enviado_por: u.user?.id ?? null,
      status: "Enviada",
    });
    if (error) throw error;
  },

  async historico(): Promise<Mensagem[]> {
    const { data, error } = await supabase
      .from("mensagens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as Mensagem[];
  },
};