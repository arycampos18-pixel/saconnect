import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import { permissoesService } from "@/modules/cadastros/services/permissoesService";
import { TODOS_IDS } from "@/modules/cadastros/data/modulosCatalogo";

/**
 * Resolve a lista de IDs de módulos visíveis para o usuário atual.
 * Override por usuário tem precedência sobre o preset do papel.
 */
export function useModulosPermitidos() {
  const { user } = useAuth();
  const { role, loading: loadingRole } = useUserRole();
  const qc = useQueryClient();

  const { data: modulos = [], isLoading } = useQuery({
    queryKey: ["modulos-permitidos", user?.id, role],
    enabled: !!user && !!role && !loadingRole,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      try {
        const override = await permissoesService.getOverride(user!.id);
        if (override && override.length > 0) return override;
        return await permissoesService.getModulosPorRole(role!);
      } catch {
        return role === "admin" ? TODOS_IDS : [];
      }
    },
  });

  // realtime: invalida cache quando presets/overrides mudam
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("modulos-perm-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "role_modulos" }, () => {
        qc.invalidateQueries({ queryKey: ["modulos-permitidos"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_modulos_override", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["modulos-permitidos"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  return {
    modulos,
    loading: loadingRole || (!!user && !!role && isLoading),
    can: (id: string) => role === "admin" || modulos.includes(id),
  };
}