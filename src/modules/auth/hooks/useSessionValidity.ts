import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/modules/auth/services/authService";
import { toast } from "sonner";

/**
 * Verifica se uma sessão Supabase ainda é válida (não expirada).
 * `expires_at` é em segundos (epoch). Sessões sem `expires_at` são tratadas como válidas.
 */
export function isSessionValid(session: Session | null | undefined): boolean {
  if (!session) return false;
  const exp = session.expires_at;
  if (!exp) return true;
  return exp * 1000 > Date.now();
}

type Options = {
  /** Intervalo de revalidação em ms (default: 60s) */
  intervalMs?: number;
  /** Chamado quando a sessão é detectada como expirada/inválida */
  onExpired?: () => void;
  /** Mostrar toast e fazer signOut automaticamente ao expirar (default: true) */
  autoSignOut?: boolean;
};

/**
 * Hook que monitora a validade da sessão atual.
 * - Revalida em intervalo, ao focar a janela e ao voltar a aba para visível.
 * - Quando expirada, opcionalmente faz signOut e exibe toast.
 *
 * Retorna `expired = true` quando a sessão deixou de ser válida.
 */
export function useSessionValidity(
  session: Session | null,
  { intervalMs = 60_000, onExpired, autoSignOut = true }: Options = {},
) {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!session) {
      setExpired(false);
      return;
    }

    let cancelled = false;

    const handleExpired = async () => {
      if (cancelled) return;
      setExpired(true);
      if (autoSignOut) {
        await authService.signOut();
        toast.error("Sua sessão expirou. Faça login novamente.");
      }
      onExpired?.();
    };

    const check = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error || !isSessionValid(data.session)) {
        await handleExpired();
      }
    };

    const interval = setInterval(check, intervalMs);
    const onFocus = () => check();
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session, intervalMs, autoSignOut, onExpired]);

  return { expired, valid: isSessionValid(session) && !expired };
}