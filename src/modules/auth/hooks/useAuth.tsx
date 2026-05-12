import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isSessionValid } from "@/modules/auth/hooks/useSessionValidity";
import { authLog, installGlobalAuthErrorHandlers } from "@/modules/auth/utils/authLogger";

type Profile = {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cargo: string | null;
  telefone: string | null;
  avatar_url: string | null;
  ativo: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const authReadyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    installGlobalAuthErrorHandlers();
    authLog("info", "provider.mount");

    const markAuthReady = () => {
      if (cancelled) return;
      if (!authReadyRef.current) {
        authReadyRef.current = true;
        authLog("info", "auth.ready");
      }
      setLoading(false);
    };

    // 1) listener primeiro (evita race condition)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (cancelled) return;
      authLog("info", "auth.state_change", {
        event: _event,
        hasSession: !!newSession,
        userId: newSession?.user?.id,
        expiresAt: newSession?.expires_at,
      });
      setSession(newSession);
      markAuthReady();
      if (newSession?.user) {
        // defer para evitar deadlock dentro do callback
        setTimeout(() => {
          if (!cancelled) {
            void loadProfile(newSession.user.id);
          }
        }, 0);
      } else {
        setProfile(null);
      }
    });

     // 3) Timeout de segurança (evita white screen se o getSession/listener pendurar)
     const safetyTimeout = setTimeout(() => {
       if (!cancelled && !authReadyRef.current) {
         authLog("warn", "auth.safety_timeout_triggered");
         markAuthReady();
       }
     }, 1500);
 
     // 2) sessão atual
     supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        authLog("error", "getSession.error", { message: error.message });
      } else {
        authLog("info", "getSession.ok", {
          hasSession: !!data.session,
          userId: data.session?.user?.id,
        });
      }
      if (cancelled) return;
      setSession(data.session);
      markAuthReady();
      if (data.session?.user) {
        void loadProfile(data.session.user.id);
      }
    }).catch((err) => {
      if (cancelled) return;
      authLog("error", "getSession.exception", { message: err?.message ?? String(err) });
      markAuthReady();
    });

     return () => {
       cancelled = true;
       clearTimeout(safetyTimeout);
       subscription.unsubscribe();
     };
  }, []);

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, nome, email, cargo, telefone, avatar_url, ativo")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        authLog("error", "loadProfile.error", { userId, message: error.message });
      } else {
        authLog("info", "loadProfile.ok", { userId, found: !!data, ativo: data?.ativo });
      }
      setProfile(data ?? null);
    } catch (error) {
      authLog("error", "loadProfile.exception", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      setProfile(null);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
   isAuthenticated: !!session && isSessionValid(session) && (profile === null || profile.ativo !== false),
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}