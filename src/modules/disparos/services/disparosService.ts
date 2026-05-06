import { supabase } from "@/integrations/supabase/client";
import { segmentacaoService } from "@/modules/segmentacao/services/segmentacaoService";

export interface Disparo {
  id: string;
  nome: string;
  template: string;
  segmento_id: string | null;
  apenas_lgpd: boolean;
  respeitar_optout: boolean;
  evitar_duplicatas_horas: number;
  intervalo_segundos: number;
  lote_tamanho: number;
  janela_inicio: string | null;
  janela_fim: string | null;
  agendado_para: string | null;
  agendado_fim: string | null;
  intervalo_min_segundos: number;
  intervalo_max_segundos: number;
  template_id: string | null;
  instancia_id: string | null;
  prepend_saudacao: boolean;
  prepend_nome: boolean;
  pausa_a_cada: number;
  pausa_segundos: number;
  limite_diario: number;
  enviados_hoje: number;
  status: "rascunho" | "agendado" | "processando" | "pausado" | "concluido" | "cancelado" | "falhou";
  total: number;
  enviados: number;
  falhas: number;
  optouts: number;
  iniciado_em: string | null;
  concluido_em: string | null;
  created_at: string;
}

export interface DisparoDestinatario {
  id: string;
  disparo_id: string;
  eleitor_id: string | null;
  nome: string | null;
  telefone: string;
  telefone_digits: string;
  status: "pendente" | "enviando" | "enviado" | "falhou" | "optout" | "ignorado";
  conteudo_enviado: string | null;
  provedor_message_id: string | null;
  erro: string | null;
  tentativas: number;
  enviado_em: string | null;
  created_at: string;
}

