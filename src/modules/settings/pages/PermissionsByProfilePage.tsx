import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../contexts/CompanyContext";
import { settingsService, type SettingsProfile } from "../services/settingsService";
import { ProfilePermissionsMatrix } from "../components/ProfilePermissionsMatrix";

/** Matriz de permissões por perfil — página isolada (sem CRUD de nomes de perfil). */
export default function PermissionsByProfilePage() {
  const { currentCompany, hasPermission } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const canManage = hasPermission("settings.profiles.manage");

  const [selected, setSelected] = useState<SettingsProfile | null>(null);
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { data: perfis = [] } = useQuery({
    queryKey: ["settings_profiles", currentCompany?.id],
    queryFn: () => (currentCompany ? settingsService.listarPerfis(currentCompany.id) : []),
    enabled: !!currentCompany,
  });

  const { data: dicionario = [] } = useQuery({
    queryKey: ["settings_permissions"],
    queryFn: () => settingsService.listarPermissoes(),
  });

  const grouped = useMemo(() => {
    const out: Record<string, typeof dicionario> = {};
    dicionario.forEach((p) => {
      (out[p.module] ||= []).push(p);
    });
    return out;
  }, [dicionario]);

  const profileIdFromUrl = searchParams.get("profile");

  useEffect(() => {
    if (!perfis.length) {
      setSelected(null);
      return;
    }
    if (profileIdFromUrl) {
      const found = perfis.find((p) => p.id === profileIdFromUrl);
      if (found) {
        setSelected(found);
        return;
      }
    }
    setSelected(perfis[0]);
  }, [perfis, profileIdFromUrl]);

  useEffect(() => {
    if (!selected) return;
    settingsService.permissoesDoPerfil(selected.id).then((ps) => setPerms(new Set(ps)));
  }, [selected]);

  function toggle(id: string) {
    setPerms((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function salvar() {
    if (!selected) return;
    setSaving(true);
    try {
      await settingsService.definirPermissoesDoPerfil(selected.id, Array.from(perms));
      toast.success("Permissões salvas");
      qc.invalidateQueries({ queryKey: ["settings_profiles", currentCompany?.id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function onProfileChange(id: string) {
    const p = perfis.find((x) => x.id === id) ?? null;
    setSelected(p);
    setSearchParams(p ? { profile: p.id } : {});
  }

  if (!currentCompany) {
    return <p className="text-sm text-muted-foreground">Selecione uma empresa no seletor global.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada permissão é um identificador global (ex.: <code className="text-xs">whatsapp.chat.send</code>). O
        enforcement definitivo é no banco (RLS) e nas políticas; aqui você define o perfil.
      </p>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-base">Perfil ativo</CardTitle>
            <div className="w-full max-w-md">
              <Label className="sr-only">Perfil</Label>
              <Select value={selected?.id ?? ""} onValueChange={onProfileChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {perfis.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selected?.descricao && <p className="text-sm text-muted-foreground">{selected.descricao}</p>}
          </div>
          {selected && canManage && (
            <Button size="sm" onClick={salvar} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar permissões
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!selected ? (
            <p className="text-sm text-muted-foreground">Nenhum perfil nesta empresa.</p>
          ) : (
            <ProfilePermissionsMatrix grouped={grouped} perms={perms} onToggle={toggle} canManage={canManage} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
