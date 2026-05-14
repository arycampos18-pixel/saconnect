/**
 * Origem canónica do site (links públicos, QR, WhatsApp, redirects Supabase).
 * Defina `VITE_PUBLIC_APP_URL=https://saconnect.net.br` no .env de produção
 * para não depender do host em que o operador abriu o painel (ex.: IP da VPS).
 */
export function publicAppOrigin(): string {
  const raw = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      const s = raw.replace(/\/$/, "");
      if (s.startsWith("http://") || s.startsWith("https://")) return s;
      return `https://${s}`;
    }
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
