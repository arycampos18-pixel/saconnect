import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePendentesCount() {
  return useQuery({
    queryKey: ["conversas-pendentes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("whatsapp_conversas")
        .select("id", { count: "exact", head: true })
        .eq("status", "Pendente");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });
}