export const disparosService = {
  async listar(): Promise<Disparo[]> {
    const { data, error } = await supabase
      .from("disparos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as any;
  },

  async obter(id: string): Promise<Disparo> {
    const { data, error } = await supabase.from("disparos").select("*").eq("id", id).single();
    if (error) throw error;
    return data as any;
  },

  async destinatarios(disparoId: string, statusFiltro?: string): Promise<DisparoDestinatario[]> {
    let q = supabase.from("disparo_destinatarios").select("*").eq("disparo_id", disparoId).order("created_at");
    if (statusFiltro && statusFiltro !== "todos") q = q.eq("status", statusFiltro as any);
    const { data, error } = await q.limit(2000);
    if (error) throw error;
    return (data ?? []) as any;
  },

  async criar(input: {
    nome: string;
    template: string;
    segmento_id: string;
    apenas_lgpd: boolean;
    respeitar_optout: boolean;
    evitar_duplicatas_horas: number;
    intervalo_min_segundos: number;
    intervalo_max_segundos: number;
    lote_tamanho: number;
    janela_inicio: string | null;
    janela_fim: string | null;
    agendado_para: string | null;
    agendado_fim: string | null;
    template_id: string | null;
    instancia_id: string | null;
    prepend_saudacao: boolean;
    prepend_nome: boolean;
    pausa_a_cada: number;
    pausa_segundos: number;
    limite_diario: number;
  }): Promise<{ id: string; total: number }> {
    const { data: seg, error: sErr } = await supabase
      .from("segmentos").select("filtros").eq("id", input.segmento_id).single();
    if (sErr) throw sErr;

    const eleitores = await segmentacaoService.preview((seg as any).filtros ?? {});
    let elegiveis = eleitores.filter((e: any) => !!e.telefone);
    if (input.apenas_lgpd) elegiveis = elegiveis.filter((e: any) => e.consentimento_lgpd);

    const digits = (t: string) => (t || "").replace(/\D/g, "");
    const telefones = elegiveis.map((e: any) => digits(e.telefone)).filter((d) => d.length >= 10);

    // opt-out check
    let optoutSet = new Set<string>();
    if (input.respeitar_optout && telefones.length) {
      const { data: opts } = await supabase.from("disparo_optout").select("telefone_digits").in("telefone_digits", telefones);
      optoutSet = new Set((opts ?? []).map((o: any) => o.telefone_digits));
    }

    // anti-duplicata
    let recentSet = new Set<string>();
    if (input.evitar_duplicatas_horas > 0 && telefones.length) {
      const desde = new Date(Date.now() - input.evitar_duplicatas_horas * 3600 * 1000).toISOString();
      const { data: rec } = await supabase
        .from("disparo_destinatarios")
        .select("telefone_digits")
        .in("telefone_digits", telefones)
        .eq("status", "enviado")
        .gte("enviado_em", desde);
      recentSet = new Set((rec ?? []).map((r: any) => r.telefone_digits));
    }

    const { data: u } = await supabase.auth.getUser();
    const { data: disp, error: dErr } = await supabase.from("disparos").insert({
      nome: input.nome,
      template: input.template,
      segmento_id: input.segmento_id,
      filtros_snapshot: (seg as any).filtros ?? {},
      apenas_lgpd: input.apenas_lgpd,
      respeitar_optout: input.respeitar_optout,
      evitar_duplicatas_horas: input.evitar_duplicatas_horas,
      intervalo_segundos: Math.round((input.intervalo_min_segundos + input.intervalo_max_segundos) / 2),
      intervalo_min_segundos: input.intervalo_min_segundos,
      intervalo_max_segundos: input.intervalo_max_segundos,
      lote_tamanho: input.lote_tamanho,
      janela_inicio: input.janela_inicio,
      janela_fim: input.janela_fim,
      agendado_para: input.agendado_para,
      agendado_fim: input.agendado_fim,
      template_id: input.template_id,
      instancia_id: input.instancia_id,
      prepend_saudacao: input.prepend_saudacao,
      prepend_nome: input.prepend_nome,
      pausa_a_cada: input.pausa_a_cada,
      pausa_segundos: input.pausa_segundos,
      limite_diario: input.limite_diario,
      status: input.agendado_para ? "agendado" : "rascunho",
      created_by: u.user?.id,
    }).select("id").single();
    if (dErr) throw dErr;
    const disparoId = (disp as any).id as string;

    const rows = elegiveis.map((e: any) => {
      const d = digits(e.telefone);
      let status: any = "pendente";
      if (d.length < 10) status = "ignorado";
      else if (optoutSet.has(d)) status = "optout";
      else if (recentSet.has(d)) status = "ignorado";
      return {
        disparo_id: disparoId,
        eleitor_id: e.id,
        nome: e.nome,
        telefone: e.telefone,
        telefone_digits: d,
        status,
      };
    });

    // chunk insert
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from("disparo_destinatarios").insert(chunk);
      if (error) throw error;
    }

    const pendentes = rows.filter((r) => r.status === "pendente").length;
    const optoutsC = rows.filter((r) => r.status === "optout").length;
    await supabase.from("disparos").update({
      total: pendentes,
      optouts: optoutsC,
    }).eq("id", disparoId);

    return { id: disparoId, total: pendentes };
  },

  async iniciar(disparoId: string) {
    const { data: sess } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/disparo-processar`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sess.session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ disparo_id: disparoId }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || "Falha ao iniciar disparo");
    return j;
  },

  async pausar(id: string) {
    const { error } = await supabase.from("disparos").update({ status: "pausado" }).eq("id", id);
    if (error) throw error;
  },
  async cancelar(id: string) {
    const { error } = await supabase.from("disparos").update({ status: "cancelado", concluido_em: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  },

  // Opt-out global
  async listarOptout(): Promise<{ id: string; telefone_digits: string; motivo: string | null; origem: string; created_at: string }[]> {
    const { data, error } = await supabase.from("disparo_optout").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return (data ?? []) as any;
  },
  async adicionarOptout(telefone: string, motivo?: string) {
    const d = (telefone || "").replace(/\D/g, "");
    if (d.length < 10) throw new Error("Telefone inválido");
    const { error } = await supabase.from("disparo_optout").upsert({ telefone_digits: d, motivo: motivo ?? null, origem: "manual" }, { onConflict: "telefone_digits" });
    if (error) throw error;
  },
  async removerOptout(id: string) {
    const { error } = await supabase.from("disparo_optout").delete().eq("id", id);
    if (error) throw error;
  },

  // Config global
  async obterConfig() {
    const { data, error } = await supabase.from("disparo_config").select("*").limit(1).maybeSingle();
    if (error) throw error;
    return data as any;
  },
  async salvarConfig(id: string, patch: Record<string, any>) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("disparo_config").update({ ...patch, updated_by: u.user?.id }).eq("id", id);
    if (error) throw error;
  },

  // Templates (reuso de whatsapp_templates)
  async listarTemplates() {
    const { data, error } = await supabase.from("whatsapp_templates").select("id,nome,conteudo,atalho").eq("ativo", true).order("nome");
    if (error) throw error;
    return (data ?? []) as { id: string; nome: string; conteudo: string; atalho: string | null }[];
  },
};