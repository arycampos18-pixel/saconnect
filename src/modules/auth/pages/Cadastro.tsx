import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Vote, Mail, Lock, User, Phone, Briefcase, ArrowRight, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authService } from "@/modules/auth/services/authService";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres").max(100),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  cargo: z.string().trim().max(100).optional().or(z.literal("")),
});

export default function Cadastro() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: "", email: "", password: "", telefone: "", cargo: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { data, error: authError } = await authService.signUp({
      nome: parsed.data.nome,
      email: parsed.data.email,
      password: parsed.data.password,
      telefone: parsed.data.telefone || undefined,
      cargo: parsed.data.cargo || undefined,
    });
    setLoading(false);

    if (authError) {
      const msg = authError.message.includes("already registered")
        ? "Este e-mail já está cadastrado."
        : authError.message;
      setError(msg);
      return;
    }

    if (data.session) {
      toast.success("Conta criada! Bem-vindo ao S A CONNECT.");
      navigate("/app", { replace: true });
    } else {
      toast.success("Conta criada! Verifique seu e-mail para confirmar antes de entrar.");
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-hero p-12 text-primary-foreground lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
            <Vote className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-[0.25em]">S A CONNECT</h1>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Gabinete Inteligente</p>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold leading-[1.15]">Comece agora.</h2>
          <p className="max-w-md text-white/80">
            Crie sua conta e organize sua base de eleitores, suas lideranças e a comunicação do seu
            gabinete em um só lugar.
          </p>
        </div>
        <p className="relative text-xs text-white/60">© 2026 S A CONNECT</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Criar conta</h2>
            <p className="text-muted-foreground">Preencha os dados para começar a usar o sistema.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-semibold text-foreground">Nome completo *</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="nome" value={form.nome} onChange={update("nome")} className="h-11 pl-10" placeholder="Seu nome" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground">E-mail *</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={form.email} onChange={update("email")} className="h-11 pl-10" placeholder="seu@email.com" autoComplete="email" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground">Senha *</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={form.password} onChange={update("password")} className="h-11 pl-10" placeholder="Mínimo 6 caracteres" autoComplete="new-password" required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-sm font-semibold text-foreground">Telefone</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="telefone" value={form.telefone} onChange={update("telefone")} className="h-11 pl-10" placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo" className="text-sm font-semibold text-foreground">Cargo</Label>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="cargo" value={form.cargo} onChange={update("cargo")} className="h-11 pl-10" placeholder="Ex.: Coordenador" />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-border bg-secondary p-3 text-sm text-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-primary text-primary-foreground shadow-elegant-sm hover:bg-[hsl(var(--primary-hover))] hover:shadow-elegant-md"
            >
              {loading ? "Criando conta..." : "Criar conta"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-semibold text-primary hover:text-[hsl(var(--primary-hover))] hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
