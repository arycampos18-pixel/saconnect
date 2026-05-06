import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./cadastrosService";
import { PRESETS_DEFAULT } from "../data/modulosCatalogo";

export const permissoesService = {
  /** Lista os módulos liberados para cada papel (admin/lideranca/operador). */
  async listarRoleModulos(): Promise<Record<string, string[]>> {
    const { data, error } = await supabase
      .from("role_modulos")
      .select("role, modulos");
    if (error) throw error;
    const out: Record<string, string[]> = { ...PRESETS_DEFAULT };
    (data ?? []).forEach((r: any) => { out[r.role] = r.modulos ?? []; });
    return out;
  },

  async getModulosPorRole(role: AppRole): Promise<string[]> {
    const { data, error } = await supabase
      .from("role_modulos")
      .select("modulos")
      .eq("role", role)
      .maybeSingle();
    if (error) throw error;
    return (data?.modulos as string[] | undefined) ?? PRESETS_DEFAULT[role] ?? [];
  },

  async salvarRoleModulos(role: AppRole, modulos: string[]) {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("role_modulos")
      .upsert(
        { role, modulos, updated_by: auth.user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: "role" }
      );
    if (error) throw error;
  },

  /** Override por usuário (opcional) */
  async getOverride(userId: string): Promise<string[] | null> {
    const { data, error } = await supabase
      .from("user_modulos_override")
      .select("modulos")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.modulos ?? null;
  },

  async salvarOverride(userId: string, modulos: string[]) {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("user_modulos_override")
      .upsert(
        { user_id: userId, modulos, updated_by: auth.user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) throw error;
  },

  async removerOverride(userId: string) {
    const { error } = await supabase
      .from("user_modulos_override")
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
  },
};