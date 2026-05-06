import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppStatus {
  connected: boolean;
  qrImage: string | null;
  status: unknown;
  credentialsError?: string | null;
}

async function callZapi(action: "status" | "disconnect" | "restart") {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zapi-status?action=${action}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.error || `Falha (${resp.status})`);
  return json;
}

export const whatsappService = {
  status: (): Promise<WhatsAppStatus> => callZapi("status") as Promise<WhatsAppStatus>,
  disconnect: () => callZapi("disconnect"),
  restart: () => callZapi("restart"),

  async metricas() {
    const { data } = await supabase
      .from("mensagens_externas")
      .select("status,enviado_em")
      .eq("canal", "WhatsApp");
    const total = data?.length ?? 0;
    const enviadas = data?.filter((m) => m.status === "Enviado" || m.status === "Entregue").length ?? 0;
    const falhas = data?.filter((m) => m.status === "Falhou").length ?? 0;
    const hoje = new Date().toISOString().slice(0, 10);
    const enviadasHoje = data?.filter((m) => m.enviado_em?.startsWith(hoje)).length ?? 0;
    return { total, enviadas, falhas, enviadasHoje };
  },

  async listarMensagens() {
    const { data, error } = await supabase
      .from("mensagens_externas")
      .select("*")
      .eq("canal", "WhatsApp")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  },
};