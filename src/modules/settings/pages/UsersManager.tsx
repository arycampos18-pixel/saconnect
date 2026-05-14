import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, UserPlus, UserCog, KeyRound, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../contexts/CompanyContext";
import { settingsService } from "../services/settingsService";
import { NovoUsuarioForm } from "@/modules/cadastros/components/NovoUsuarioForm";
import { authService } from "@/modules/auth/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";

export default function UsersManager() {
  const { currentCompany, hasPermission } = useCompany();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; nome?: string; email?: string } | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [editCadastro, setEditCadastro] = useState<{ userId: string; nome: string; email: string } | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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

  async function enviarResetSenha(email?: string | null, nome?: string | null) {
    if (!email) { toast.error("Usuário sem e-mail cadastrado"); return; }
    try {
      const { error } = await authService.resetPassword(email);
      if (error) throw error;
      toast.success(`Link de redefinição enviado para ${nome ?? email}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar e-mail de redefinição");
    }
  }

  function abrirEditarCadastro(l: { user_id: string; settings_users?: { nome?: string; email?: string } }) {
    setEditCadastro({
      userId: l.user_id,
      nome: l.settings_users?.nome ?? "",
      email: l.settings_users?.email ?? "",
    });
    setEditNome(l.settings_users?.nome ?? "");
    setEditEmail(l.settings_users?.email ?? "");
  }

  async function salvarCadastroUsuario() {
    if (!editCadastro) return;
    if (!editNome.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    if (!editEmail.trim().includes("@")) {
      toast.error("E-mail inválido.");
      return;
    }
    setEditSaving(true);
    try {
      await settingsService.atualizarCadastroUsuario(editCadastro.userId, {
        nome: editNome.trim(),
        email: editEmail.trim(),
      });
      toast.success("Cadastro atualizado.");
      setEditCadastro(null);
      qc.invalidateQueries({ queryKey: ["settings_company_users", currentCompany?.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível salvar (verifique permissões).");
    } finally {
      setEditSaving(false);
    }
  }

  async function definirNovaSenha() {
    if (!resetTarget) return;
    if (novaSenha.length < 8) { toast.error("Senha deve ter pelo menos 8 caracteres"); return; }
    if (novaSenha !== confirmaSenha) { toast.error("Senhas não conferem"); return; }
    setResetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-senha", {
        body: { target_user_id: resetTarget.id, new_password: novaSenha },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Senha redefinida para ${resetTarget.nome ?? resetTarget.email ?? "usuário"}`);
      setResetTarget(null); setNovaSenha(""); setConfirmaSenha("");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao redefinir senha");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Usuários da empresa</CardTitle>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setNovoOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Cadastrar usuário
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Envie o link de cadastro ao usuário. Após criar a conta, ele será vinculado a esta empresa.")}>
              <UserCog className="mr-2 h-4 w-4" /> Convidar
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Lista só quem já está vinculado a <strong>esta empresa</strong> (tabela{" "}
          <code className="rounded bg-muted px-1 text-xs">settings_user_companies</code>). Para marcar empresa
          padrão ou remover vínculo, abra{" "}
          <Link to="/app/settings/user-company" className="font-medium text-primary underline underline-offset-2">
            Vínculos com empresas
          </Link>
          . O mesmo utilizador pode aparecer noutras empresas ao mudar o seletor de empresa no topo.
        </p>
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
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirEditarCadastro(l)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Editar cadastro
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => enviarResetSenha(l.settings_users?.email, l.settings_users?.nome)}
                        >
                          <KeyRound className="mr-1 h-3.5 w-3.5" /> Esqueci a senha
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResetTarget({ id: l.user_id, nome: l.settings_users?.nome, email: l.settings_users?.email })}
                        >
                          <KeyRound className="mr-1 h-3.5 w-3.5" /> Definir senha
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alterarStatus(l.user_id, l.settings_users?.status === "active" ? "inactive" : "active")}
                        >
                          {l.settings_users?.status === "active" ? "Desativar" : "Reativar"}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar novo usuário</DialogTitle>
          </DialogHeader>
          <NovoUsuarioForm
            onCreated={() => {
              setNovoOpen(false);
              qc.invalidateQueries({ queryKey: ["settings_company_users", currentCompany?.id] });
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editCadastro}
        onOpenChange={(v) => {
          if (!v) {
            setEditCadastro(null);
            setEditNome("");
            setEditEmail("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cadastro do usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Atualiza nome e e-mail em <strong>settings_users</strong> e <strong>profiles</strong>. O e-mail de login no
            Authentication só muda se for alterado no Supabase ou pelo fluxo de convite.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} autoComplete="name" />
            </div>
            <div>
              <Label>E-mail (cadastro)</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCadastro(null)}>
              Cancelar
            </Button>
            <Button onClick={salvarCadastroUsuario} disabled={editSaving}>
              {editSaving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(v) => { if (!v) { setResetTarget(null); setNovaSenha(""); setConfirmaSenha(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Definir nova senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Definir nova senha para <strong>{resetTarget?.nome ?? resetTarget?.email ?? "usuário"}</strong>.
              O usuário deverá usar essa senha no próximo login.
            </p>
            <div>
              <Label>Nova senha</Label>
              <Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} minLength={8} />
            </div>
            <div>
              <Label>Confirmar senha</Label>
              <Input type="password" value={confirmaSenha} onChange={(e) => setConfirmaSenha(e.target.value)} minLength={8} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
              <Button onClick={definirNovaSenha} disabled={resetLoading}>
                {resetLoading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}