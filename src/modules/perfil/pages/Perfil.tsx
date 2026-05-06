import { useEffect, useState } from "react";
import { User, Mail, Lock, Save, Phone, Briefcase, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";

function initials(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "SA";
}

export default function Perfil() {
  const { user, profile } = useAuth();
  const { role } = useUserRole();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cargo, setCargo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [trocando, setTrocando] = useState(false);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome ?? "");
      setTelefone(profile.telefone ?? "");
      setCargo(profile.cargo ?? "");
    }
  }, [profile]);

  if (!user) return null;

  const salvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Nome é obrigatório.");
    setSalvando(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: nome.trim(), telefone: telefone || null, cargo: cargo || null })
      .eq("user_id", user.id);
    setSalvando(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Perfil atualizado!");
  };

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres.");
    if (novaSenha !== confirmar) return toast.error("As senhas não coincidem.");
    setTrocando(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setTrocando(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada com sucesso!");
    setNovaSenha(""); setConfirmar("");
  };

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    lideranca: "Liderança",
    operador: "Operador",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Meu Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atualize seus dados de acesso e informações pessoais.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elegant-sm">
        <div className="bg-primary p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-white/20">
              <AvatarFallback className="bg-white text-2xl font-bold text-primary">{initials(nome)}</AvatarFallback>
            </Avatar>
            <div className="text-primary-foreground">
              <h2 className="text-xl font-bold">{nome || "—"}</h2>
              <p className="text-sm text-primary-foreground/80">{user.email}</p>
              {role && (
                <Badge className="mt-2 border-0 bg-white/20 text-primary-foreground hover:bg-white/30">
                  <Shield className="mr-1 h-3 w-3" /> {roleLabel[role] ?? role}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={salvarPerfil} className="space-y-6 p-6 md:p-8">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dados Pessoais</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={user.email ?? ""} className="h-11 pl-10" disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="h-11 pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} className="h-11 pl-10" />
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end border-t border-border pt-6">
            <Button type="submit" disabled={salvando} className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]">
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>

      <form onSubmit={trocarSenha} className="overflow-hidden rounded-xl border border-border bg-card p-6 shadow-elegant-sm md:p-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Alterar Senha</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nova">Nova senha</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="nova" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="h-11 pl-10" autoComplete="new-password" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="conf">Confirmar senha</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="conf" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className="h-11 pl-10" autoComplete="new-password" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={trocando} variant="outline">
            {trocando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Trocar senha
          </Button>
        </div>
      </form>
    </div>
  );
}
