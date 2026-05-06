import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../contexts/CompanyContext";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { settingsService } from "../services/settingsService";

/**
 * Vínculos usuário ↔ empresa (página isolada).
 * Foco: empresa padrão, desvincular da empresa atual, visão global (super admin).
 */
export default function UserCompanyLinksPage() {
  const { user } = useAuth();
  const { currentCompany, hasPermission, isSuperAdmin } = useCompany();
  const qc = useQueryClient();
  const canManage = hasPermission("settings.users.manage");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["settings_company_users", currentCompany?.id],
    queryFn: () => (currentCompany ? settingsService.listarUsuariosDaEmpresa(currentCompany.id) : []),
    enabled: !!currentCompany,
  });

  const { data: globalLinks = [], isLoading: loadingGlobal } = useQuery({
    queryKey: ["settings_user_company_global"],
    queryFn: () => settingsService.listarTodosVinculosUsuarioEmpresa(),
    enabled: isSuperAdmin && canManage,
  });

  async function marcarPadrao(userId: string) {
    if (!currentCompany) return;
    try {
      await settingsService.definirEmpresaPadraoDoUsuario(userId, currentCompany.id);
      toast.success("Empresa padrão atualizada para este usuário.");
      qc.invalidateQueries({ queryKey: ["settings_company_users"] });
      qc.invalidateQueries({ queryKey: ["settings_user_company_global"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function desvincular(userId: string) {
    if (!currentCompany) return;
    if (user?.id === userId) {
      toast.error("Você não pode remover o próprio vínculo com a empresa atual.");
      return;
    }
    if (!confirm("Remover este usuário da empresa atual?")) return;
    try {
      await settingsService.desvincularUsuario(userId, currentCompany.id);
      toast.success("Vínculo removido.");
      qc.invalidateQueries({ queryKey: ["settings_company_users"] });
      qc.invalidateQueries({ queryKey: ["settings_user_company_global"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!currentCompany) {
    return <p className="text-sm text-muted-foreground">Selecione uma empresa no seletor global.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Cada linha é um vínculo na tabela <code className="text-xs">settings_user_companies</code>. A empresa{" "}
        <strong>padrão</strong> do usuário é usada em login e contexto inicial.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vínculos nesta empresa</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(links as any[]).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nenhum vínculo.
                    </TableCell>
                  </TableRow>
                ) : (
                  (links as any[]).map((l: any) => (
                    <TableRow key={l.user_id}>
                      <TableCell className="font-medium">{l.settings_users?.nome}</TableCell>
                      <TableCell>{l.settings_users?.email}</TableCell>
                      <TableCell>
                        {l.is_default ? (
                          <Badge>Empresa padrão</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {canManage && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => marcarPadrao(l.user_id)}>
                              <Star className="mr-1 h-3 w-3" />
                              Tornar padrão
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => desvincular(l.user_id)}>
                              <Unlink className="mr-1 h-3 w-3" />
                              Desvincular
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isSuperAdmin && canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visão global (super admin)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingGlobal ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Padrão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalLinks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Nenhum registro ou RLS restringiu a lista.
                      </TableCell>
                    </TableRow>
                  ) : (
                    globalLinks.map((row: any) => (
                      <TableRow key={`${row.user_id}-${row.company_id}`}>
                        <TableCell>{row.settings_users?.nome ?? row.user_id}</TableCell>
                        <TableCell>{row.settings_companies?.nome_fantasia ?? row.company_id}</TableCell>
                        <TableCell>{row.settings_profiles?.nome ?? "—"}</TableCell>
                        <TableCell>{row.is_default ? <Badge>Sim</Badge> : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
