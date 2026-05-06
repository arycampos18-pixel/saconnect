/**
 * Interface comum para todos os provedores de WhatsApp (Z-API, Meta Cloud, WPPConnect).
 * Permite que a lógica de negócio fique desacoplada do provedor específico.
 */

export type WhatsAppProviderType = 'zapi' | 'meta' | 'webjs';

export interface WhatsAppMessagePayload {
  to: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';
  mediaUrl?: string;
  templateName?: string;
  templateParams?: any[];
}

export interface NormalizedInboundMessage {
  externalId: string;
  from: string;
  fromName?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker';
  content?: string;
  mediaUrl?: string;
  timestamp: number;
  raw: any;
}

export interface ConnectionResult {
  status: 'connected' | 'disconnected' | 'qr_pending' | 'connecting';
  qrCode?: string;
  phoneNumber?: string;
  error?: string;
}

export interface IWhatsAppProvider {
  /** Identificador do provedor */
  readonly type: WhatsAppProviderType;

  /** Inicia a conexão (para webjs/zapi gera QR; para Meta valida o token). */
  connect(credentials: Record<string, any>): Promise<ConnectionResult>;

  /** Encerra a conexão. */
  disconnect(credentials: Record<string, any>): Promise<boolean>;

  /** Status atual da conexão. */
  getConnectionStatus(credentials: Record<string, any>): Promise<ConnectionResult>;

  /** Envia uma mensagem; retorna o ID externo (provedor) da mensagem. */
  sendMessage(
    credentials: Record<string, any>,
    payload: WhatsAppMessagePayload,
  ): Promise<{ externalId: string | null; raw?: any }>;

  /** Normaliza um payload de webhook do provedor para o formato interno. */
  parseWebhookPayload(payload: any): NormalizedInboundMessage | null;
}
