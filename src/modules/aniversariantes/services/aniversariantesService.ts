import { supabase } from "@/integrations/supabase/client";

export type Aniversariante = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  bairro: string | null;
  cidade: string | null;
  data_nascimento: string;
  idade: number;
  dia: number;
  mes: number;
};

function calcularIdade(iso: string, ref: Date): number {
  const d = new Date(iso);
  let idade = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) idade--;
  return idade;
}

export const aniversariantesService = {
  async noPeriodo(diasAFrente: number = 0): Promise<Aniversariante[]> {
    const { data, error } = await supabase
      .from("eleitores")
      .select("id, nome, telefone, email, bairro, cidade, data_nascimento")
      .not("data_nascimento", "is", null)
      .limit(1000);
    if (error) throw error;

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje); limite.setDate(limite.getDate() + diasAFrente);

    const lista: Aniversariante[] = [];
    (data ?? []).forEach((e: any) => {
      if (!e.data_nascimento) return;
      const dn = new Date(e.data_nascimento);
      // Aniversário deste ano
      const aniv = new Date(hoje.getFullYear(), dn.getMonth(), dn.getDate());
      if (aniv >= hoje && aniv <= limite) {
        lista.push({
          id: e.id,
          nome: e.nome,
          telefone: e.telefone,
          email: e.email,
          bairro: e.bairro,
          cidade: e.cidade,
          data_nascimento: e.data_nascimento,
          idade: calcularIdade(e.data_nascimento, aniv),
          dia: dn.getDate(),
          mes: dn.getMonth() + 1,
        });
      }
    });
    return lista.sort((a, b) => {
      if (a.mes !== b.mes) return a.mes - b.mes;
      if (a.dia !== b.dia) return a.dia - b.dia;
      return a.nome.localeCompare(b.nome);
    });
  },

  async hoje(): Promise<Aniversariante[]> {
    return this.noPeriodo(0);
  },

  async obterConfig() {
    const { data, error } = await supabase
      .from("aniversariantes_config")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async salvarConfig(input: { ativo?: boolean; template?: string; hora_disparo?: number; apenas_lgpd?: boolean }) {
    const cfg = await this.obterConfig();
    if (!cfg) {
      const { error } = await supabase.from("aniversariantes_config").insert(input as any);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("aniversariantes_config").update(input as any).eq("id", (cfg as any).id);
      if (error) throw error;
    }
  },

  async dispararAgora() {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aniversariantes-disparo`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ force: true }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json?.error || "Falha no disparo");
    return json as { total: number; enviados: number; falhas: number; pulados: number };
  },
};