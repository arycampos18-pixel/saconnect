import { supabase } from '@/integrations/supabase/client';
const sb: any = supabase;

export const googleCalendarService = {
  async getIntegration(userId: string) {
    const { data } = await sb.from('ticket_calendar_integrations').select('*').eq('user_id', userId).maybeSingle();
    return data;
  },
  async saveIntegration(companyId: string, userId: string, patch: any) {
    const existing = await this.getIntegration(userId);
    if (existing) {
      const { data, error } = await sb.from('ticket_calendar_integrations').update(patch).eq('user_id', userId).select().single();
      if (error) throw error; return data;
    }
    const { data, error } = await sb.from('ticket_calendar_integrations')
      .insert({ company_id: companyId, user_id: userId, ...patch }).select().single();
    if (error) throw error; return data;
  },
  async disconnect(userId: string) {
    const { error } = await sb.from('ticket_calendar_integrations').delete().eq('user_id', userId);
    if (error) throw error;
  },

  async startOAuth(companyId: string) {
    const { data, error } = await supabase.functions.invoke('tickets-google-oauth-start', {
      body: { company_id: companyId, return_to: window.location.pathname },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Falha ao iniciar OAuth');
    const w = window.open(data.url, 'google-oauth', 'width=520,height=640');
    if (!w) window.location.href = data.url;
  },

  async syncEvent(eventId: string, action: 'upsert' | 'delete' = 'upsert') {
    try {
      const { data, error } = await supabase.functions.invoke('tickets-google-sync', {
        body: { event_id: eventId, action },
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[google-calendar sync] falhou (silencioso):', e);
      return { skipped: true };
    }
  },
};
