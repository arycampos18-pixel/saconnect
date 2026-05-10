import { supabase } from "@/integrations/supabase/client";
import { segmentacaoService } from "@/modules/segmentacao/services/segmentacaoService";

export interface Campanha {
  id: string;
  nome_campanha: string | null;
  canal: string;
  conteudo: string;
  publico_alvo: string;
  total_destinatarios: number;
  status: string;
  segmento_id: string | null;
  created_at: string;
  segmento?: { nome: string; cor: string } | null;
}

export interface PreviewSegmento {
  total: number;
  comTelefone: number;
  comEmail: number;
  comConsentimento: number;
  exemplos: { nome: string; telefone: string | null; email: string | null }[];
}

export const campanhasService = {
  async previewSegmento(segmentoId: string): Promise<PreviewSegmento> {
    const { data: seg, error } = await supabase
      .from("segmentos")
      .select("filtros")
      .eq("id", segmentoId)
      .single();
    if (error) throw error;
    const eleitores = await segmentacaoService.preview((seg as any).filtros ?? {});
    return {
      total: eleitores.length,
      comTelefone: eleitores.filter((e: any) => e.telefone).length,
      comEmail: eleitores.filter((e: any) => e.email).length,
      comConsentimento: eleitores.filter((e: any) => e.consentimento_lgpd).length,
      exemplos: eleitores.slice(0, 5).map((e: any) => ({
        nome: e.nome,
        telefone: e.telefone,
        email: e.email,
      })),
    };
  },

  async enviarCampanha(input: {
    nome: string;
    canal: "WhatsApp" | "SMS" | "Email";
    conteudo: string;
    segmento_id?: string | null;
    filtros_adhoc?: any;
    nome_filtro?: string;
    apenas_lgpd: boolean;
  }) {
    let segNome = input.nome_filtro ?? "Filtro rápido";
    let filtros: any = input.filtros_adhoc ?? {};
    if (input.segmento_id) {
      const { data: seg, error: e1 } = await supabase
        .from("segmentos")
        .select("filtros, nome")
        .eq("id", input.segmento_id)
        .single();
      if (e1) throw e1;
      filtros = (seg as any).filtros ?? {};
      segNome = (seg as any).nome;
    }

    const eleitores = await segmentacaoService.preview(filtros);
    const filtrados = eleitores.filter((e: any) => {
      if (input.apenas_lgpd && !e.consentimento_lgpd) return false;
      if (input.canal === "Email" && !e.email) return false;
      if ((input.canal === "WhatsApp" || input.canal === "SMS") && !e.telefone) return false;
      return true;
    });

    const { data: u } = await supabase.auth.getUser();
    const { data: mensagem, error } = await supabase.from("mensagens").insert({
      canal: input.canal,
      conteudo: input.conteudo,
      publico_alvo: input.segmento_id ? `Segmento: ${segNome}` : `Filtro: ${segNome}`,
      total_destinatarios: filtrados.length,
      segmento_id: input.segmento_id ?? null,
      nome_campanha: input.nome,
      enviado_por: u.user?.id ?? null,
      status: input.canal === "WhatsApp" ? "Enviando" : "Enviada",
    }).select("id").single();
    if (error) throw error;

    // Disparo real apenas para WhatsApp via Z-API
    if (input.canal === "WhatsApp" && mensagem?.id && filtrados.length > 0) {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-em-massa`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          mensagem_id: mensagem.id,
          template: input.conteudo,
          destinatarios: filtrados.map((e: any) => ({
            eleitor_id: e.id, nome: e.nome, telefone: e.telefone,
          })),
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error || "Falha no disparo em massa");
      return json.enviados ?? filtrados.length;
    }

    return filtrados.length;
  },

  async previewFiltros(filtros: any): Promise<PreviewSegmento> {
    const eleitores = await segmentacaoService.preview(filtros);
    return {
      total: eleitores.length,
      comTelefone: eleitores.filter((e: any) => e.telefone).length,
      comEmail: eleitores.filter((e: any) => e.email).length,
      comConsentimento: eleitores.filter((e: any) => e.consentimento_lgpd).length,
      exemplos: eleitores.slice(0, 5).map((e: any) => ({
        nome: e.nome, telefone: e.telefone, email: e.email,
      })),
    };
  },

  async listarCampanhas(): Promise<Campanha[]> {
    const { data, error } = await supabase
      .from("mensagens")
      .select("*, segmento:segmentos(nome, cor)")
      .not("segmento_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as any;
  },

  async metricas() {
    const { data, error } = await supabase
      .from("mensagens")
      .select("canal, total_destinatarios, segmento_id, created_at")
      .not("segmento_id", "is", null);
    if (error) throw error;
    const rows = (data ?? []) as any[];
    const totalCampanhas = rows.length;
    const totalDest = rows.reduce((a, r) => a + (r.total_destinatarios ?? 0), 0);
    const porCanal = new Map<string, number>();
    rows.forEach((r) => porCanal.set(r.canal, (porCanal.get(r.canal) ?? 0) + r.total_destinatarios));
    return {
      totalCampanhas,
      totalDest,
      mediaPorCampanha: totalCampanhas > 0 ? Math.round(totalDest / totalCampanhas) : 0,
      porCanal: Array.from(porCanal.entries()).map(([canal, total]) => ({ canal, total })),
    };
  },
};