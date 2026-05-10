// Gera um identificador único por aba de browser para representar a "sessão da app"
// no servidor. Persistido em sessionStorage (some ao fechar a aba).
const KEY = "sa-app-session-jti";

export function getSessionJti(): string {
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = `${crypto.randomUUID()}-${Date.now()}`;
    sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return `${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }
}

export function clearSessionJti() {
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
}

export function getDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Desconhecido";
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Browser";
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Mac OS/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" : "OS";
  return `${browser} / ${os}`;
}