import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const sb: any = supabase;

export type AnaliseEleitor = {
  id: string;
  company_id: string;
  nome: string;
  cpf: string | null;
  titulo_eleitor: string | null;
  zona: string | null;
  secao: string | null;
  situacao: string;
  validado: boolean;
  revisado: boolean;
  created_at: string;
  telefone_original?: string | null;
  telefone_validado?: boolean;
  status_validacao_eleitoral?: string;
  status_validacao_whatsapp?: string;
  status_cadastro?: string;
  score_confianca?: number;
  aceite_lgpd?: boolean;
};

export const analiseService = {
  async listarEleitores(filtros: {
    search?: string;
    bairro?: string | null;
    liderancaId?: string | null;
    caboId?: string | null;
    tagId?: string | null;
  } = {}): Promise<any[]> {
    let q = sb
      .from("eleitores")
      .select(
        "*, lideranca:liderancas!eleitores_lideranca_id_fkey(id,nome), cabo:cabos_eleitorais!eleitores_cabo_eleitoral_id_fkey(id,nome), eleitor_tags(tag:tags(id,nome,cor))"
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (filtros.bairro && filtros.bairro !== "todos") q = q.eq("bairro", filtros.bairro);
    if (filtros.liderancaId && filtros.liderancaId !== "todas") q = q.eq("lideranca_id", filtros.liderancaId);
    if (filtros.caboId && filtros.caboId !== "todos") q = q.eq("cabo_eleitoral_id", filtros.caboId);
    if (filtros.search) {
      const s = filtros.search.replace(/[%_]/g, "");
      q = q.or(`nome.ilike.%${s}%,telefone.ilike.%${s}%,cpf.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []).map((r: any) => ({
      ...r,
      tags: (r.eleitor_tags ?? []).map((et: any) => et.tag).filter(Boolean),
    }));
    if (filtros.tagId && filtros.tagId !== "todas") {
      rows = rows.filter((r: any) => r.tags.some((t: any) => t.id === filtros.tagId));
    }
    return rows;
  },

  async metricasDashboard(companyId: string | null) {
    const apply = (q: any) => (companyId ? q.eq("company_id", companyId) : q);
    const c = (extra?: (q: any) => any) => {
      let q = sb.from("eleitores").select("id", { count: "exact", head: true });
      q = apply(q);
      if (extra) q = extra(q);
      return q;
    };
    const [
      { count: total },
      { count: validados },
      { count: naoValidados },
      { count: divergentes },
      { count: pendentes },
      { count: comZonaSecao },
      { count: comTitulo },
    ] = await Promise.all([
      c(),
      c((q) => q.eq("status_validacao_eleitoral", "validado")),
      c((q) => q.in("status_validacao_eleitoral", ["rejeitado", "incompleto"])),
      c((q) => q.eq("status_validacao_eleitoral", "pendente revisão")),
      c((q) => q.or("status_validacao_eleitoral.is.null,status_validacao_eleitoral.eq.pendente")),
      c((q) => q.not("zona_eleitoral", "is", null).not("secao_eleitoral", "is", null)),
      c((q) => q.not("titulo_eleitoral", "is", null)),
    ]);
    return {
      total: total ?? 0,
      validados: validados ?? 0,
      naoValidados: naoValidados ?? 0,
      divergentes: divergentes ?? 0,
      pendentes: pendentes ?? 0,
      comZonaSecao: comZonaSecao ?? 0,
      comTitulo: comTitulo ?? 0,
    };
  },

  async dashboardDados(filtros: {
    lideranca_id?: string | null;
    cidade?: string | null;
    bairro?: string | null;
    zona?: string | null;
    secao?: string | null;
    status?: string | null;
    tag_ids?: string[] | null;
    desde?: string | null;
    ate?: string | null;
    ano_eleicao?: number | null;
  }) {
    let q = sb
      .from("eleitores")
      .select(
        "id,nome,cpf,telefone,lideranca_id,cidade,bairro,zona_eleitoral,secao_eleitoral,titulo_eleitoral,status_validacao_eleitoral,created_at,eleitor_tags(tag_id)"
      )
      .limit(5000);
    if (filtros.lideranca_id) q = q.eq("lideranca_id", filtros.lideranca_id);
    if (filtros.cidade) q = q.eq("cidade", filtros.cidade);
    if (filtros.bairro) q = q.eq("bairro", filtros.bairro);
    if (filtros.zona) q = q.eq("zona_eleitoral", filtros.zona);
    if (filtros.secao) q = q.eq("secao_eleitoral", filtros.secao);
    if (filtros.status) q = q.eq("status_validacao_eleitoral", filtros.status);
    if (filtros.desde) q = q.gte("created_at", filtros.desde);
    if (filtros.ate)   q = q.lte("created_at", filtros.ate);
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []) as any[];
    if (filtros.tag_ids && filtros.tag_ids.length) {
      const set = new Set(filtros.tag_ids);
      rows = rows.filter((r) =>
        (r.eleitor_tags ?? []).some((et: any) => set.has(et.tag_id))
      );
    }
    return rows;
  },

  async listarAnosEleicao(): Promise<number[]> {
    const { data, error } = await sb
      .from("resultados_eleitorais_tse")
      .select("ano_eleicao")
      .order("ano_eleicao", { ascending: false })
      .limit(2000);
    if (error) return [];
    const set = new Set<number>();
    for (const r of (data ?? []) as any[]) {
      if (r.ano_eleicao) set.add(Number(r.ano_eleicao));
    }
    return [...set].sort((a, b) => b - a);
  },

  async listarLiderancas() {
    const { data, error } = await sb
      .from("liderancas")
      .select("id,nome")
      .order("nome");
    if (error) return [];
    return data ?? [];
  },

  // ===== Custos de API =====
  async listarConfiguracoesCusto() {
    const { data, error } = await sb
      .from("api_configuracoes_custo")
      .select("*")
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },

  async salvarConfiguracaoCusto(input: {
    id?: string;
    nome: string;
    provedor?: string | null;
    custo_centavos: number;
    status: "ativo" | "inativo";
    vigencia_inicio: string;
    vigencia_fim?: string | null;
    observacoes?: string | null;
  }) {
    if (input.id) {
      const { id, ...patch } = input;
      const { error } = await sb.from("api_configuracoes_custo").update(patch).eq("id", id);
      if (error) throw error;
      return id;
    }
    const { data, error } = await sb
      .from("api_configuracoes_custo")
      .insert(input)
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  },

  async excluirConfiguracaoCusto(id: string) {
    const { error } = await sb.from("api_configuracoes_custo").delete().eq("id", id);
    if (error) throw error;
  },

  async listarConsultasCustos(filtros: {
    api_nome?: string | null;
    status?: string | null;
    desde?: string | null;
    ate?: string | null;
  } = {}) {
    let q = sb
      .from("api_consultas_custos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (filtros.api_nome) q = q.eq("api_nome", filtros.api_nome);
    if (filtros.status) q = q.eq("status", filtros.status);
    if (filtros.desde) q = q.gte("created_at", filtros.desde);
    if (filtros.ate) q = q.lte("created_at", filtros.ate);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async registrarConsultaCusto(input: {
    api_nome: string;
    eleitor_id?: string | null;
    lideranca_id?: string | null;
    status?: "sucesso" | "erro" | "ignorado";
    quantidade?: number;
    erro?: string | null;
    metadata?: Record<string, any>;
  }) {
    const { data, error } = await sb.rpc("api_registrar_consulta_custo", {
      _api_nome: input.api_nome,
      _eleitor_id: input.eleitor_id ?? null,
      _lideranca_id: input.lideranca_id ?? null,
      _status: input.status ?? "sucesso",
      _quantidade: input.quantidade ?? 1,
      _erro: input.erro ?? null,
      _metadata: input.metadata ?? {},
    });
    if (error) throw error;
    return data as string;
  },

  // ===== Duplicidades =====
  async listarDuplicidades(filtros: { status?: string | null; tipo?: string | null } = {}) {
    let q = sb
      .from("analise_duplicidades")
      .select("*, eleitor:eleitor_id(id,nome,cpf,telefone,data_nascimento), duplicado:eleitor_duplicado_id(id,nome,cpf,telefone,data_nascimento)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (filtros.status) q = q.eq("status", filtros.status);
    if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async revisarDuplicidade(id: string, decisao: "confirmada" | "descartada", motivo?: string) {
    const { error } = await sb.rpc("analise_duplicidade_revisar", {
      _id: id, _decisao: decisao, _motivo: motivo ?? null,
    });
    if (error) throw error;
  },

  // ===== TSE =====
  async importarTSE(input: {
    ano_eleicao: number;
    turno?: number;
    uf: string;
    cargo?: string | null;
    numero_candidato?: string | null;
    partido?: string | null;
    codigo_municipio?: string | null;
  }) {
    // Validação rígida do payload — garante que o ano enviado é exatamente o da tela
    const anoAtual = new Date().getFullYear();
    const schema = z.object({
      ano_eleicao: z.number({ invalid_type_error: "Ano inválido" })
        .int("Ano deve ser um número inteiro")
        .min(1994, "Ano mínimo: 1994")
        .max(anoAtual + 1, `Ano máximo: ${anoAtual + 1}`),
      turno: z.number().int().min(1).max(2).optional(),
      uf: z.string().regex(/^[A-Z]{2}$/, "UF deve ter 2 letras maiúsculas"),
      cargo: z.string().max(80).nullable().optional(),
      numero_candidato: z.string().max(10).nullable().optional(),
      partido: z.string().max(20).nullable().optional(),
      codigo_municipio: z.string().max(10).nullable().optional(),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ");
      throw new Error(`Payload inválido: ${msg}`);
    }
    const payload = parsed.data;
    const { data, error } = await supabase.functions.invoke("tse-importar", { body: payload });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    const resp = data as {
      success: boolean;
      total: number;
      importados: number;
      arquivo: string;
      ano_eleicao?: number;
      started?: boolean;
      log_id?: string | null;
      mensagem?: string;
    };
    // Garantia adicional: o servidor deve confirmar o mesmo ano solicitado
    if (typeof resp.ano_eleicao === "number" && resp.ano_eleicao !== payload.ano_eleicao) {
      throw new Error(`Inconsistência: solicitado ${payload.ano_eleicao}, servidor processou ${resp.ano_eleicao}`);
    }
    return resp;
  },

  async importarTSEHistorico(input: {
    uf?: string;
    escopo?: "auto" | "municipal" | "geral";
    cargo?: string | null;
    codigo_municipio?: string | null;
    anos?: number[];
    retomar_batch_id?: string;
  }) {
    const { data, error } = await supabase.functions.invoke("tse-importar-historico", { body: input });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as { success: boolean; mensagem: string; anos: number[]; total_jobs: number; batch_id: string };
  },

  async listarJobsTSE(batchId?: string | null) {
    let q = sb.from("tse_jobs").select("*").order("created_at", { ascending: false }).limit(200);
    if (batchId) q = q.eq("batch_id", batchId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async ultimoBatchTSE() {
    const { data, error } = await sb.from("tse_jobs")
      .select("batch_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data?.[0]?.batch_id as string | undefined) ?? null;
  },

  async listarLogsTSE(limit = 100) {
    // Reconcilia logs presos em "iniciado" há mais de 10 min em background (não bloqueia)
    void sb.rpc("reconciliar_logs_tse_orfaos").then(() => {}, () => {});
    const { data, error } = await sb.from("tse_importacao_logs")
      .select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async limparLogsTSE() {
    const { error } = await sb.from("tse_importacao_logs")
      .delete().not("id", "is", null);
    if (error) throw error;
    return { success: true };
  },

  async cancelarImportacaoTSE(logId: string) {
    const { error } = await sb.from("tse_importacao_logs")
      .update({ cancel_requested: true })
      .eq("id", logId)
      .in("status", ["iniciado", "processando"]);
    if (error) throw error;
    return { success: true };
  },

  async marcarLogTSEComoErro(logId: string, motivo = "Importação detectada como travada (sem progresso).") {
    const { error } = await sb.from("tse_importacao_logs")
      .update({ status: "erro", erros: motivo, finished_at: new Date().toISOString() })
      .eq("id", logId)
      .in("status", ["iniciado", "processando"]);
    if (error) throw error;
    return { success: true };
  },

  async listarResultadosTSE(filtros: {
    ano_eleicao?: number | null;
    turno?: number | null;
    uf?: string | null;
    cargo?: string | null;
    municipio?: string | null;
    numero_candidato?: string | null;
    partido?: string | null;
    candidato?: string | null;
    limit?: number;
  } = {}) {
    let q = sb.from("resultados_eleitorais_tse").select("*")
      .order("votos", { ascending: false }).limit(filtros.limit ?? 500);
    if (filtros.ano_eleicao) q = q.eq("ano_eleicao", filtros.ano_eleicao);
    if (filtros.turno) q = q.eq("turno", filtros.turno);
    if (filtros.uf) q = q.eq("uf", filtros.uf);
    if (filtros.cargo) q = q.ilike("cargo", `%${filtros.cargo}%`);
    if (filtros.municipio) q = q.ilike("municipio", `%${filtros.municipio}%`);
    if (filtros.numero_candidato) q = q.eq("numero_candidato", filtros.numero_candidato);
    if (filtros.partido) q = q.ilike("partido", `%${filtros.partido}%`);
    if (filtros.candidato) q = q.ilike("candidato", `%${filtros.candidato}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async uploadManualTSE(rows: any[]) {
    if (!rows.length) return { count: 0 };
    const { error } = await sb.from("resultados_eleitorais_tse")
      .upsert(rows, { onConflict: "ano_eleicao,turno,uf,codigo_municipio,codigo_cargo,numero_candidato,zona_eleitoral,secao_eleitoral" });
    if (error) throw error;
    return { count: rows.length };
  },

  async listarConsultasApi(limit = 100) {
    const { data, error } = await sb
      .from("analise_api_consultas")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async obterUsoProvedor(provedor = "assertiva") {
    const { data, error } = await sb.rpc("analise_provedor_uso", { _provedor: provedor });
    if (error) throw error;
    return data as any;
  },

  async obterLimiteProvedor(provedor = "assertiva") {
    const { data, error } = await sb
      .from("analise_provedor_limites")
      .select("*")
      .eq("provedor", provedor)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async salvarLimiteProvedor(input: {
    provedor?: string;
    orcamento_mensal_centavos: number;
    cota_diaria_consultas: number;
    cota_mensal_consultas?: number;
    ativo: boolean;
  }) {
    const provedor = input.provedor ?? "assertiva";
    const existing = await (sb.from("analise_provedor_limites").select("id").eq("provedor", provedor).maybeSingle());
    if (existing.data?.id) {
      const { error } = await sb
        .from("analise_provedor_limites")
        .update({
          orcamento_mensal_centavos: input.orcamento_mensal_centavos,
          cota_diaria_consultas: input.cota_diaria_consultas,
          cota_mensal_consultas: input.cota_mensal_consultas ?? 0,
          ativo: input.ativo,
        })
        .eq("id", existing.data.id);
      if (error) throw error;
    } else {
      const { error } = await sb
        .from("analise_provedor_limites")
        .insert({
          provedor,
          orcamento_mensal_centavos: input.orcamento_mensal_centavos,
          cota_diaria_consultas: input.cota_diaria_consultas,
          cota_mensal_consultas: input.cota_mensal_consultas ?? 0,
          ativo: input.ativo,
        });
      if (error) throw error;
    }
  },

  async listarCustos() {
    const { data, error } = await sb
      .from("analise_custos_api")
      .select("*")
      .order("ano_mes", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listarLogs(limit = 200) {
    const { data, error } = await sb
      .from("analise_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async listarLogsFiltrados(filtros: {
    acao?: string;
    user_id?: string;
    eleitor_id?: string;
    desde?: string;
    ate?: string;
    limit?: number;
  } = {}) {
    let q = sb.from("analise_logs").select("*").order("created_at", { ascending: false }).limit(filtros.limit ?? 500);
    if (filtros.acao) q = q.ilike("acao", `%${filtros.acao}%`);
    if (filtros.user_id) q = q.eq("user_id", filtros.user_id);
    if (filtros.eleitor_id) q = q.eq("eleitor_id", filtros.eleitor_id);
    if (filtros.desde) q = q.gte("created_at", filtros.desde);
    if (filtros.ate) q = q.lte("created_at", filtros.ate);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async registrarLogAuditoria(input: {
    acao: string;
    entidade?: string;
    entidade_id?: string;
    eleitor_id?: string;
    detalhes?: Record<string, any>;
  }) {
    let ip: string | null = null;
    try {
      const r = await fetch("https://api.ipify.org?format=json");
      ip = (await r.json())?.ip ?? null;
    } catch {}
    const { data, error } = await sb.rpc("analise_log_registrar", {
      _acao: input.acao,
      _entidade: input.entidade ?? null,
      _entidade_id: input.entidade_id ?? null,
      _eleitor_id: input.eleitor_id ?? null,
      _detalhes: input.detalhes ?? {},
      _ip: ip,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) throw error;
    return data as string;
  },

  async historicoEleitor(eleitor_id: string) {
    const { data, error } = await sb.rpc("analise_eleitor_historico", { _eleitor_id: eleitor_id });
    if (error) throw error;
    return (data ?? []) as Array<{
      tipo: string; titulo: string; detalhes: any; user_id: string | null;
      ip: string | null; user_agent: string | null; ocorrido_em: string;
    }>;
  },

  // ===== Fila de jobs =====
  async enfileirarJob(input: {
    tipo: string;
    chave?: string | null;
    payload?: Record<string, any>;
    prioridade?: number;
    max_tentativas?: number;
  }) {
    const { data, error } = await sb.rpc("analise_job_enfileirar", {
      _tipo: input.tipo,
      _chave: input.chave ?? null,
      _payload: input.payload ?? {},
      _prioridade: input.prioridade ?? 5,
      _max_tentativas: input.max_tentativas ?? 3,
    });
    if (error) throw error;
    return data as string;
  },

  async listarJobs(filtros: { status?: string; tipo?: string; limit?: number } = {}) {
    let q = sb.from("analise_jobs").select("*").order("created_at", { ascending: false }).limit(filtros.limit ?? 200);
    if (filtros.status) q = q.eq("status", filtros.status);
    if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async statsJobs() {
    const { data, error } = await sb.from("analise_jobs").select("status").limit(2000);
    if (error) throw error;
    const acc: Record<string, number> = { pendente: 0, processando: 0, sucesso: 0, erro: 0 };
    (data ?? []).forEach((r: any) => { acc[r.status] = (acc[r.status] || 0) + 1; });
    return acc;
  },

  async processarFila(lote = 5) {
    const { data, error } = await supabase.functions.invoke("analise-job-worker", { body: { lote } });
    if (error) throw error;
    return data;
  },

  // ===== Cache de consultas =====
  async cacheObter(fonte: string, chave: string) {
    const { data, error } = await sb.rpc("analise_cache_obter", { _fonte: fonte, _chave: chave });
    if (error) throw error;
    return data as any;
  },

  async cacheSalvar(fonte: string, chave: string, resultado: any, ttlSegundos = 86400) {
    const { error } = await sb.rpc("analise_cache_salvar", {
      _fonte: fonte, _chave: chave, _resultado: resultado, _ttl_segundos: ttlSegundos,
    });
    if (error) throw error;
  },

  // ===== LGPD =====
  async lgpdRegistrarConsentimento(input: {
    eleitor_id: string;
    finalidade: string;
    texto_versao?: string;
    canal?: string;
  }) {
    const { data, error } = await sb.rpc("lgpd_registrar_consentimento", {
      _eleitor_id: input.eleitor_id,
      _finalidade: input.finalidade,
      _texto_versao: input.texto_versao ?? null,
      _canal: input.canal ?? "sistema",
      _ip: null,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) throw error;
    return data as string;
  },

  async lgpdRevogarConsentimento(id: string, motivo?: string) {
    const { error } = await sb.rpc("lgpd_revogar_consentimento", { _consentimento_id: id, _motivo: motivo ?? null });
    if (error) throw error;
  },

  async lgpdAnonimizarEleitor(eleitor_id: string, motivo: string) {
    const { error } = await sb.rpc("lgpd_anonimizar_eleitor", { _eleitor_id: eleitor_id, _motivo: motivo });
    if (error) throw error;
  },

  async lgpdListarConsentimentos(filtros: { eleitor_id?: string | null; aceite?: boolean | null } = {}) {
    let q = sb.from("lgpd_consentimentos").select("*").order("created_at", { ascending: false }).limit(500);
    if (filtros.eleitor_id) q = q.eq("eleitor_id", filtros.eleitor_id);
    if (typeof filtros.aceite === "boolean") q = q.eq("aceite", filtros.aceite);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async lgpdListarSolicitacoes(filtros: { status?: string | null; tipo?: string | null } = {}) {
    let q = sb.from("lgpd_solicitacoes").select("*").order("created_at", { ascending: false }).limit(500);
    if (filtros.status) q = q.eq("status", filtros.status);
    if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async lgpdCriarSolicitacao(input: {
    eleitor_id?: string | null;
    tipo: "exclusao" | "correcao" | "exportacao" | "revogacao";
    motivo?: string;
    payload?: Record<string, any>;
  }) {
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await sb.from("lgpd_solicitacoes").insert({
      eleitor_id: input.eleitor_id ?? null,
      tipo: input.tipo,
      motivo: input.motivo ?? null,
      payload: input.payload ?? {},
      solicitado_por: auth.user?.id ?? null,
    }).select("id").single();
    if (error) throw error;
    return data.id as string;
  },

  async lgpdAtenderSolicitacao(id: string, status: "em_analise" | "aprovada" | "rejeitada" | "concluida", resposta?: string) {
    const { error } = await sb.rpc("lgpd_atender_solicitacao", { _id: id, _status: status, _resposta: resposta ?? null });
    if (error) throw error;
  },

  async lgpdPodeExportar(): Promise<boolean> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;
    const company_id = (await sb.rpc("user_default_company", { _user_id: auth.user.id })).data;
    const { data, error } = await sb.rpc("lgpd_pode_exportar", { _user_id: auth.user.id, _company_id: company_id });
    if (error) return false;
    return !!data;
  },

  async lgpdPodeVerCpf(): Promise<boolean> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;
    const company_id = (await sb.rpc("user_default_company", { _user_id: auth.user.id })).data;
    const { data, error } = await sb.rpc("lgpd_pode_ver_cpf", { _user_id: auth.user.id, _company_id: company_id });
    if (error) return false;
    return !!data;
  },

  async criarEleitor(input: Record<string, any>) {
    // telefone_original é definitivo; não permitir sobrescrever em updates posteriores
    const payload = {
      ...input,
      telefone: input.telefone_original ?? input.telefone,
      data_aceite_lgpd: input.aceite_lgpd ? new Date().toISOString() : null,
      status_cadastro: input.status_cadastro ?? "incompleto",
    };
    const { data, error } = await sb
      .from("eleitores")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    await this.registrarLog("eleitor.criado", "eleitores", data.id);
    return data;
  },

  /** Atualização segura: nunca permite trocar telefone_original. */
  async atualizarEleitor(id: string, patch: Record<string, any>) {
    const safe = { ...patch };
    delete safe.telefone_original;
    delete safe.company_id;
    delete safe.id;
    if (safe.aceite_lgpd === true) {
      safe.data_aceite_lgpd = new Date().toISOString();
    }
    const { error } = await sb.from("eleitores").update(safe).eq("id", id);
    if (error) throw error;
    await this.registrarLog("eleitor.atualizado", "eleitores", id);
  },

  async registrarLog(acao: string, entidade?: string, entidade_id?: string, detalhes: any = {}) {
    const { data: auth } = await supabase.auth.getUser();
    await sb.from("analise_logs").insert({
      user_id: auth.user?.id ?? null,
      acao,
      entidade: entidade ?? null,
      entidade_id: entidade_id ?? null,
      detalhes,
    });
  },

  async consultarApiExterna(payload: { cpf?: string; titulo?: string; eleitor_id?: string }) {
    const { data, error } = await supabase.functions.invoke("analise-validacao-eleitoral", {
      body: payload,
    });
    if (error) throw error;
    return data;
  },

  async whatsappEnviarCodigo(eleitor_id: string) {
    const { data, error } = await supabase.functions.invoke("analise-whatsapp-enviar-codigo", {
      body: { eleitor_id },
    });
    if (error) {
      const message = (() => {
        const context = (error as { context?: unknown }).context;
        if (typeof context === "string") {
          try {
            const parsed = JSON.parse(context) as { error?: string; details?: string };
            return parsed.details || parsed.error || error.message;
          } catch {
            return context || error.message;
          }
        }
        return error.message;
      })();
      throw new Error(message);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as { success: boolean; expira_em: string };
  },

  async whatsappValidarCodigo(eleitor_id: string, codigo: string) {
    const { data, error } = await supabase.functions.invoke("analise-whatsapp-validar-codigo", {
      body: { eleitor_id, codigo },
    });
    if (error) throw error;
    if ((data as any)?.error) {
      const err = new Error((data as any).error);
      (err as any).tentativas_restantes = (data as any).tentativas_restantes;
      throw err;
    }
    return data as { success: boolean };
  },

  async enriquecerEleitor(payload: { eleitor_id?: string; cpf?: string; telefone?: string }) {
    const { data, error } = await supabase.functions.invoke("analise-enriquecimento", {
      body: payload,
    });
    if (error) {
      // Lê o corpo (pode ser bloqueio por limite — 429)
      const ctx: any = (error as any).context;
      try {
        const txt = await ctx?.text?.();
        const parsed = txt ? JSON.parse(txt) : null;
        if (parsed?.bloqueado) {
          const err: any = new Error(parsed.error ?? "Limite de consultas atingido");
          err.bloqueado = true;
          err.uso = parsed.uso;
          throw err;
        }
        if (parsed?.error) throw new Error(parsed.error);
      } catch (e) {
        if ((e as any)?.bloqueado) throw e;
      }
      throw error;
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as {
      success: boolean;
      chave_busca: "cpf" | "telefone";
      campos_aplicados: string[];
      divergencia: null | {
        score: number;
        campos: Record<string, "compatível" | "divergente" | "ausente">;
        divergencias_fortes: string[];
        status_sugerido: "validado" | "pendente revisão" | "incompleto";
        motivo: string | null;
      };
      dados: Record<string, any>;
    };
  },

  async listarRevisoesPendentes() {
    const { data, error } = await sb
      .from("eleitores")
      .select("*")
      .eq("status_validacao_eleitoral", "pendente revisão")
      .order("data_ultima_consulta", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  },

  async obterContextoRevisao(eleitor_id: string) {
    const [{ data: eleitor }, { data: consulta }, { data: logDiv }] = await Promise.all([
      sb.from("eleitores").select("*").eq("id", eleitor_id).maybeSingle(),
      sb.from("analise_api_consultas").select("*")
        .eq("eleitor_id", eleitor_id).eq("endpoint", "enriquecimento")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("analise_logs").select("*")
        .eq("eleitor_id", eleitor_id)
        .in("acao", ["enriquecimento.divergencia_forte", "enriquecimento.aplicado"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    return { eleitor, consulta, divergencia: logDiv?.detalhes?.divergencia ?? null };
  },

  async decidirRevisao(input: {
    eleitor_id: string;
    decisao: "aprovado" | "rejeitado" | "correcao";
    motivo: string;
    aplicar_dados?: Record<string, any> | null;
  }) {
    const { data: auth } = await supabase.auth.getUser();
    const user_id = auth.user?.id ?? null;

    // 1) Aplica dados aprovados (se houver) — telefone/telefone_original NUNCA
    if (input.decisao === "aprovado" && input.aplicar_dados) {
      const safe: Record<string, any> = { ...input.aplicar_dados };
      delete safe.telefone;
      delete safe.telefone_original;
      delete safe.id;
      delete safe.company_id;
      // Regra: só marca como "validado" se o título de eleitor estiver preenchido.
      // Caso contrário, mantém como "pendente" até a integração com o TSE.
      const { data: atual } = await sb
        .from("eleitores")
        .select("titulo_eleitoral")
        .eq("id", input.eleitor_id)
        .maybeSingle();
      const tituloFinal =
        (safe.titulo_eleitoral as string | null | undefined) ??
        atual?.titulo_eleitoral ??
        null;
      const temTitulo = !!tituloFinal && String(tituloFinal).trim().length > 0;
      safe.status_validacao_eleitoral = temTitulo ? "validado" : "pendente";
      safe.motivo_divergencia = temTitulo ? null : "Título de eleitor ausente";
      const { error } = await sb.from("eleitores").update(safe).eq("id", input.eleitor_id);
      if (error) throw error;
    } else if (input.decisao === "rejeitado") {
      await sb.from("eleitores").update({
        status_validacao_eleitoral: "rejeitado",
        motivo_divergencia: input.motivo,
      }).eq("id", input.eleitor_id);
    } else if (input.decisao === "correcao") {
      await sb.from("eleitores").update({
        status_validacao_eleitoral: "correção solicitada",
        motivo_divergencia: input.motivo,
      }).eq("id", input.eleitor_id);
    }

    // 2) Registra a decisão
    const { error: vErr } = await sb.from("analise_validacoes").insert({
      eleitor_id: input.eleitor_id,
      tipo: "revisao_manual",
      resultado: input.decisao,
      fonte: "operador",
      user_id,
      detalhes: { motivo: input.motivo, aplicado: input.aplicar_dados ?? null },
    });
    if (vErr) throw vErr;

    // 3) Log
    await this.registrarLog(`revisao.${input.decisao}`, "eleitores", input.eleitor_id, {
      motivo: input.motivo,
    });
  },
};