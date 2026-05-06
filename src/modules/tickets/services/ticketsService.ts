import { supabase } from '@/integrations/supabase/client';
import type { Ticket, TicketCategory, TicketEvent, TicketMessage, TicketQueue } from '../types';

const sb: any = supabase;

export const ticketsService = {
  // Tickets
  async list(companyId: string, filters: Partial<{ status: string; priority: string; queue_id: string; category_id: string; assigned_to: string; with_event: boolean }> = {}) {
    let q = sb.from('tickets').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.priority) q = q.eq('priority', filters.priority);
    if (filters.queue_id) q = q.eq('queue_id', filters.queue_id);
    if (filters.category_id) q = q.eq('category_id', filters.category_id);
    if (filters.assigned_to) q = q.eq('assigned_to', filters.assigned_to);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Ticket[];
  },
  async get(id: string) {
    const { data, error } = await sb.from('tickets').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Ticket | null;
  },
  async create(companyId: string, payload: Partial<Ticket>) {
    const { data, error } = await sb.from('tickets').insert({ ...payload, company_id: companyId }).select().single();
    if (error) throw error;
    return data as Ticket;
  },
  async update(id: string, patch: Partial<Ticket>) {
    const { data, error } = await sb.from('tickets').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data as Ticket;
  },
  async remove(id: string) {
    const { error } = await sb.from('tickets').delete().eq('id', id);
    if (error) throw error;
  },

  // Mensagens
  async listMessages(ticketId: string) {
    const { data, error } = await sb.from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at');
    if (error) throw error;
    return (data ?? []) as TicketMessage[];
  },
  async addMessage(companyId: string, payload: Partial<TicketMessage>) {
    const { data, error } = await sb.from('ticket_messages').insert({ ...payload, company_id: companyId }).select().single();
    if (error) throw error;
    return data as TicketMessage;
  },

  // Categorias
  async listCategories(companyId: string) {
    const { data, error } = await sb.from('ticket_categories').select('*').eq('company_id', companyId).order('name');
    if (error) throw error;
    return (data ?? []) as TicketCategory[];
  },
  async createCategory(companyId: string, payload: Partial<TicketCategory>) {
    const { data, error } = await sb.from('ticket_categories').insert({ ...payload, company_id: companyId }).select().single();
    if (error) throw error;
    return data as TicketCategory;
  },
  async deleteCategory(id: string) { const { error } = await sb.from('ticket_categories').delete().eq('id', id); if (error) throw error; },

  // Filas
  async listQueues(companyId: string) {
    const { data, error } = await sb.from('ticket_queues').select('*').eq('company_id', companyId).order('name');
    if (error) throw error;
    return (data ?? []) as TicketQueue[];
  },
  async createQueue(companyId: string, payload: Partial<TicketQueue>) {
    const { data, error } = await sb.from('ticket_queues').insert({ ...payload, company_id: companyId }).select().single();
    if (error) throw error;
    return data as TicketQueue;
  },
  async deleteQueue(id: string) { const { error } = await sb.from('ticket_queues').delete().eq('id', id); if (error) throw error; },

  // Eventos / Agenda
  async listEvents(companyId: string, agentId?: string) {
    let q = sb.from('ticket_events').select('*').eq('company_id', companyId).order('start_datetime');
    if (agentId) q = q.eq('agent_id', agentId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as TicketEvent[];
  },
  async listEventsByTicket(ticketId: string) {
    const { data, error } = await sb.from('ticket_events').select('*').eq('ticket_id', ticketId).order('start_datetime');
    if (error) throw error;
    return (data ?? []) as TicketEvent[];
  },
  async createEvent(companyId: string, payload: Partial<TicketEvent>) {
    const { data, error } = await sb.from('ticket_events').insert({ ...payload, company_id: companyId }).select().single();
    if (error) throw error;
    return data as TicketEvent;
  },
  async updateEvent(id: string, patch: Partial<TicketEvent>) {
    const { data, error } = await sb.from('ticket_events').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data as TicketEvent;
  },
  async deleteEvent(id: string) { const { error } = await sb.from('ticket_events').delete().eq('id', id); if (error) throw error; },
};
