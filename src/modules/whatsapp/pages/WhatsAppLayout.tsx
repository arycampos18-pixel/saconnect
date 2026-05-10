import { Outlet } from "react-router-dom";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { WhatsAppProviderTabs } from "@/modules/whatsapp/components/ProviderTabs";

export default function WhatsAppLayout() {
  const { currentCompany } = useCompany();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Multi-tenant • Empresa atual:{" "}
          <span className="font-medium text-foreground">{currentCompany?.nome_fantasia ?? "—"}</span>
        </p>
      </div>

      <WhatsAppProviderTabs />

      <Outlet />
    </div>
  );
}
