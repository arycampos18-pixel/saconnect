import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CatalogoItem { id: string; nome: string; }

/** Lista valores ativos do catálogo customizado por categoria (system + da empresa). */
export function useCatalogoCustomizado(categoria: string) {
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("catalogos_customizados" as any)
      .select("id, nome")
      .eq("categoria", categoria)
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    setItems(((data as any[]) ?? []).map((r) => ({ id: r.id, nome: r.nome })));
    setLoading(false);
  }, [categoria]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, loading, refetch: fetchItems, addLocal: (it: CatalogoItem) => setItems((p) => [...p, it]) };
}
