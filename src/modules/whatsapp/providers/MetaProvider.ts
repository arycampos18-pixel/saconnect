import type {
  IWhatsAppProvider,
  WhatsAppMessagePayload,
  NormalizedInboundMessage,
  ConnectionResult,
} from './WhatsAppProviderInterface';

/**
 * Implementação Meta Cloud API (WhatsApp Business).
 * Stub no client — chamadas reais ficam nas edge functions.
 */
export class MetaProvider implements IWhatsAppProvider {
  readonly type = 'meta' as const;

  async connect(credentials: Record<string, any>): Promise<ConnectionResult> {
    return {
      status: credentials?.accessToken ? 'connected' : 'disconnected',
      phoneNumber: credentials?.phoneNumberId,
    };
  }

  async disconnect(_credentials: Record<string, any>): Promise<boolean> {
    return true;
  }

  async getConnectionStatus(credentials: Record<string, any>): Promise<ConnectionResult> {
    return {
      status: credentials?.accessToken ? 'connected' : 'disconnected',
    };
  }

  async sendMessage(
    _credentials: Record<string, any>,
    _payload: WhatsAppMessagePayload,
  ): Promise<{ externalId: string | null; raw?: any }> {
    return { externalId: null };
  }

  parseWebhookPayload(payload: any): NormalizedInboundMessage | null {
    const entry = payload?.entry?.[0]?.changes?.[0]?.value;
    const msg = entry?.messages?.[0];
    if (!msg) return null;
    return {
      externalId: String(msg.id),
      from: String(msg.from),
      fromName: entry?.contacts?.[0]?.profile?.name,
      type: (msg.type ?? 'text') as NormalizedInboundMessage['type'],
      content: msg.text?.body,
      timestamp: Number(msg.timestamp ?? Date.now()),
      raw: payload,
    };
  }
}
