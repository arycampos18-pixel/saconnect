import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CampoCadastro =
  | "liderancas"
  | "cabos"
  | "departamentos"
  | "categorias"
  | "tags"
  | "tipos_evento"
  | "cat_evento_status"
  | "cat_compromisso_categoria"
  | "cat_compromisso_prioridade"
  | "cat_compromisso_status"
  | "cat_crm_interacao_tipo"
  | "cat_crm_prioridade"
  | "cat_pesquisa_tipo"
  | "cat_post_status";

type Perms = Record<CampoCadastro, boolean>;

const EMPTY: Perms = {
  liderancas: false,
  cabos: false,
  departamentos: false,
  categorias: false,
  tags: false,
  tipos_evento: false,
  cat_evento_status: false,
  cat_compromisso_categoria: false,
  cat_compromisso_prioridade: false,
  cat_compromisso_status: false,
  cat_crm_interacao_tipo: false,
  cat_crm_prioridade: false,
  cat_pesquisa_tipo: false,
  cat_post_status: false,
};

export function usePermissoes() {
  const [perms, setPerms] = useState<Perms>(EMPTY);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) { if (alive) setLoading(false); return; }

      const [roleRes, permRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("user_permissions").select("*").eq("user_id", uid).maybeSingle(),
      ]);
      if (!alive) return;

      const admin = (roleRes.data ?? []).some((r: any) => r.role === "admin" || r.role === "super_admin");
      setIsAdmin(admin);

      const row: any = permRes.data;
      if (admin) {
        setPerms({
          liderancas: true, cabos: true, departamentos: true, categorias: true, tags: true, tipos_evento: true,
          cat_evento_status: true, cat_compromisso_categoria: true, cat_compromisso_prioridade: true,
          cat_compromisso_status: true, cat_crm_interacao_tipo: true, cat_crm_prioridade: true,
          cat_pesquisa_tipo: true, cat_post_status: true,
        });
      } else if (row) {
        const all = !!row.can_create_all;
        const catOk = all || row.can_create_catalogos !== false;
        setPerms({
          liderancas: all || !!row.can_create_liderancas,
          cabos: all || !!row.can_create_cabos,
          departamentos: all || !!row.can_create_departamentos,
          categorias: all || !!row.can_create_categorias,
          tags: all || !!row.can_create_tags,
          tipos_evento: all || !!row.can_create_tipos_evento,
          cat_evento_status: catOk,
          cat_compromisso_categoria: catOk,
          cat_compromisso_prioridade: catOk,
          cat_compromisso_status: catOk,
          cat_crm_interacao_tipo: catOk,
          cat_crm_prioridade: catOk,
          cat_pesquisa_tipo: catOk,
          cat_post_status: catOk,
        });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return {
    isAdmin,
    loading,
    can: (campo: CampoCadastro) => perms[campo],
    perms,
  };
}