import { supabase } from '@/integrations/supabase/client';
import type { WAContact, WAConversation, WAMessage, WAQueue, WASession } from '../types';

/**
 * Camada de acesso a dados do NOVO módulo WhatsApp multi-tenant.
 * SEMPRE filtra por company_id (RLS no banco também garante isolamento).
 */
export const waService = {
  // ====== SESSIONS ======
  async listSessions(companyId: string): Promise<WASession[]> {
    const { data, error } = await (supabase as any)
      .from('whatsapp_sessions').select('*').eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as WASession[];
  },
  async createSession(companyId: string, payload: Partial<WASession>) {
    const { data, error } = await (supabase as any)
      .from('whatsapp_sessions').insert({ ...payload, company_id: companyId })
      .select().single();
    if (error) throw error;
    return data as WASession;
  },
  async deleteSession(id: string) {
    const { error } = await (supabase as any).from('whatsapp_sessions').delete().eq('id', id);
    if (error) throw error;
  },
  async updateSession(id: string, patch: Partial<WASession>) {
    const { data, error } = await (supabase as any)
      .from('whatsapp_sessions').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data as WASession;
  },

  // ====== CONTACTS ======
  async listContacts(companyId: string): Promise<WAContact[]> {
    const { data, error } = await (supabase as any)
      .from('whatsapp_contacts').select('*').eq('company_id', companyId)
      .order('updated_at', { ascending: false }).limit(500);
    if (error) throw error;
    return (data ?? []) as WAContact[];
  },

  // ====== QUEUES ======
  async listQueues(companyId: string): Promise<WAQueue[]> {
    const { data, error } = await (supabase as any)
      .from('whatsapp_queues').select('*').eq('company_id', companyId).order('name');
    if (error) throw error;
    return (data ?? []) as WAQueue[];
  },
  async createQueue(companyId: string, payload: Partial<WAQueue>) {
    const { data, error } = await (supabase as any)
      .from('whatsapp_queues').insert({ ...payload, company_id: companyId }).select().single();
    if (error) throw error;
    return data as WAQueue;
  },

  // ====== CONVERSATIONS ======
  async listConversations(companyId: string): Promise<WAConversation[]> {
    const { data, error } = await (supabase as any)
      .from('whatsapp_conversations').select('*').eq('company_id', companyId)
      .order('last_message_at', { ascending: false, nullsFirst: false }).limit(200);
    if (error) throw error;
    return (data ?? []) as WAConversation[];
  },

  // ====== MESSAGES ======
  async listMessages(conversationId: string): Promise<WAMessage[]> {
    const { data, error } = await (supabase as any)
      .from('whatsapp_messages').select('*').eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }).limit(500);
    if (error) throw error;
    return (data ?? []) as WAMessage[];
  },
};
