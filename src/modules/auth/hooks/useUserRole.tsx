import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export type AppRole = "admin" | "lideranca" | "operador";

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();

  const { data: role = null, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user && !authLoading,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      const roles = (data ?? []).map((r) => r.role as AppRole);
      const priority: AppRole[] = ["admin", "lideranca", "operador"];
      return priority.find((p) => roles.includes(p)) ?? null;
    },
  });

  return { role, isAdmin: role === "admin", loading: authLoading || (!!user && isLoading) };
}