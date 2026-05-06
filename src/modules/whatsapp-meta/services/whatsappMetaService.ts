import { supabase } from "@/integrations/supabase/client";

export interface MetaSession {
  id: string;
  company_id: string;
  name: string;
  phone_number_id: string;
  waba_id: string;
  app_id: string | null;
  app_secret: string | null;
  access_token: string | null;
  verify_token: string;
  status: string;
  error_message: string | null;
  webhook_url: string | null;
  webhook_verified_at: string | null;
  connected_at: string | null;
  created_at: string;
}

export interface MetaTemplate {
  id: string;
  company_id: string;
  session_id: string;
  template_id: string | null;
  name: string;
  category: string;
  language: string;
  header_type: string | null;
  header_text: string | null;
  body_text: string;
  footer_text: string | null;
  buttons: any;
  status: string;
  rejection_reason: string | null;
  synced_at: string | null;
  created_at: string;
}

export interface MetaCampaign {
  id: string;
  company_id: string;
  session_id: string;
  template_id: string | null;
  name: string;
  description: string | null;
  contact_list_id: string | null;
  cadence_initial_seconds: number;
  cadence_final_seconds: number;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: string;
  total_contacts: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  error_count: number;
  created_at: string;
}

export interface MetaLead {
  id: string;
  company_id: string;
  campaign_id: string | null;
  session_id: string | null;
  phone_number: string;
  name: string | null;
  email: string | null;
  interaction_type: string | null;
  interaction_data: any;
  status: string;
  notes: string | null;
  first_interaction_at: string | null;
  last_interaction_at: string | null;
  created_at: string;
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export const metaService = {
  // Sessions
  async listSessions() {
    const { data, error } = await supabase
      .from("whatsapp_meta_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as MetaSession[];
  },
  async createSession(payload: Partial<MetaSession>) {
    const { data, error } = await supabase
      .from("whatsapp_meta_sessions")
      .insert(payload as any)
      .select()
      .single();
    if (error) throw error;
    return data as MetaSession;
  },
  async updateSession(id: string, patch: Partial<MetaSession>) {
    const { error } = await supabase
      .from("whatsapp_meta_sessions")
      .update(patch as any)
      .eq("id", id);
    if (error) throw error;
  },
  async deleteSession(id: string) {
    const { error } = await supabase.from("whatsapp_meta_sessions").delete().eq("id", id);
    if (error) throw error;
  },

  // Templates
  async listTemplates(sessionId?: string) {
    let q = supabase.from("whatsapp_meta_templates").select("*").order("created_at", { ascending: false });
    if (sessionId) q = q.eq("session_id", sessionId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as MetaTemplate[];
  },
  async createTemplate(payload: Partial<MetaTemplate>) {
    const { data, error } = await supabase
      .from("whatsapp_meta_templates")
      .insert(payload as any)
      .select()
      .single();
    if (error) throw error;
    return data as MetaTemplate;
  },
  async deleteTemplate(id: string) {
    const { error } = await supabase.from("whatsapp_meta_templates").delete().eq("id", id);
    if (error) throw error;
  },
  async syncTemplates(sessionId: string) {
    const { data, error } = await supabase.functions.invoke("meta-sync-templates", {
      body: { session_id: sessionId },
    });
    if (error) throw error;
    return data as { synced_count: number };
  },

  // Campaigns
  async listCampaigns(sessionId?: string) {
    let q = supabase.from("whatsapp_meta_campaigns").select("*").order("created_at", { ascending: false });
    if (sessionId) q = q.eq("session_id", sessionId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as MetaCampaign[];
  },
  async createCampaign(payload: Partial<MetaCampaign>) {
    const { data, error } = await supabase
      .from("whatsapp_meta_campaigns")
      .insert(payload as any)
      .select()
      .single();
    if (error) throw error;
    return data as MetaCampaign;
  },
  async updateCampaign(id: string, patch: Partial<MetaCampaign>) {
    const { error } = await supabase
      .from("whatsapp_meta_campaigns")
      .update(patch as any)
      .eq("id", id);
    if (error) throw error;
  },
  async deleteCampaign(id: string) {
    const { error } = await supabase.from("whatsapp_meta_campaigns").delete().eq("id", id);
    if (error) throw error;
  },

  // Leads
  async listLeads(filters?: { campaign_id?: string; status?: string }) {
    let q = supabase.from("whatsapp_meta_leads").select("*").order("created_at", { ascending: false });
    if (filters?.campaign_id) q = q.eq("campaign_id", filters.campaign_id);
    if (filters?.status) q = q.eq("status", filters.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as MetaLead[];
  },
  async updateLead(id: string, patch: Partial<MetaLead>) {
    const { error } = await supabase.from("whatsapp_meta_leads").update(patch as any).eq("id", id);
    if (error) throw error;
  },

  // Send
  async sendMessage(payload: {
    session_id: string;
    phone_number: string;
    message_type: "text" | "template";
    text?: string;
    template_name?: string;
    template_language?: string;
    template_components?: unknown[];
  }) {
    const { data, error } = await supabase.functions.invoke("meta-send-message", { body: payload });
    if (error) throw error;
    return data;
  },

  // OAuth
  buildOAuthUrl(appId: string, redirectUri: string, state: string) {
    const u = new URL("https://www.facebook.com/v20.0/dialog/oauth");
    u.searchParams.set("client_id", appId);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set(
      "scope",
      "whatsapp_business_messaging,whatsapp_business_management,business_management",
    );
    u.searchParams.set("state", state);
    return u.toString();
  },
  async exchangeOAuthCode(sessionId: string, code: string, redirectUri: string) {
    const { data, error } = await supabase.functions.invoke("meta-oauth-callback", {
      body: { session_id: sessionId, code, redirect_uri: redirectUri },
    });
    if (error) throw error;
    return data;
  },

  webhookUrl(verifyToken: string) {
    return `https://${PROJECT_ID}.supabase.co/functions/v1/whatsapp-meta-webhook`;
  },
};