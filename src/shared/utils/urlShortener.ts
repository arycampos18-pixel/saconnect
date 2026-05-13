/**
 * Encurta uma URL usando is.gd (gratuito, sem API key).
 * Retorna a URL original se o serviço falhar.
 * Necessário porque WhatsApp não linkifica URLs com IP como host.
 */
export async function encurtarUrl(url: string): Promise<string> {
  try {
    const res = await fetch(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const curto = (await res.text()).trim();
      // Valida que retornou uma URL válida
      if (curto.startsWith("http")) return curto;
    }
  } catch { /* fallback */ }
  return url;
}
