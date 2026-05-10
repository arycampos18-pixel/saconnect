import { supabase } from "@/integrations/supabase/client";

const APIS = "wa_bulk_apis" as any;
const CFG = "wa_bulk_config" as any;
const FILA = "wa_bulk_fila_envios" as any;
const MET = "wa_bulk_metricas_diarias" as any;
const TPL = "wa_bulk_templates" as any;
const CAMP = "wa_bulk_campanhas" as any;
const OPTOUT = "wa_bulk_optout" as any;
const CONV = "wa_bulk_conversas" as any;
const MSG = "wa_bulk_mensagens" as any;

export interface WaBulkApi {
  id: string;
  company_id: string;
  nome: string;
  numero_telefone: string;
  display_name: string | null;
  access_token: string;
  business_account_id: string | null;
  phone_number_id: string;
  waba_id: string | null;
  app_id: string | null;
  status: "ativo" | "inativo" | "pausada" | "bloqueada" | "limite_atingido" | "em_aquecimento";
  saude: number;
  msgs_enviadas_hoje: number;
  msgs_enviadas_hora: number;
  total_enviadas: number;
  total_erros: number;
  taxa_entrega: number;
  msgs_limite_diario: number | null;
  msgs_limite_horario: number | null;
  intervalo_min_ms: number | null;
  intervalo_max_ms: number | null;
  cooldown_ate: string | null;
  ultimo_erro: string | null;
  ultimo_envio: string | null;
  iniciado_em: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaBulkConfig {
  id?: string;
  company_id?: string;
  msgs_limite_diario_padrao: number;
  msgs_limite_horario_padrao: number;
  intervalo_min_ms: number;
  intervalo_max_ms: number;
  horario_inicio: string;
  horario_fim: string;
  dias_permitidos: number[];
  aquecimento_ativo: boolean;
  aquecimento_dia_1_7: number;
  aquecimento_dia_8_14: number;
  aquecimento_dia_15_21: number;
  aquecimento_dia_22_plus: number;
  taxa_erro_max_pct: number;
  cooldown_apos_erro_ms: number;
  cooldown_apos_3_erros_ms: number;
  cooldown_apos_warning_ms: number;
  max_msgs_mesmo_numero_dia: number;
  max_tentativas: number;
  meta_diaria_total: number;
}

export interface WaBulkTemplate {
  id: string;
  company_id: string;
  api_id: string | null;
  nome: string;
  categoria: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  idioma: string;
  status: "aprovado" | "pendente" | "rejeitado";
  header_type: string | null;
  header_content: string | null;
  body_text: string;
  footer_text: string | null;
  botoes: any | null;
  variaveis: any | null;
  meta_template_id: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaBulkCampanha {
  id: string;
  company_id: string;
  nome: string;
  template_id: string | null;
  status: "rascunho" | "agendada" | "em_andamento" | "pausada" | "concluida" | "cancelada";
  total_destinatarios: number;
  total_enviados: number;
  total_entregues: number;
  total_lidos: number;
  total_erros: number;
  agendado_para: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  velocidade_envio: number;
  pausada?: boolean;
  janela_inicio?: string | null;
  janela_fim?: string | null;
  timezone?: string | null;
  dias_semana?: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface WaBulkFilaItem {
  id: string;
  campanha_id: string | null;
  api_id: string | null;
  destinatario_telefone: string;
  destinatario_nome: string | null;
  status: "pendente" | "enviando" | "enviado" | "entregue" | "lido" | "erro" | "cancelado";
  tentativas: number;
  max_tentativas: number;
  erro_mensagem: string | null;
  enviado_em: string | null;
  entregue_em: string | null;
  lido_em: string | null;
  proximo_envio: string;
  created_at: string;
}

export const waBulkService = {
  async listApis(): Promise<WaBulkApi[]> {
    const { data, error } = await (supabase as any)
      .from(APIS).select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as WaBulkApi[];
  },

  async createApi(input: Partial<WaBulkApi>): Promise<WaBulkApi> {
    const { data, error } = await (supabase as any).from(APIS).insert(input).select().single();
    if (error) throw error;
    return data as WaBulkApi;
  },

  async updateApi(id: string, patch: Partial<WaBulkApi>): Promise<void> {
    const { error } = await (supabase as any).from(APIS).update(patch).eq("id", id);
    if (error) throw error;
  },

  async deleteApi(id: string): Promise<void> {
    const { error } = await (supabase as any).from(APIS).delete().eq("id", id);
    if (error) throw error;
  },

  async toggleApi(id: string, ativar: boolean): Promise<void> {
    await this.updateApi(id, { status: ativar ? "ativo" : "inativo" } as any);
  },

  async iniciarAquecimento(id: string): Promise<void> {
    await this.updateApi(id, {
      status: "em_aquecimento",
      iniciado_em: new Date().toISOString().slice(0, 10),
    } as any);
  },

  async aquecimentoInfo(api_id: string): Promise<{
    em_aquecimento: boolean; dias: number; fase: string;
    limite_efetivo: number; limite_normal: number;
  } | null> {
    const { data, error } = await (supabase as any)
      .rpc("wa_bulk_aquecimento_info", { _api_id: api_id });
    if (error) throw error;
    const r = Array.isArray(data) ? data[0] : data;
    return r ?? null;
  },

  async promoverAquecimento(): Promise<number> {
    const { data, error } = await (supabase as any).rpc("wa_bulk_aquecimento_promover");
    if (error) throw error;
    return Number(data ?? 0);
  },

  async getConfig(): Promise<WaBulkConfig | null> {
    const { data, error } = await (supabase as any).from(CFG).select("*").maybeSingle();
    if (error) throw error;
    return (data ?? null) as WaBulkConfig | null;
  },

  async upsertConfig(input: Partial<WaBulkConfig>): Promise<void> {
    const cur = await this.getConfig();
    if (cur?.id) {
      const { error } = await (supabase as any).from(CFG).update(input).eq("id", cur.id);
      if (error) throw error;
    } else {
      const { error } = await (supabase as any).from(CFG).insert(input);
      if (error) throw error;
    }
  },

  async metricasHoje(): Promise<{
    enviados: number; entregues: number; lidos: number; erros: number; taxa: number;
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await (supabase as any)
      .from(MET).select("total_enviados,total_entregues,total_lidos,total_erros").eq("data", today);
    const rows = (data ?? []) as any[];
    const enviados = rows.reduce((s, r) => s + (r.total_enviados ?? 0), 0);
    const entregues = rows.reduce((s, r) => s + (r.total_entregues ?? 0), 0);
    const lidos = rows.reduce((s, r) => s + (r.total_lidos ?? 0), 0);
    const erros = rows.reduce((s, r) => s + (r.total_erros ?? 0), 0);
    const taxa = enviados > 0 ? (entregues / enviados) * 100 : 0;
    return { enviados, entregues, lidos, erros, taxa };
  },

  async filaPendentes(): Promise<number> {
    const { count } = await (supabase as any)
      .from(FILA).select("id", { count: "exact", head: true }).eq("status", "pendente");
    return count ?? 0;
  },

  async testarEnvio(input: { api_id: string; destinatario: string; texto?: string;
    template_nome?: string; variaveis?: string[] }): Promise<any> {
    const { data, error } = await supabase.functions.invoke("wa-bulk-send", { body: input });
    if (error) throw error;
    return data;
  },

  async dispararWorker(): Promise<any> {
    const { data, error } = await supabase.functions.invoke("wa-bulk-worker", { body: {} });
    if (error) throw error;
    return data;
  },

  // ===== Templates =====
  async listTemplates(): Promise<WaBulkTemplate[]> {
    const { data, error } = await (supabase as any)
      .from(TPL).select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as WaBulkTemplate[];
  },
  async createTemplate(input: Partial<WaBulkTemplate>): Promise<WaBulkTemplate> {
    const { data, error } = await (supabase as any).from(TPL).insert(input).select().single();
    if (error) throw error;
    return data as WaBulkTemplate;
  },
  async deleteTemplate(id: string): Promise<void> {
    const { error } = await (supabase as any).from(TPL).delete().eq("id", id);
    if (error) throw error;
  },
  async sincronizarTemplatesMeta(api_id: string): Promise<{ inserted: number; updated: number; total: number }> {
    const { data, error } = await supabase.functions.invoke("wa-bulk-sync-templates", { body: { api_id } });
    if (error) throw error;
    return data as any;
  },

  async submeterTemplateMeta(template_id: string, api_id: string): Promise<{ ok: boolean; meta_id?: string; status?: string; error?: string; code?: number | null }> {
    const { data, error } = await supabase.functions.invoke("wa-bulk-submit-template", { body: { template_id, api_id } });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  },

  // ===== Campanhas =====
  async listCampanhas(): Promise<WaBulkCampanha[]> {
    const { data, error } = await (supabase as any)
      .from(CAMP).select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as WaBulkCampanha[];
  },
  async getCampanha(id: string): Promise<WaBulkCampanha | null> {
    const { data, error } = await (supabase as any).from(CAMP).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as WaBulkCampanha | null;
  },
  async createCampanha(input: {
    nome: string;
    template_id?: string | null;
    velocidade_envio?: number;
    agendado_para?: string | null;
    janela_inicio?: string | null;
    janela_fim?: string | null;
    timezone?: string | null;
    dias_semana?: number[] | null;
    destinatarios: { telefone: string; nome?: string; variaveis?: Record<string, string> }[];
  }): Promise<WaBulkCampanha> {
    const { data: camp, error: e1 } = await (supabase as any).from(CAMP).insert({
      nome: input.nome,
      template_id: input.template_id ?? null,
      velocidade_envio: input.velocidade_envio ?? 500,
      agendado_para: input.agendado_para ?? null,
      janela_inicio: input.janela_inicio ?? null,
      janela_fim: input.janela_fim ?? null,
      timezone: input.timezone ?? "America/Sao_Paulo",
      dias_semana: input.dias_semana && input.dias_semana.length ? input.dias_semana : null,
      status: input.agendado_para ? "agendada" : "rascunho",
      total_destinatarios: input.destinatarios.length,
    }).select().single();
    if (e1) throw e1;
    if (input.destinatarios.length > 0) {
      const rows = input.destinatarios.map((d) => ({
        campanha_id: camp.id,
        template_id: input.template_id ?? null,
        destinatario_telefone: d.telefone,
        destinatario_nome: d.nome ?? null,
        variaveis: d.variaveis ?? null,
      }));
      const { error: e2 } = await (supabase as any).from(FILA).insert(rows);
      if (e2) throw e2;
    }
    return camp as WaBulkCampanha;
  },
  async updateCampanhaStatus(id: string, status: WaBulkCampanha["status"]): Promise<void> {
    const patch: any = { status };
    if (status === "em_andamento") patch.iniciado_em = new Date().toISOString();
    if (status === "concluida" || status === "cancelada") patch.concluido_em = new Date().toISOString();
    const { error } = await (supabase as any).from(CAMP).update(patch).eq("id", id);
    if (error) throw error;
  },
  async pausarCampanha(id: string, pausar: boolean): Promise<void> {
    const { error } = await (supabase as any).rpc("wa_bulk_campanha_pausar", {
      _campanha_id: id, _pausar: pausar,
    });
    if (error) throw error;
  },

  // ===== Fila =====
  async listFila(filtros: { status?: string; campanha_id?: string; limit?: number } = {}): Promise<WaBulkFilaItem[]> {
    let q = (supabase as any).from(FILA).select("*").order("created_at", { ascending: false }).limit(filtros.limit ?? 200);
    if (filtros.status) q = q.eq("status", filtros.status);
    if (filtros.campanha_id) q = q.eq("campanha_id", filtros.campanha_id);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as WaBulkFilaItem[];
  },
  async filaContagemPorStatus(): Promise<Record<string, number>> {
    const { data, error } = await (supabase as any).from(FILA).select("status");
    if (error) throw error;
    const out: Record<string, number> = {};
    for (const r of (data ?? []) as any[]) out[r.status] = (out[r.status] ?? 0) + 1;
    return out;
  },

  async filaContagemPorStatusCampanha(campanha_id: string): Promise<Record<string, number>> {
    const { data, error } = await (supabase as any)
      .from(FILA).select("status").eq("campanha_id", campanha_id);
    if (error) throw error;
    const out: Record<string, number> = {};
    for (const r of (data ?? []) as any[]) out[r.status] = (out[r.status] ?? 0) + 1;
    return out;
  },

  async retentarItem(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(FILA)
      .update({ status: "pendente", erro_mensagem: null, proximo_envio: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async retentarErrosCampanha(campanha_id: string): Promise<number> {
    const { data, error } = await (supabase as any)
      .from(FILA)
      .update({ status: "pendente", erro_mensagem: null, proximo_envio: new Date().toISOString() })
      .eq("campanha_id", campanha_id)
      .eq("status", "erro")
      .select("id");
    if (error) throw error;
    return (data ?? []).length;
  },

  // ===== Charts =====
  async enviosPorHora(): Promise<{ hora: string; enviados: number; erros: number }[]> {
    const inicio = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const { data } = await (supabase as any)
      .from(FILA)
      .select("status,enviado_em,created_at")
      .gte("created_at", inicio)
      .limit(5000);
    const buckets: Record<string, { enviados: number; erros: number }> = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 60 * 60_000);
      const key = `${d.getHours().toString().padStart(2, "0")}h`;
      buckets[key] = { enviados: 0, erros: 0 };
    }
    for (const r of (data ?? []) as any[]) {
      const ref = r.enviado_em ?? r.created_at;
      if (!ref) continue;
      const d = new Date(ref);
      const key = `${d.getHours().toString().padStart(2, "0")}h`;
      if (!buckets[key]) continue;
      if (r.status === "erro") buckets[key].erros++;
      else if (["enviado", "entregue", "lido"].includes(r.status)) buckets[key].enviados++;
    }
    return Object.entries(buckets).map(([hora, v]) => ({ hora, ...v }));
  },

  async distribuicaoPorApi(): Promise<{ nome: string; valor: number }[]> {
    const today = new Date().toISOString().slice(0, 10);
    const { data: met } = await (supabase as any)
      .from(MET).select("api_id,total_enviados").eq("data", today);
    const { data: apis } = await (supabase as any).from(APIS).select("id,nome");
    const mapNome: Record<string, string> = {};
    for (const a of (apis ?? []) as any[]) mapNome[a.id] = a.nome;
    return ((met ?? []) as any[])
      .filter((r) => (r.total_enviados ?? 0) > 0)
      .map((r) => ({ nome: mapNome[r.api_id] ?? "—", valor: r.total_enviados }));
  },

  async taxaEntrega7Dias(): Promise<{ data: string; taxa: number }[]> {
    const inicio = new Date(Date.now() - 6 * 24 * 60 * 60_000);
    inicio.setHours(0, 0, 0, 0);
    const { data } = await (supabase as any)
      .from(MET)
      .select("data,total_enviados,total_entregues")
      .gte("data", inicio.toISOString().slice(0, 10));
    const agg: Record<string, { e: number; en: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60_000);
      const k = d.toISOString().slice(5, 10);
      agg[k] = { e: 0, en: 0 };
    }
    for (const r of (data ?? []) as any[]) {
      const k = String(r.data).slice(5, 10);
      if (!agg[k]) continue;
      agg[k].e += r.total_enviados ?? 0;
      agg[k].en += r.total_entregues ?? 0;
    }
    return Object.entries(agg).map(([d, v]) => ({
      data: d,
      taxa: v.e > 0 ? Number(((v.en / v.e) * 100).toFixed(1)) : 0,
    }));
  },

  async errosPorTipo(): Promise<{ tipo: string; total: number }[]> {
    const { data } = await (supabase as any)
      .from(FILA).select("erro_mensagem").eq("status", "erro").limit(1000);
    const agg: Record<string, number> = {};
    for (const r of (data ?? []) as any[]) {
      const key = (r.erro_mensagem ?? "Desconhecido").toString().slice(0, 40);
      agg[key] = (agg[key] ?? 0) + 1;
    }
    return Object.entries(agg)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  },

  // ===== Consolidado =====
  async buscarEleitores(filtros: {
    busca?: string;
    cidade?: string;
    bairro?: string;
    uf?: string;
    cabo_eleitoral_id?: string;
    lideranca_id?: string;
    apenas_lgpd?: boolean;
    limit?: number;
  } = {}): Promise<{ id: string; nome: string; telefone: string; cidade: string | null; bairro: string | null; uf: string | null; status_validacao_whatsapp: string | null; telefone_validado: boolean | null }[]> {
    let q = (supabase as any)
      .from("eleitores")
      .select("id,nome,telefone,cidade,bairro,uf,status_validacao_whatsapp,telefone_validado")
      .eq("ativo", true)
      .not("telefone", "is", null)
      .order("nome", { ascending: true })
      .limit(filtros.limit ?? 5000);
    if (filtros.busca && filtros.busca.trim()) {
      const b = filtros.busca.trim();
      q = q.or(`nome.ilike.%${b}%,telefone.ilike.%${b}%`);
    }
    if (filtros.cidade) q = q.ilike("cidade", `%${filtros.cidade}%`);
    if (filtros.bairro) q = q.ilike("bairro", `%${filtros.bairro}%`);
    if (filtros.uf) q = q.eq("uf", filtros.uf.toUpperCase());
    if (filtros.cabo_eleitoral_id) q = q.eq("cabo_eleitoral_id", filtros.cabo_eleitoral_id);
    if (filtros.lideranca_id) q = q.eq("lideranca_id", filtros.lideranca_id);
    if (filtros.apenas_lgpd) q = q.eq("aceite_lgpd", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as any[];
  },

  async listCabosEleitorais(): Promise<{ id: string; nome: string }[]> {
    const { data, error } = await (supabase as any)
      .from("cabos_eleitorais").select("id,nome").order("nome");
    if (error) return [];
    return (data ?? []) as any[];
  },

  async listLiderancas(): Promise<{ id: string; nome: string }[]> {
    const { data, error } = await (supabase as any)
      .from("liderancas").select("id,nome").order("nome");
    if (error) return [];
    return (data ?? []) as any[];
  },

  async kpisConsolidados(): Promise<{
    total_enviadas: number;
    total_entregues: number;
    total_lidos: number;
    total_erros: number;
    taxa_entrega: number;
    taxa_leitura: number;
    apis_total: number;
    apis_ativas: number;
    apis_aquecimento: number;
    campanhas_total: number;
    campanhas_ativas: number;
    optout_total: number;
    fila_pendente: number;
  }> {
    const [{ data: apis }, { data: camps }, optoutCount, filaCount] = await Promise.all([
      (supabase as any).from(APIS).select("status,total_enviadas,total_erros,taxa_entrega"),
      (supabase as any).from(CAMP).select("status"),
      (supabase as any).from(OPTOUT).select("id", { count: "exact", head: true }),
      (supabase as any).from(FILA).select("id", { count: "exact", head: true }).eq("status", "pendente"),
    ]);
    const { data: met } = await (supabase as any)
      .from(MET).select("total_enviados,total_entregues,total_lidos,total_erros");
    const m = (met ?? []) as any[];
    const total_enviadas = m.reduce((s, r) => s + (r.total_enviados ?? 0), 0);
    const total_entregues = m.reduce((s, r) => s + (r.total_entregues ?? 0), 0);
    const total_lidos = m.reduce((s, r) => s + (r.total_lidos ?? 0), 0);
    const total_erros = m.reduce((s, r) => s + (r.total_erros ?? 0), 0);
    const aArr = (apis ?? []) as any[];
    const cArr = (camps ?? []) as any[];
    return {
      total_enviadas,
      total_entregues,
      total_lidos,
      total_erros,
      taxa_entrega: total_enviadas > 0 ? (total_entregues / total_enviadas) * 100 : 0,
      taxa_leitura: total_entregues > 0 ? (total_lidos / total_entregues) * 100 : 0,
      apis_total: aArr.length,
      apis_ativas: aArr.filter((a) => a.status === "ativo").length,
      apis_aquecimento: aArr.filter((a) => a.status === "em_aquecimento").length,
      campanhas_total: cArr.length,
      campanhas_ativas: cArr.filter((c) => ["em_andamento", "agendada"].includes(c.status)).length,
      optout_total: optoutCount.count ?? 0,
      fila_pendente: filaCount.count ?? 0,
    };
  },

  async enviosPorDia(dias: number = 30): Promise<{ data: string; enviados: number; entregues: number; erros: number }[]> {
    const inicio = new Date(Date.now() - (dias - 1) * 86400_000);
    inicio.setHours(0, 0, 0, 0);
    const { data } = await (supabase as any)
      .from(MET)
      .select("data,total_enviados,total_entregues,total_erros")
      .gte("data", inicio.toISOString().slice(0, 10));
    const agg: Record<string, { enviados: number; entregues: number; erros: number }> = {};
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      agg[d.toISOString().slice(0, 10)] = { enviados: 0, entregues: 0, erros: 0 };
    }
    for (const r of (data ?? []) as any[]) {
      const k = String(r.data).slice(0, 10);
      if (!agg[k]) continue;
      agg[k].enviados += r.total_enviados ?? 0;
      agg[k].entregues += r.total_entregues ?? 0;
      agg[k].erros += r.total_erros ?? 0;
    }
    return Object.entries(agg).map(([d, v]) => ({ data: d.slice(5), ...v }));
  },

  async topCampanhas(limit: number = 5): Promise<{ id: string; nome: string; status: string; enviados: number; entregues: number; taxa: number }[]> {
    const { data, error } = await (supabase as any)
      .from(CAMP)
      .select("id,nome,status,total_enviados,total_entregues")
      .order("total_enviados", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as any[]).map((c) => ({
      id: c.id,
      nome: c.nome,
      status: c.status,
      enviados: c.total_enviados ?? 0,
      entregues: c.total_entregues ?? 0,
      taxa: (c.total_enviados ?? 0) > 0 ? ((c.total_entregues ?? 0) / c.total_enviados) * 100 : 0,
    }));
  },

  async topApis(limit: number = 5): Promise<{ id: string; nome: string; enviados: number; erros: number; saude: number; taxa: number }[]> {
    const { data, error } = await (supabase as any)
      .from(APIS)
      .select("id,nome,total_enviadas,total_erros,saude,taxa_entrega")
      .order("total_enviadas", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as any[]).map((a) => ({
      id: a.id,
      nome: a.nome,
      enviados: a.total_enviadas ?? 0,
      erros: a.total_erros ?? 0,
      saude: a.saude ?? 0,
      taxa: a.taxa_entrega ?? 0,
    }));
  },

  // ===== Relatórios =====
  async metricasPeriodo(dias: number): Promise<{
    serie: { data: string; enviados: number; entregues: number; lidos: number; erros: number; custo: number }[];
    porApi: { api_id: string; nome: string; enviados: number; entregues: number; erros: number; custo: number }[];
    totais: { enviados: number; entregues: number; lidos: number; erros: number; custo: number };
  }> {
    const inicio = new Date(Date.now() - (dias - 1) * 86400_000);
    inicio.setHours(0, 0, 0, 0);
    const inicioStr = inicio.toISOString().slice(0, 10);
    const { data: met } = await (supabase as any)
      .from(MET)
      .select("data,api_id,total_enviados,total_entregues,total_lidos,total_erros,custo_total_centavos")
      .gte("data", inicioStr);
    const { data: apis } = await (supabase as any).from(APIS).select("id,nome");
    const mapNome: Record<string, string> = {};
    for (const a of (apis ?? []) as any[]) mapNome[a.id] = a.nome;

    const serieMap: Record<string, any> = {};
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const k = d.toISOString().slice(0, 10);
      serieMap[k] = { data: k.slice(5), enviados: 0, entregues: 0, lidos: 0, erros: 0, custo: 0 };
    }
    const apiMap: Record<string, any> = {};
    const tot = { enviados: 0, entregues: 0, lidos: 0, erros: 0, custo: 0 };
    for (const r of (met ?? []) as any[]) {
      const key = String(r.data).slice(0, 10);
      const custo = (r.custo_total_centavos ?? 0) / 100;
      const en = r.total_enviados ?? 0,
        et = r.total_entregues ?? 0,
        lt = r.total_lidos ?? 0,
        er = r.total_erros ?? 0;
      if (serieMap[key]) {
        serieMap[key].enviados += en;
        serieMap[key].entregues += et;
        serieMap[key].lidos += lt;
        serieMap[key].erros += er;
        serieMap[key].custo += custo;
      }
      const aid = r.api_id ?? "—";
      if (!apiMap[aid]) apiMap[aid] = { api_id: aid, nome: mapNome[aid] ?? "—", enviados: 0, entregues: 0, erros: 0, custo: 0 };
      apiMap[aid].enviados += en;
      apiMap[aid].entregues += et;
      apiMap[aid].erros += er;
      apiMap[aid].custo += custo;
      tot.enviados += en;
      tot.entregues += et;
      tot.lidos += lt;
      tot.erros += er;
      tot.custo += custo;
    }
    return {
      serie: Object.values(serieMap),
      porApi: Object.values(apiMap).sort((a, b) => b.enviados - a.enviados),
      totais: tot,
    };
  },

  async exportCampanhasCsv(): Promise<string> {
    const { data, error } = await (supabase as any)
      .from(CAMP)
      .select("nome,status,total_destinatarios,total_enviados,total_entregues,total_lidos,total_erros,velocidade_envio,agendado_para,iniciado_em,concluido_em,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return toCsv(data ?? []);
  },

  // ===== Analytics por campanha =====
  async metricasCampanha(campanhaId: string): Promise<{
    funil: { pendente: number; enviando: number; enviado: number; entregue: number; lido: number; erro: number; optout: number; cancelado: number };
    timelineHora: { hora: string; enviados: number; entregues: number; lidos: number; erros: number }[];
    timelineDia: { dia: string; enviados: number; entregues: number; lidos: number; erros: number }[];
    distribuicaoHoraDia: { hora: number; total: number }[];
    porApi: { api_id: string; nome: string; enviados: number; erros: number }[];
    errosTop: { mensagem: string; total: number }[];
    tempos: { mediaEnvioSeg: number | null; mediaEntregaSeg: number | null; mediaLeituraSeg: number | null };
  }> {
    const { data: itens, error } = await (supabase as any)
      .from(FILA)
      .select("status,api_id,created_at,enviado_em,entregue_em,lido_em,erro_mensagem")
      .eq("campanha_id", campanhaId)
      .limit(50000);
    if (error) throw error;
    const lista = (itens ?? []) as any[];

    const funil: any = { pendente: 0, enviando: 0, enviado: 0, entregue: 0, lido: 0, erro: 0, optout: 0, cancelado: 0 };
    const horaMap: Record<string, any> = {};
    const diaMap: Record<string, any> = {};
    const horaDiaMap: Record<number, number> = {};
    const apiSet = new Set<string>();
    const apiMap: Record<string, { api_id: string; nome: string; enviados: number; erros: number }> = {};
    const errMap: Record<string, number> = {};
    let somaEnvio = 0, nEnvio = 0, somaEntrega = 0, nEntrega = 0, somaLeitura = 0, nLeitura = 0;

    for (const r of lista) {
      if (funil[r.status] !== undefined) funil[r.status]++;
      if (r.api_id) apiSet.add(r.api_id);
      if (r.enviado_em) {
        const d = new Date(r.enviado_em);
        const hk = `${d.toISOString().slice(0, 13)}:00`;
        horaMap[hk] = horaMap[hk] ?? { hora: hk.slice(11, 16), enviados: 0, entregues: 0, lidos: 0, erros: 0 };
        horaMap[hk].enviados++;
        const dk = d.toISOString().slice(0, 10);
        diaMap[dk] = diaMap[dk] ?? { dia: dk.slice(5), enviados: 0, entregues: 0, lidos: 0, erros: 0 };
        diaMap[dk].enviados++;
        const hd = d.getHours();
        horaDiaMap[hd] = (horaDiaMap[hd] ?? 0) + 1;
        if (r.api_id) {
          apiMap[r.api_id] = apiMap[r.api_id] ?? { api_id: r.api_id, nome: r.api_id, enviados: 0, erros: 0 };
          apiMap[r.api_id].enviados++;
        }
        if (r.created_at) {
          const diff = (d.getTime() - new Date(r.created_at).getTime()) / 1000;
          if (diff >= 0 && diff < 86400 * 7) { somaEnvio += diff; nEnvio++; }
        }
      }
      if (r.entregue_em) {
        const d = new Date(r.entregue_em);
        const hk = `${d.toISOString().slice(0, 13)}:00`;
        horaMap[hk] = horaMap[hk] ?? { hora: hk.slice(11, 16), enviados: 0, entregues: 0, lidos: 0, erros: 0 };
        horaMap[hk].entregues++;
        const dk = d.toISOString().slice(0, 10);
        diaMap[dk] = diaMap[dk] ?? { dia: dk.slice(5), enviados: 0, entregues: 0, lidos: 0, erros: 0 };
        diaMap[dk].entregues++;
        if (r.enviado_em) {
          const diff = (d.getTime() - new Date(r.enviado_em).getTime()) / 1000;
          if (diff >= 0 && diff < 86400) { somaEntrega += diff; nEntrega++; }
        }
      }
      if (r.lido_em) {
        const d = new Date(r.lido_em);
        const hk = `${d.toISOString().slice(0, 13)}:00`;
        horaMap[hk] = horaMap[hk] ?? { hora: hk.slice(11, 16), enviados: 0, entregues: 0, lidos: 0, erros: 0 };
        horaMap[hk].lidos++;
        const dk = d.toISOString().slice(0, 10);
        diaMap[dk] = diaMap[dk] ?? { dia: dk.slice(5), enviados: 0, entregues: 0, lidos: 0, erros: 0 };
        diaMap[dk].lidos++;
        if (r.entregue_em) {
          const diff = (d.getTime() - new Date(r.entregue_em).getTime()) / 1000;
          if (diff >= 0 && diff < 86400 * 7) { somaLeitura += diff; nLeitura++; }
        }
      }
      if (r.status === "erro") {
        if (r.api_id) {
          apiMap[r.api_id] = apiMap[r.api_id] ?? { api_id: r.api_id, nome: r.api_id, enviados: 0, erros: 0 };
          apiMap[r.api_id].erros++;
        }
        const msg = (r.erro_mensagem ?? "Erro desconhecido").slice(0, 120);
        errMap[msg] = (errMap[msg] ?? 0) + 1;
      }
    }

    // Resolve nomes de API
    if (apiSet.size > 0) {
      const { data: apis } = await (supabase as any).from(APIS).select("id,nome").in("id", Array.from(apiSet));
      for (const a of (apis ?? []) as any[]) {
        if (apiMap[a.id]) apiMap[a.id].nome = a.nome;
      }
    }

    return {
      funil,
      timelineHora: Object.entries(horaMap).sort(([a], [b]) => a.localeCompare(b)).slice(-24).map(([, v]) => v),
      timelineDia: Object.entries(diaMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
      distribuicaoHoraDia: Array.from({ length: 24 }, (_, h) => ({ hora: h, total: horaDiaMap[h] ?? 0 })),
      porApi: Object.values(apiMap).sort((a, b) => b.enviados - a.enviados),
      errosTop: Object.entries(errMap).map(([mensagem, total]) => ({ mensagem, total })).sort((a, b) => b.total - a.total).slice(0, 10),
      tempos: {
        mediaEnvioSeg: nEnvio > 0 ? Math.round(somaEnvio / nEnvio) : null,
        mediaEntregaSeg: nEntrega > 0 ? Math.round(somaEntrega / nEntrega) : null,
        mediaLeituraSeg: nLeitura > 0 ? Math.round(somaLeitura / nLeitura) : null,
      },
    };
  },

  async exportFilaCsv(filtros: { campanha_id?: string; status?: string } = {}): Promise<string> {
    let q = (supabase as any)
      .from(FILA)
      .select("destinatario_telefone,destinatario_nome,status,tentativas,enviado_em,erro_mensagem,custo_centavos,created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (filtros.campanha_id) q = q.eq("campanha_id", filtros.campanha_id);
    if (filtros.status) q = q.eq("status", filtros.status);
    const { data, error } = await q;
    if (error) throw error;
    return toCsv(data ?? []);
  },

  // ===== Opt-out (DNC/LGPD) =====
  async listarOptout(companyId: string, busca?: string) {
    let q = (supabase as any)
      .from(OPTOUT)
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (busca && busca.trim()) {
      const b = busca.trim();
      q = q.or(`telefone.ilike.%${b}%,telefone_digits.ilike.%${b.replace(/\D/g, "")}%,motivo.ilike.%${b}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data as any[];
  },
  async adicionarOptout(companyId: string, telefone: string, motivo?: string, origem: string = "manual", observacoes?: string) {
    const { data, error } = await (supabase as any).rpc("wa_bulk_optout_add", {
      _company_id: companyId,
      _telefone: telefone,
      _motivo: motivo ?? null,
      _origem: origem,
      _observacoes: observacoes ?? null,
    });
    if (error) throw error;
    return data as string;
  },
  async removerOptout(id: string) {
    const { error } = await (supabase as any).from(OPTOUT).delete().eq("id", id);
    if (error) throw error;
  },
  async importarOptout(companyId: string, telefones: string[], motivo?: string) {
    let ok = 0, erros = 0;
    for (const t of telefones) {
      const tel = (t ?? "").trim();
      if (!tel) continue;
      try {
        await this.adicionarOptout(companyId, tel, motivo, "import");
        ok++;
      } catch {
        erros++;
      }
    }
    return { ok, erros };
  },
  async exportOptoutCsv(companyId: string): Promise<string> {
    const { data, error } = await (supabase as any)
      .from(OPTOUT)
      .select("telefone,telefone_digits,motivo,origem,observacoes,created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50000);
    if (error) throw error;
    return toCsv(data ?? []);
  },

  // ========= Atendimento =========
  async listarConversas(companyId: string, status?: string) {
    let q = (supabase as any)
      .from(CONV)
      .select("*")
      .eq("company_id", companyId)
      .order("ultima_interacao", { ascending: false })
      .limit(200);
    if (status && status !== "todas") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as any[];
  },
  async listarMensagens(conversaId: string) {
    const { data, error } = await (supabase as any)
      .from(MSG)
      .select("*")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as any[];
  },
  async marcarLida(conversaId: string) {
    await (supabase as any).from(CONV).update({ nao_lidas: 0 }).eq("id", conversaId);
  },
  async atualizarStatusConversa(conversaId: string, status: "aberta" | "fechada" | "pendente") {
    const { error } = await (supabase as any).from(CONV).update({ status }).eq("id", conversaId);
    if (error) throw error;
  },
  async enviarResposta(conversa: { id: string; company_id: string; api_id: string | null; wa_numero: string }, texto: string) {
    if (!conversa.api_id) throw new Error("Conversa sem API associada");
    const { data, error } = await supabase.functions.invoke("wa-bulk-send", {
      body: { api_id: conversa.api_id, destinatario: conversa.wa_numero, texto },
    });
    if (error) throw error;
    const messageId = (data as any)?.message_id ?? null;
    const { data: u } = await supabase.auth.getUser();
    await (supabase as any).from(MSG).insert({
      company_id: conversa.company_id,
      conversa_id: conversa.id,
      api_id: conversa.api_id,
      direcao: "saida",
      tipo: "texto",
      corpo: texto,
      message_id_meta: messageId,
      status: "enviado",
      remetente_id: u.user?.id ?? null,
    });
    await (supabase as any).from(CONV).update({
      ultima_mensagem: texto,
      ultima_interacao: new Date().toISOString(),
    }).eq("id", conversa.id);
    return data;
  },
};

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(","));
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}