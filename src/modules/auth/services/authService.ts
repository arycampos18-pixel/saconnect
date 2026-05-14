import { supabase } from "@/integrations/supabase/client";
import { authLog } from "@/modules/auth/utils/authLogger";
import { publicAppOrigin } from "@/shared/utils/publicAppOrigin";

export type SignUpInput = {
  nome: string;
  email: string;
  password: string;
  telefone?: string;
  cargo?: string;
};

export type SignInFailureKind = "credentials" | "profile" | "inactive";

export type SignInResult = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>> & {
  signInFailureKind?: SignInFailureKind;
};

export const authService = {
  async signIn(email: string, password: string): Promise<SignInResult> {
    authLog("info", "signIn.attempt", { email });
    const result = await supabase.auth.signInWithPassword({ email, password });

    if (result.error || !result.data.user) {
      authLog("warn", "signIn.failed", {
        email,
        message: result.error?.message,
        status: (result.error as { status?: number } | null)?.status,
      });
      return { ...result, signInFailureKind: "credentials" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ativo")
      .eq("user_id", result.data.user.id)
      .maybeSingle();

    if (profileError) {
      authLog("error", "signIn.profile_error", { message: profileError.message });
      await supabase.auth.signOut();
      return {
        ...result,
        error: profileError,
        signInFailureKind: "profile",
      };
    }

    if (profile?.ativo === false) {
      authLog("warn", "signIn.inactive_user", { userId: result.data.user.id });
      await supabase.auth.signOut();
      return {
        ...result,
        error: new Error("Usuário inativo. Procure um administrador para reativar seu acesso."),
        signInFailureKind: "inactive",
      };
    }

    authLog("info", "signIn.success", { userId: result.data.user.id });
    return result;
  },

  async signUp({ nome, email, password, telefone, cargo }: SignUpInput) {
    const redirectUrl = `${publicAppOrigin()}/app`;
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { nome, telefone, cargo },
      },
    });
  },

  async signOut() {
    authLog("info", "signOut.attempt");
    const result = await supabase.auth.signOut();
    // Limpa qualquer dado sensível que possa ter sido armazenado localmente
    try {
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith("sb-") ||
          key.startsWith("supabase") ||
          key.startsWith("sa-cache-") ||
          key.includes("auth")
        ) {
          // mantém apenas chaves não sensíveis (como tema)
          if (key === "sa-theme") return;
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    return result;
  },

  async resetPassword(email: string) {
    const redirectTo = `${publicAppOrigin()}/reset-password`;
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },

  async updatePassword(newPassword: string) {
    return await supabase.auth.updateUser({ password: newPassword });
  },

  async getSession() {
    return await supabase.auth.getSession();
  },
};