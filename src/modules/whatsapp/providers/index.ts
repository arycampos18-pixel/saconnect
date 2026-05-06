import type { IWhatsAppProvider, WhatsAppProviderType } from './WhatsAppProviderInterface';
import { ZApiProvider } from './ZApiProvider';
import { MetaWhatsAppProvider } from './MetaWhatsAppProvider';

/**
 * Factory que retorna a implementação certa do provider.
 * As implementações reais (chamadas HTTP) ficam nas edge functions;
 * aqui no client expomos apenas a forma para tipagem e helpers leves.
 */
export function getProvider(type: WhatsAppProviderType): IWhatsAppProvider {
  switch (type) {
    case 'zapi':
      return new ZApiProvider();
    case 'meta':
      return new MetaWhatsAppProvider();
    case 'webjs':
      throw new Error('Provider webjs ainda não implementado');
    default:
      throw new Error(`Provider desconhecido: ${type}`);
  }
}

export type { IWhatsAppProvider, WhatsAppProviderType } from './WhatsAppProviderInterface';
