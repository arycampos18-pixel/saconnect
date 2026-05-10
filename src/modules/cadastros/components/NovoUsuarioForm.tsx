import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/modules/auth/services/authService";
import { auditoriaService } from "@/modules/auditoria/services/auditoriaService";
import { formatPhoneBR, isValidPhoneBR } from "@/shared/utils/phone";
import { isValidCPF } from "@/shared/utils/cpf";
import { CpfInput } from "@/shared/components/CpfInput";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { settingsService } from "@/modules/settings/services/settingsService";

type Role = "admin" | "lideranca" | "operador";

function inferRoleFromProfileName(nome: string): Role {
  const n = nome.toLowerCase();
  if (n.includes("admin")) return "admin";
  if (n.includes("lider") || n.includes("líder") || n.includes("gestor")) return "lideranca";
  return "operador";
}

export function NovoUsuarioForm({ onCreated }: { onCreated?: () => void }) {
  const { currentCompany } = useCompany();
  const { data: perfis = [] } = useQuery({
    queryKey: ["settings_profiles", currentCompany?.id],
    queryFn: () => (currentCompany ? settingsService.listarPerfis(currentCompany.id) : []),
    enabled: !!currentCompany,
  });

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    cargo: "",
    senha: "",
    confirmar: "",
    profileId: "",
    observacoes: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome");
    if (!form.email.includes("@")) return toast.error("Email inválido");
    if (form.cpf && !isValidCPF(form.cpf)) return toast.error("CPF inválido");
    if (form.telefone && !isValidPhoneBR(form.telefone)) return toast.error("Telefone inválido");
    if (form.senha.length < 8) return toast.error("Senha precisa de pelo menos 8 caracteres");
    if (form.senha !== form.confirmar) return toast.error("Senhas não conferem");
    if (!form.profileId) return toast.error("Selecione um perfil de acesso");

    setLoading(true);
    try {
      const { data, error } = await authService.signUp({
        nome: form.nome,
        email: form.email,
        password: form.senha,
        telefone: form.telefone || undefined,
        cargo: form.cargo || undefined,
      });
      if (error) throw error;
      const newUserId = data.user?.id;
      const perfilSelecionado = perfis.find((p) => p.id === form.profileId);
      const role = perfilSelecionado ? inferRoleFromProfileName(perfilSelecionado.nome) : "operador";
      if (newUserId) {
        if (role !== "operador") {
          await supabase.from("user_roles").insert({ user_id: newUserId, role });
        }
        if (currentCompany) {
          await settingsService.vincularUsuarioEmpresa(newUserId, currentCompany.id, form.profileId);
        }
        // Auto-confirma o e-mail para liberar login imediato (cadastro feito por admin)
        try {
          await supabase.functions.invoke("admin-confirmar-email", {
            body: { target_user_id: newUserId },
          });
        } catch { /* ignora — usuário pode confirmar pelo e-mail */ }
      }
      await auditoriaService.registrar({
        acao: "Criar",
        entidade: "usuario",
        entidade_id: newUserId,
        descricao: `Novo usuário ${form.nome} (${form.email}) criado com perfil ${perfilSelecionado?.nome ?? "—"}`,
        modulo: "Cadastros",
      });
      toast.success("Usuário criado e liberado para acesso imediato.");
      setForm({
        nome: "", email: "", telefone: "", cpf: "", cargo: "",
        senha: "", confirmar: "", profileId: "", observacoes: "",
      });
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Nome completo *</Label>
        <Input value={form.nome} onChange={(e) => update("nome")(e.target.value)} required />
      </div>
      <div>
        <Label>Email *</Label>
        <Input type="email" value={form.email} onChange={(e) => update("email")(e.target.value)} required />
      </div>
      <div>
        <Label>Telefone</Label>
        <Input value={form.telefone} onChange={(e) => update("telefone")(formatPhoneBR(e.target.value))} placeholder="(11) 99999-9999" />
      </div>
      <CpfInput value={form.cpf} onChange={update("cpf")} />
      <div>
        <Label>Cargo / Função</Label>
        <Input value={form.cargo} onChange={(e) => update("cargo")(e.target.value)} placeholder="Ex: Assessor" />
      </div>
      <div>
        <Label>Senha *</Label>
        <Input type="password" value={form.senha} onChange={(e) => update("senha")(e.target.value)} minLength={8} required />
      </div>
      <div>
        <Label>Confirmar Senha *</Label>
        <Input type="password" value={form.confirmar} onChange={(e) => update("confirmar")(e.target.value)} required />
      </div>
      <div className="md:col-span-2">
        <Label>Perfil de acesso *</Label>
        <Select value={form.profileId} onValueChange={(v) => setForm((f) => ({ ...f, profileId: v }))}>
          <SelectTrigger><SelectValue placeholder={perfis.length ? "Selecione um perfil" : "Nenhum perfil cadastrado"} /></SelectTrigger>
          <SelectContent>
            {perfis.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Os perfis disponíveis são definidos em <strong>Configurações → Perfis &amp; Permissões</strong>.
        </p>
      </div>
      <div className="md:col-span-2">
        <Label>Observações</Label>
        <Textarea value={form.observacoes} onChange={(e) => update("observacoes")(e.target.value)} rows={3} />
      </div>
      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar Usuário"}</Button>
      </div>
    </form>
  );
}