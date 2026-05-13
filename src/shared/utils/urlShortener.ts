/**
 * Encurta uma URL tentando vários serviços em cascata.
 * Necessário porque WhatsApp não linkifica URLs com IP como host — o link
 * precisa ter um domínio real para ficar azul e clicável no WhatsApp.
 *
 * Serviços tentados em ordem:
 *   1. tinyurl.com  (aceita IPs, muito confiável)
 *   2. is.gd        (alternativo)
 *   3. Fallback: retorna URL original
 */
export async function encurtarUrl(url: string): Promise<string> {

  // 1) TinyURL — aceita URLs com IP
  try {
    const res = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const curto = (await res.text()).trim();
      if (curto.startsWith("http") && !curto.includes(url)) return curto;
    }
  } catch { /* próximo */ }

  // 2) is.gd
  try {
    const res = await fetch(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const curto = (await res.text()).trim();
      if (curto.startsWith("http")) return curto;
    }
  } catch { /* próximo */ }

  // 3) Sem encurtamento — retorna original
  return url;
}
