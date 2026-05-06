export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TicketCategory { id: string; company_id: string; name: string; description: string | null; color: string; created_at: string; }
export interface TicketQueue { id: string; company_id: string; name: string; description: string | null; created_at: string; }
export interface Ticket {
  id: string; company_id: string; ticket_number: number; title: string; description: string | null;
  status: TicketStatus; priority: TicketPriority;
  category_id: string | null; queue_id: string | null;
  requester_name: string | null; requester_email: string | null; requester_phone: string | null;
  assigned_to: string | null; sla_due_at: string | null;
  created_at: string; updated_at: string;
}
export interface TicketMessage {
  id: string; company_id: string; ticket_id: string;
  sender_id: string | null; sender_type: 'agent' | 'customer' | 'system' | null;
  content: string; is_internal_note: boolean; created_at: string;
}
export interface TicketEvent {
  id: string; company_id: string; ticket_id: string | null;
  title: string; description: string | null;
  start_datetime: string; end_datetime: string;
  agent_id: string | null; status: 'scheduled' | 'done' | 'cancelled';
  external_id: string | null; created_at: string; updated_at: string;
}

export const TICKET_EVENTS = {
  CREATED: 'TICKET_CREATED',
  UPDATED: 'TICKET_UPDATED',
  ASSIGNED: 'TICKET_ASSIGNED',
  STATUS_CHANGED: 'TICKET_STATUS_CHANGED',
  MESSAGE_SENT: 'TICKET_MESSAGE_SENT',
  SLA_BREACHED: 'SLA_BREACHED',
  EVENT_SCHEDULED: 'TICKET_EVENT_SCHEDULED',
  EVENT_CANCELED: 'TICKET_EVENT_CANCELED',
} as const;
