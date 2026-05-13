import { supabase } from "@/integrations/supabase/client";
import { onlyDigits } from "@/shared/utils/phone";
import { onlyDigitsCPF } from "@/shared/utils/cpf";

export type Eleitor = {
  id: string;
  nome: string;
  telefone: string;
  cpf: string | null;
  email: string | null;
  data_nascimento: string | null;
  genero: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  origem: string;
  observacoes: string | null;
  consentimento_lgpd: boolean;
   lideranca_id: string | null;
   cabo_eleitoral_id: string | null;
   score_fidelidade: number;
   ultima_interacao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  whatsapp_bloqueado?: boolean;
  whatsapp_origem?: string | null;
};

export type EleitorComRelacoes = Eleitor & {
  lideranca: { id: string; nome: string } | null;
  cabo: { id: string; nome: string } | null;
  tags: { id: string; nome: string; cor: string }[];
};

export type EleitorInput = {
  nome: string;
  telefone: string;
  cpf?: string | null;
  email?: string | null;
  data_nascimento?: string | null;
  genero?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  origem?: string;
  observacoes?: string | null;
  consentimento_lgpd: boolean;
  lideranca_id?: string | null;
  cabo_id?: string | null;
  tag_ids?: string[];
};

export type Filtros = {
  search?: string;
  bairro?: string;
  tagId?: string;
  liderancaId?: string;
  caboId?: string;
  /** ISO: eleitores com created_at >= este instante (ex.: início do dia local, alinhado à métrica “hoje”) */
  criadosDesde?: string;
};

/** Início do dia atual no fuso local, em ISO (mesma base usada em metricas().hoje). */
export function inicioDoDiaLocalISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export const eleitoresService = {
  async list(filtros: Filtros = {}): Promise<EleitorComRelacoes[]> {
    let query = supabase
      .from("eleitores")
      .select(
        "*, lideranca:liderancas!eleitores_lideranca_id_fkey(id, nome), cabo:cabos_eleitorais!eleitores_cabo_eleitoral_id_fkey(id, nome), eleitor_tags(tag:tags(id, nome, cor))"
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    if (filtros.bairro && filtros.bairro !== "todos") query = query.eq("bairro", filtros.bairro);
    if (filtros.liderancaId && filtros.liderancaId !== "todas")
      query = query.eq("lideranca_id", filtros.liderancaId);
    if (filtros.caboId && filtros.caboId !== "todos")
      query = query.eq("cabo_eleitoral_id", filtros.caboId);
    if (filtros.criadosDesde) query = query.gte("created_at", filtros.criadosDesde);
    if (filtros.search) {
      const s = filtros.search.replace(/[%_]/g, "");
      query = query.or(`nome.ilike.%${s}%,telefone.ilike.%${s}%,cpf.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let rows = (data ?? []).map((row: any) => ({
      ...row,
      tags: (row.eleitor_tags ?? []).map((et: any) => et.tag).filter(Boolean),
    })) as EleitorComRelacoes[];

    if (filtros.tagId && filtros.tagId !== "todas") {
      rows = rows.filter((r) => r.tags.some((t) => t.id === filtros.tagId));
    }
    return rows;
  },

  async checarDuplicidade(opts: { telefone?: string | null; cpf?: string | null; ignoreId?: string }): Promise<{
    porTelefone: { id: string; nome: string } | null;
    porCpf: { id: string; nome: string } | null;
  }> {
    const tel = opts.telefone ? onlyDigits(opts.telefone) : "";
    const cpf = opts.cpf ? onlyDigitsCPF(opts.cpf) : "";
    let porTelefone: { id: string; nome: string } | null = null;
    let porCpf: { id: string; nome: string } | null = null;
    if (tel.length >= 10) {
      const { data } = await supabase
        .from("eleitores")
        .select("id, nome, telefone")
        .ilike("telefone", `%${tel.slice(-9)}%`)
        .limit(20);
      const hit = (data ?? []).find(
        (r: any) => onlyDigits(r.telefone) === tel && r.id !== opts.ignoreId,
      );
      if (hit) porTelefone = { id: hit.id, nome: hit.nome };
    }
    if (cpf.length === 11) {
      const { data } = await supabase
        .from("eleitores")
        .select("id, nome, cpf")
        .not("cpf", "is", null)
        .limit(2000);
      const hit = (data ?? []).find(
        (r: any) => onlyDigitsCPF(r.cpf ?? "") === cpf && r.id !== opts.ignoreId,
      );
      if (hit) porCpf = { id: hit.id, nome: hit.nome };
    }
    return { porTelefone, porCpf };
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("eleitores").delete().eq("id", id);
    if (error) throw error;
  },

  async updateTelefone(id: string, telefone: string): Promise<void> {
    const tel = onlyDigits(telefone);
    if (tel.length < 10) throw new Error("Telefone inválido");
    const { error } = await supabase
      .from("eleitores")
      .update({ telefone: tel })
      .eq("id", id);
    if (error) throw error;
  },

  async create(input: EleitorInput): Promise<string> {
    const { tag_ids, ...payload } = input;
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("eleitores")
      .insert({ ...payload, created_by: user.user?.id })
      .select("id")
      .single();
    if (error) throw error;
    if (tag_ids && tag_ids.length > 0) {
      const { error: tagErr } = await supabase
        .from("eleitor_tags")
        .insert(tag_ids.map((tag_id) => ({ eleitor_id: data.id, tag_id })));
      if (tagErr) throw tagErr;
    }
    // Dispara webhook de saída (não bloqueia)
    import("@/modules/webhooks/services/webhooksService").then(({ webhooksService }) =>
      webhooksService.disparar("eleitor.criado", {
        id: data.id,
        nome: payload.nome,
        telefone: payload.telefone,
        email: payload.email,
        bairro: payload.bairro,
        cidade: payload.cidade,
      })
    );
    return data.id;
  },

  async metricas() {
    const inicioHoje = inicioDoDiaLocalISO();
    const sevenAgo = new Date();
    sevenAgo.setDate(sevenAgo.getDate() - 6);
    sevenAgo.setHours(0, 0, 0, 0);

    const [{ count: total }, { count: hoje }, { data: ultimos }] = await Promise.all([
      supabase.from("eleitores").select("*", { count: "exact", head: true }),
      supabase
        .from("eleitores")
        .select("*", { count: "exact", head: true })
        .gte("created_at", inicioHoje),
      supabase
        .from("eleitores")
        .select("created_at")
        .gte("created_at", sevenAgo.toISOString())
        .limit(1000),
    ]);

    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }
    (ultimos ?? []).forEach((r: any) => {
      const k = r.created_at.slice(0, 10);
      if (k in buckets) buckets[k]++;
    });
    const serie7d = Object.entries(buckets).map(([k, v]) => ({
      dia: new Date(k).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      cadastros: v,
    }));

    return { total: total ?? 0, hoje: hoje ?? 0, serie7d };
  },
};