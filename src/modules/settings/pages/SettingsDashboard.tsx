import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, ShieldCheck, Activity } from "lucide-react";
import { useCompany } from "../contexts/CompanyContext";
import { settingsService } from "../services/settingsService";

export default function SettingsDashboard() {
  const { currentCompany, isSuperAdmin } = useCompany();

  const { data: usuarios = [] } = useQuery({
    queryKey: ["settings_users", currentCompany?.id],
    queryFn: () => (currentCompany ? settingsService.listarUsuariosDaEmpresa(currentCompany.id) : []),
    enabled: !!currentCompany,
  });
  const { data: perfis = [] } = useQuery({
    queryKey: ["settings_profiles", currentCompany?.id],
    queryFn: () => (currentCompany ? settingsService.listarPerfis(currentCompany.id) : []),
    enabled: !!currentCompany,
  });
  const { data: empresas = [] } = useQuery({
    queryKey: ["settings_companies"],
    queryFn: () => settingsService.listarEmpresas(),
    enabled: isSuperAdmin,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["settings_audit", currentCompany?.id],
    queryFn: () => settingsService.listarLogs(currentCompany?.id, 10),
    enabled: !!currentCompany,
  });

  const cards = [
    { label: "Usuários ativos", value: usuarios.length, icon: Users, color: "text-blue-600" },
    { label: "Perfis", value: perfis.length, icon: ShieldCheck, color: "text-emerald-600" },
    ...(isSuperAdmin ? [{ label: "Empresas", value: empresas.length, icon: Building2, color: "text-violet-600" }] : []),
    { label: "Eventos (últimos)", value: logs.length, icon: Activity, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-3xl font-bold">{c.value}</p>
              </div>
              <c.icon className={`h-8 w-8 ${c.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Atividade recente</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
          ) : (
            <ul className="divide-y">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{l.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}