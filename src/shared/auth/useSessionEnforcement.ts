import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionJti } from "./sessionFingerprint";

/**
 * Hook de enforcement de sessão única.
 *
 * - Faz heartbeat a cada 60s para a edge function `auth-heartbeat`.
 *   Se o servidor responder { active: false }, dispara `onRevoked`.
 * - Subscreve realtime em `auth_app_sessions` para o utilizador actual.
 *   Quando uma linha activa é marcada como `revoked` (UPDATE) e o jti
 *   corresponde a esta aba, dispara `onRevoked` imediatamente.
 *
 * Documentação interna: o JWT do Supabase continua válido até expirar
 * naturalmente. Esta camada server-side é a fonte de verdade — por isso
 * o cliente nunca confia apenas no JWT para operações sensíveis.
 */
export function useSessionEnforcement(opts: {
  enabled: boolean;
  userId: string | null | undefined;
  onRevoked: (reason: string) => void;
}) {
  const { enabled, userId, onRevoked } = opts;
  const onRevokedRef = useRef(onRevoked);
  onRevokedRef.current = onRevoked;

  // Heartbeat
  useEffect(() => {
    if (!enabled || !userId) return;
    const jti = getSessionJti();
    let cancelled = false;

    const tick = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("auth-heartbeat", {
          body: { session_jti: jti },
        });
        if (cancelled) return;
        if (!error && data && data.active === false) {
          onRevokedRef.current(String(data.reason ?? "revoked"));
        }
      } catch {
        /* tolerante a falhas de rede; tenta de novo no próximo tick */
      }
    };

    const id = window.setInterval(tick, 60_000);
    // tick inicial após 5s (dá tempo ao register-session)
    const initial = window.setTimeout(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(initial);
    };
  }, [enabled, userId]);

  // Realtime: aviso instantâneo ao ser expulso
  useEffect(() => {
    if (!enabled || !userId) return;
    const jti = getSessionJti();
    const channel = supabase
      .channel(`auth-sessions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auth_app_sessions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { session_jti?: string; revoked_at?: string | null; revoked_reason?: string | null };
          if (row?.session_jti === jti && row?.revoked_at) {
            onRevokedRef.current(row.revoked_reason ?? "replaced");
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, userId]);
}