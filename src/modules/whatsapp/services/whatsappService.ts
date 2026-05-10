import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppStatus {
  connected: boolean;
  qrImage: string | null;
  status: unknown;
  credentialsError?: string | null;
}

async function callZapi(action: string, extra: Record<string, string> = {}) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  const qs = new URLSearchParams({ action, ...extra }).toString();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zapi-status?${qs}`;
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
  async _callInstance(action: string, payload: any = {}) {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zapi-instance`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, payload }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json?.error || `Falha Z-API Instance (${resp.status})`);
    return json.data;
  },

  status: (): Promise<WhatsAppStatus> => callZapi("status") as Promise<WhatsAppStatus>,
  // Novas funções Z-API
  getQueue: () => whatsappService._callInstance("get-queue"),
  deleteQueue: () => whatsappService._callInstance("delete-queue"),
  deleteQueueId: (messageId: string) => whatsappService._callInstance("delete-queue-id", { messageId }),
  updateQueueSettings: (value: boolean) => whatsappService._callInstance("update-queue-settings", { value }),
  
  getCallToken: () => whatsappService._callInstance("get-call-token"),
  getSipInfo: () => whatsappService._callInstance("get-sip-info"),
  sendCall: (phone: string) => whatsappService._callInstance("send-call", { phone }),

  sendTextStatus: (text: string, backgroundColor?: string) => whatsappService._callInstance("send-text-status", { text, backgroundColor }),
  sendImageStatus: (image: string, caption?: string) => whatsappService._callInstance("send-image-status", { image, caption }),

  disconnect: () => callZapi("disconnect"),
  restart: () => callZapi("restart"),
  device: () => callZapi("device"),
  me: () => callZapi("me"),
  qrCode: () => callZapi("qr-code"),
  qrCodeImage: () => callZapi("qr-code-image"),
  phoneCode: (phone: string) => callZapi("phone-code", { phone }),
  rename: (name: string) => callZapi("rename", { name }),

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