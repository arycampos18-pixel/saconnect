import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../contexts/CompanyContext";
import { settingsService, type SettingsProfile } from "../services/settingsService";

/** Perfis RBAC — definição de perfis (CRUD). Matriz de permissões: rota `/app/settings/permissions`. */
export default function ProfilesManager() {
  const { currentCompany, hasPermission } = useCompany();
  const qc = useQueryClient();
  const canManage = hasPermission("settings.profiles.manage");

  const [openNew, setOpenNew] = useState(false);
  const [novo, setNovo] = useState({ nome: "", descricao: "" });

  const { data: perfis = [], isLoading } = useQuery({
    queryKey: ["settings_profiles", currentCompany?.id],
    queryFn: () => (currentCompany ? settingsService.listarPerfis(currentCompany.id) : []),
    enabled: !!currentCompany,
  });

  async function criarPerfil() {
    if (!currentCompany) return;
    try {
      const p = await settingsService.criarPerfil({ ...novo, company_id: currentCompany.id });
      toast.success("Perfil criado");
      setOpenNew(false);
      setNovo({ nome: "", descricao: "" });
      qc.invalidateQueries({ queryKey: ["settings_profiles", currentCompany.id] });
      return p;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  }

  async function remover(p: SettingsProfile) {
    if (p.is_system_default) return toast.error("Perfis padrão do sistema não podem ser removidos");
    if (!confirm(`Remover perfil "${p.nome}"?`)) return;
    try {
      await settingsService.removerPerfil(p.id);
      toast.success("Perfil removido");
      qc.invalidateQueries({ queryKey: ["settings_profiles", currentCompany?.id] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!currentCompany) {
    return <p className="text-sm text-muted-foreground">Selecione uma empresa no seletor global.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gerencie <strong>perfis</strong> (papéis). As permissões granulares são editadas na página{" "}
        <Link to="/app/settings/permissions" className="font-medium text-primary underline-offset-4 hover:underline">
          Matriz de permissões
        </Link>
        .
      </p>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Perfis da empresa</CardTitle>
          {canManage && (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Novo perfil
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo perfil</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome</Label>
                    <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNew(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      const p = await criarPerfil();
                      if (p) setOpenNew(false);
                    }}
                    disabled={!novo.nome}
                  >
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <ul className="divide-y rounded-lg border">
              {perfis.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{p.nome}</p>
                    {p.descricao && <p className="text-muted-foreground">{p.descricao}</p>}
                    {p.is_system_default && (
                      <span className="text-[10px] uppercase text-muted-foreground">perfil de sistema</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPermission("settings.profiles.view") && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/app/settings/permissions?profile=${p.id}`}>
                          <Shield className="mr-2 h-4 w-4" />
                          Permissões
                        </Link>
                      </Button>
                    )}
                    {canManage && !p.is_system_default && (
                      <Button variant="ghost" size="icon" onClick={() => remover(p)} aria-label="Remover perfil">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
