import type {
  IWhatsAppProvider,
  WhatsAppMessagePayload,
  NormalizedInboundMessage,
  ConnectionResult,
} from './WhatsAppProviderInterface';

/**
 * Implementação Z-API.
 * As chamadas HTTP reais são feitas pelas edge functions; este wrapper
 * fornece a forma da API e helpers de normalização de webhook usados no client.
 */
export class ZApiProvider implements IWhatsAppProvider {
  readonly type = 'zapi' as const;

  async connect(_credentials: Record<string, any>): Promise<ConnectionResult> {
    return { status: 'qr_pending' };
  }

  async disconnect(_credentials: Record<string, any>): Promise<boolean> {
    return true;
  }

  async getConnectionStatus(_credentials: Record<string, any>): Promise<ConnectionResult> {
    return { status: 'disconnected' };
  }

  async sendMessage(
    _credentials: Record<string, any>,
    _payload: WhatsAppMessagePayload,
  ): Promise<{ externalId: string | null; raw?: any }> {
    return { externalId: null };
  }

  parseWebhookPayload(payload: any): NormalizedInboundMessage | null {
    if (!payload?.phone) return null;
    const text = payload?.text?.message ?? payload?.message ?? '';
    return {
      externalId: String(payload.messageId ?? payload.id ?? Date.now()),
      from: String(payload.phone),
      fromName: payload.senderName,
      type: 'text',
      content: text,
      timestamp: payload.momment ?? Date.now(),
      raw: payload,
    };
  }
}
