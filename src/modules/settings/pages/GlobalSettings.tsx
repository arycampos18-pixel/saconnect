import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../contexts/CompanyContext";
import { settingsService, type SettingsGlobalRow } from "../services/settingsService";

const ALL_MODULES = [
  "dashboard", "eleitores", "whatsapp", "atendimento", "disparos", "eventos",
  "agenda", "crm", "relatorios", "automacoes", "departamentos", "campanhas",
  "pesquisa", "mapa", "predicao", "concorrencia", "gamificacao", "settings",
];

export default function GlobalSettings() {
  const { currentCompany, hasPermission } = useCompany();
  const canManage = hasPermission("settings.global.manage");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["settings_global", currentCompany?.id],
    queryFn: () => (currentCompany ? settingsService.obterGlobal(currentCompany.id) : null),
    enabled: !!currentCompany,
  });

  const [form, setForm] = useState<Partial<SettingsGlobalRow>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  function toggleModule(mod: string) {
    const list = new Set(form.active_modules ?? []);
    list.has(mod) ? list.delete(mod) : list.add(mod);
    setForm({ ...form, active_modules: Array.from(list) });
  }

  async function salvar() {
    if (!currentCompany) return;
    setSaving(true);
    try {
      await settingsService.salvarGlobal(currentCompany.id, form);
      toast.success("Configurações salvas");
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  if (isLoading) return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Configurações gerais da empresa</CardTitle>
          {canManage && (
            <Button onClick={salvar} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Nome do sistema</Label>
            <Input value={form.system_name ?? ""} onChange={(e) => setForm({ ...form, system_name: e.target.value })} disabled={!canManage} />
          </div>
          <div><Label>Fuso horário</Label>
            <Input value={form.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} disabled={!canManage} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Módulos ativos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {ALL_MODULES.map((m) => (
              <label key={m} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <Checkbox checked={(form.active_modules ?? []).includes(m)} onCheckedChange={() => toggleModule(m)} disabled={!canManage} />
                <span className="capitalize">{m}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}