/**
 * Logger leve para o fluxo de autenticação.
 * - Sempre loga no console (com prefixo + timestamp) para inspeção em produção.
 * - Mantém um buffer circular em memória + localStorage (últimos 50 eventos)
 *   para depurar falhas de sessão/redirect mesmo após reload da página.
 * - Expõe window.__authLogs() para leitura rápida no DevTools.
 */

type AuthLogLevel = "info" | "warn" | "error";

export type AuthLogEntry = {
  ts: string;
  level: AuthLogLevel;
  event: string;
  data?: Record<string, unknown>;
};

const STORAGE_KEY = "sa-auth-logs";
const MAX_ENTRIES = 50;
const PREFIX = "[auth]";

function read(): AuthLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthLogEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: AuthLogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* storage cheio / indisponível — ignora */
  }
}

function safe(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    // Nunca persistir tokens / senhas
    if (/token|password|secret|jwt/i.test(k)) {
      clone[k] = "[redacted]";
      continue;
    }
    if (v instanceof Error) {
      clone[k] = { name: v.name, message: v.message };
    } else if (typeof v === "object" && v !== null) {
      try {
        clone[k] = JSON.parse(JSON.stringify(v));
      } catch {
        clone[k] = String(v);
      }
    } else {
      clone[k] = v;
    }
  }
  return clone;
}

export function authLog(level: AuthLogLevel, event: string, data?: Record<string, unknown>) {
  const entry: AuthLogEntry = {
    ts: new Date().toISOString(),
    level,
    event,
    data: safe(data),
  };

  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  fn(`${PREFIX} ${event}`, entry.data ?? "");

  const buffer = read();
  buffer.push(entry);
  write(buffer);
}

export function getAuthLogs(): AuthLogEntry[] {
  return read();
}

export function clearAuthLogs() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// Atalho para inspeção via DevTools em produção
if (typeof window !== "undefined") {
  (window as unknown as { __authLogs?: () => AuthLogEntry[] }).__authLogs = getAuthLogs;
  (window as unknown as { __clearAuthLogs?: () => void }).__clearAuthLogs = clearAuthLogs;
}

/** Captura erros não tratados (uma única vez por sessão) e os marca como auth-related. */
let globalHandlersInstalled = false;
export function installGlobalAuthErrorHandlers() {
  if (globalHandlersInstalled || typeof window === "undefined") return;
  globalHandlersInstalled = true;

  window.addEventListener("error", (e) => {
    const msg = e?.message || String(e?.error ?? "");
    if (/auth|session|supabase|jwt/i.test(msg)) {
      authLog("error", "window.error", { message: msg, filename: e.filename, lineno: e.lineno });
    }
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e?.reason && (e.reason.message || String(e.reason))) || "unknown";
    if (/auth|session|supabase|jwt/i.test(String(reason))) {
      authLog("error", "unhandledrejection", { reason: String(reason) });
    }
  });
}