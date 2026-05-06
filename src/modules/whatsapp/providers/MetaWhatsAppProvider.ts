import type {
  IWhatsAppProvider,
  WhatsAppMessagePayload,
  NormalizedInboundMessage,
  ConnectionResult,
} from './WhatsAppProviderInterface';

const META_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Implementação Meta Cloud API (WhatsApp Business Oficial).
 * Stub no client — chamadas reais sensíveis devem ocorrer em edge functions.
 */
export class MetaWhatsAppProvider implements IWhatsAppProvider {
  readonly type = 'meta' as const;

  async connect(credentials: Record<string, any>): Promise<ConnectionResult> {
    return this.getConnectionStatus(credentials);
  }

  async disconnect(_credentials: Record<string, any>): Promise<boolean> {
    return true;
  }

  async getConnectionStatus(credentials: Record<string, any>): Promise<ConnectionResult> {
    try {
      const r = await fetch(`${META_API_URL}/${credentials.phone_number_id}`, {
        headers: { Authorization: `Bearer ${credentials.access_token}` },
      });
      return { status: r.ok ? 'connected' : 'disconnected' };
    } catch {
      return { status: 'disconnected' };
    }
  }

  async sendMessage(
    credentials: Record<string, any>,
    payload: WhatsAppMessagePayload,
  ): Promise<{ externalId: string | null; raw?: any }> {
    const { phone_number_id, access_token } = credentials;
    const messageBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.to,
    };
    if (payload.type === 'template') {
      messageBody.type = 'template';
      messageBody.template = {
        name: payload.templateName,
        language: { code: 'pt_BR' },
        components: payload.templateParams ?? [],
      };
    } else {
      messageBody.type = 'text';
      messageBody.text = { body: payload.content, preview_url: false };
    }

    const resp = await fetch(`${META_API_URL}/${phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(`Meta API Error: ${data?.error?.message ?? 'Unknown error'}`);
    }
    return { externalId: data?.messages?.[0]?.id ?? null, raw: data };
  }

  parseWebhookPayload(payload: any): NormalizedInboundMessage | null {
    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg) return null;
    return {
      externalId: String(msg.id),
      from: String(msg.from),
      fromName: value?.contacts?.[0]?.profile?.name,
      type: (msg.type ?? 'text') as NormalizedInboundMessage['type'],
      content: msg.text?.body,
      timestamp: Number(msg.timestamp ?? Date.now()),
      raw: payload,
    };
  }
}
