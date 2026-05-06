import { supabase } from "@/integrations/supabase/client";
import { authLog } from "@/modules/auth/utils/authLogger";

export type SignUpInput = {
  nome: string;
  email: string;
  password: string;
  telefone?: string;
  cargo?: string;
};

export const authService = {
  async signIn(email: string, password: string) {
    authLog("info", "signIn.attempt", { email });
    const result = await supabase.auth.signInWithPassword({ email, password });

    if (result.error || !result.data.user) {
      authLog("warn", "signIn.failed", {
        email,
        message: result.error?.message,
        status: (result.error as { status?: number } | null)?.status,
      });
      return result;
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
        data: result.data,
        error: profileError,
      };
    }

    if (profile?.ativo === false) {
      authLog("warn", "signIn.inactive_user", { userId: result.data.user.id });
      await supabase.auth.signOut();
      return {
        data: result.data,
        error: new Error("Usuário inativo. Procure um administrador para reativar seu acesso."),
      };
    }

    authLog("info", "signIn.success", { userId: result.data.user.id });
    return result;
  },

  async signUp({ nome, email, password, telefone, cargo }: SignUpInput) {
    const redirectUrl = `${window.location.origin}/app`;
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
    const redirectTo = `${window.location.origin}/reset-password`;
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },

  async updatePassword(newPassword: string) {
    return await supabase.auth.updateUser({ password: newPassword });
  },

  async getSession() {
    return await supabase.auth.getSession();
  },
};