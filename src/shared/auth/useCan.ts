import { useCompany } from "@/modules/settings/contexts/CompanyContext";

/**
 * Hook utilitário para checar permissões de UI.
 * - `can(p)` → boolean
 * - `requireOrToast(p)` → faz toast.error e retorna false se faltar permissão
 */
export function useCan() {
  const { hasPermission, isSuperAdmin } = useCompany();
  const can = (perm?: string | null) =>
    !perm || isSuperAdmin || hasPermission(perm);
  return { can, isSuperAdmin };
}
