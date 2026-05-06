export type WAStatus = 'open' | 'closed' | 'pending' | 'bot';
export type WADirection = 'inbound' | 'outbound';
export type WAMessageType =
  | 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' | 'template';

export interface WASession {
  id: string;
  company_id: string;
  name: string;
  provider: 'zapi' | 'meta' | 'webjs';
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_pending';
  phone_number: string | null;
  credentials: Record<string, any>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WAContact {
  id: string;
  company_id: string;
  phone: string;
  name: string | null;
  profile_pic_url: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WAQueue {
  id: string;
  company_id: string;
  name: string;
  color: string;
  greeting_message: string | null;
  created_at: string;
}

export interface WAConversation {
  id: string;
  company_id: string;
  session_id: string | null;
  contact_id: string;
  status: WAStatus;
  agent_id: string | null;
  queue_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface WAMessage {
  id: string;
  company_id: string;
  conversation_id: string;
  message_id_external: string | null;
  direction: WADirection;
  type: WAMessageType;
  content: string | null;
  media_url: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sender_id: string | null;
  created_at: string;
}
