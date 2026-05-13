/**
 * Gera UUID v4 compatível com todos os contextos (HTTP e HTTPS).
 * crypto.randomUUID() só funciona em contextos seguros (HTTPS).
 * Este fallback usa crypto.getRandomValues() quando disponível,
 * ou Math.random() como último recurso.
 */
export function generateUUID(): string {
  // Contexto seguro (HTTPS) — método nativo mais seguro
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Contexto inseguro (HTTP) — usa getRandomValues se disponível
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // versão 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  // Último recurso (browsers muito antigos)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
