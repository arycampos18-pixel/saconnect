/**
 * Com domínio próprio (saconnect.net.br + HTTPS), o WhatsApp reconhece
 * o link completo automaticamente — não precisa encurtar.
 * Função mantida por compatibilidade; retorna a URL como está.
 */
export async function encurtarUrl(url: string): Promise<string> {
  return url;
}
