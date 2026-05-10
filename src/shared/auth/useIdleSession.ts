import { useEffect, useRef, useState, useCallback } from "react";

export const IDLE_MS = 10 * 60 * 1000; // 10 minutos
export const WARN_MS = 60 * 1000; // último minuto destaca o contador

const EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
];

/**
 * Hook de logout por inatividade.
 * - Reinicia o contador a cada interacção (debounced a 1s).
 * - Quando expira, chama `onExpire` (signOut + redirect).
 * - Expõe `remainingMs` para um indicador visual no header.
 */
export function useIdleSession(opts: {
  enabled: boolean;
  onExpire: () => void;
  idleMs?: number;
}) {
  const { enabled, onExpire, idleMs = IDLE_MS } = opts;
  const [remainingMs, setRemainingMs] = useState<number>(idleMs);
  const lastActivityRef = useRef<number>(Date.now());
  const lastBumpRef = useRef<number>(0);
  const expiredRef = useRef(false);

  const bump = useCallback(() => {
    const now = Date.now();
    if (now - lastBumpRef.current < 1000) return; // debounce
    lastBumpRef.current = now;
    lastActivityRef.current = now;
    setRemainingMs(idleMs);
  }, [idleMs]);

  useEffect(() => {
    if (!enabled) return;
    EVENTS.forEach((ev) =>
      document.addEventListener(ev, bump, { passive: true } as AddEventListenerOptions),
    );
    return () => {
      EVENTS.forEach((ev) => document.removeEventListener(ev, bump));
    };
  }, [enabled, bump]);

  useEffect(() => {
    if (!enabled) return;
    expiredRef.current = false;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, idleMs - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [enabled, idleMs, onExpire]);

  return { remainingMs };
}