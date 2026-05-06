import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../contexts/CompanyContext";
import { settingsService } from "../services/settingsService";

export default function UsersManager() {
  const { currentCompany, hasPermission } = useCompany();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");

  const canManage = hasPermission("settings.users.manage");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["settings_company_users", currentCompany?.id],
    queryFn: () => (currentCompany ? settingsService.listarUsuariosDaEmpresa(currentCompany.id) : []),
    enabled: !!currentCompany,
  });
  const { data: perfis = [] } = useQuery({
    queryKey: ["settings_profiles", currentCompany?.id],
    queryFn: () => (currentCompany ? settingsService.listarPerfis(currentCompany.id) : []),
    enabled: !!currentCompany,
  });

  const filtered = (links as any[]).filter((l) =>
    !busca ||
    l.settings_users?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    l.settings_users?.email?.toLowerCase().includes(busca.toLowerCase())
  );

  async function alterarPerfil(userId: string, profileId: string) {
    if (!currentCompany) return;
    try {
      await settingsService.vincularUsuarioEmpresa(userId, currentCompany.id, profileId);
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["settings_company_users", currentCompany.id] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function alterarStatus(userId: string, status: "active" | "inactive") {
    try {
      await settingsService.atualizarStatusUsuario(userId, status);
      toast.success("Status atualizado");
      qc.invalidateQueries();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Usuários da empresa</CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => toast.info("Convide o usuário pela tela de Cadastro. Após criar, ele será vinculado a esta empresa automaticamente.")}>
            <UserPlus className="mr-2 h-4 w-4" /> Convidar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Buscar nome ou email..." value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-sm" />
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum usuário.</TableCell></TableRow>
              ) : filtered.map((l: any) => (
                <TableRow key={l.user_id}>
                  <TableCell className="font-medium">
                    {l.settings_users?.nome}
                    {l.settings_users?.is_super_admin && <Badge className="ml-2 bg-violet-600 text-white">Super</Badge>}
                  </TableCell>
                  <TableCell>{l.settings_users?.email}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select value={l.profile_id ?? ""} onValueChange={(v) => alterarPerfil(l.user_id, v)}>
                        <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {perfis.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">{l.settings_profiles?.nome ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.settings_users?.status === "active" ? "default" : "secondary"}>
                      {l.settings_users?.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => alterarStatus(l.user_id, l.settings_users?.status === "active" ? "inactive" : "active")}
                      >
                        {l.settings_users?.status === "active" ? "Desativar" : "Reativar"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}