import { useCompany } from "@/modules/settings/contexts/CompanyContext";
export function useTicketsTenant() {
  const { currentCompany, hasPermission, isSuperAdmin } = useCompany();
  return { companyId: currentCompany?.id ?? null, hasPermission, isSuperAdmin };
}
