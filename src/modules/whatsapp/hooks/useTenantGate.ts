import { useCompany } from "@/modules/settings/contexts/CompanyContext";

/** Hook utilitário: garante que existe uma empresa selecionada. */
export function useTenantGate() {
  const { currentCompany, hasPermission, isSuperAdmin } = useCompany();
  return {
    companyId: currentCompany?.id ?? null,
    company: currentCompany,
    hasPermission,
    isSuperAdmin,
  };
}
