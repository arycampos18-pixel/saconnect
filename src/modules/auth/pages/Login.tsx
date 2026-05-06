import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Vote, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authService } from "@/modules/auth/services/authService";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { isSessionValid } from "@/modules/auth/hooks/useSessionValidity";
import { authLog } from "@/modules/auth/utils/authLogger";

const schema = z.object({
  email: z.string().trim().min(1, { message: "Informe seu e-mail." }).email({ message: "E-mail inválido." }).max(255),
  password: z.string().min(1, { message: "Informe sua senha." }).max(100),
});

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000; // 1 minuto
const MIN_SUBMIT_INTERVAL_MS = 1200;

export default function Login() {
  const navigate = useNavigate();
  const { session, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const lastSubmitRef = useRef(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    authLog("info", "login.mount", {
      authLoading,
      hasSession: !!session,
      profileAtivo: profile?.ativo,
    });
  }, []);

  useEffect(() => {
    if (!authLoading && session && isSessionValid(session) && profile?.ativo !== false) {
      authLog("info", "login.redirect_to_app", { userId: session.user?.id });
      navigate("/app", { replace: true });
    }
  }, [authLoading, session, profile, navigate]);

  // tick para countdown do bloqueio
  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const remainingLock = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const isLocked = remainingLock > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Throttle de envios rápidos
    const nowTs = Date.now();
    if (nowTs - lastSubmitRef.current < MIN_SUBMIT_INTERVAL_MS) return;
    lastSubmitRef.current = nowTs;

    if (isLocked) {
      setError(`Muitas tentativas. Aguarde ${remainingLock}s antes de tentar novamente.`);
      return;
    }

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error: authError } = await authService.signIn(parsed.data.email, parsed.data.password);
    setLoading(false);

    if (authError) {
      // Mensagem genérica — não revela se o e-mail existe ou não
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCK_MS);
        setError("Muitas tentativas inválidas. Acesso temporariamente bloqueado por segurança.");
      } else {
        setError("Credenciais inválidas. Verifique e tente novamente.");
      }
      return;
    }

    setAttempts(0);
    setLockedUntil(null);
    toast.success("Bem-vindo ao S A CONNECT!");
    navigate("/app", { replace: true });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(forgotEmail);
    if (!parsed.success) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setForgotLoading(true);
    await authService.resetPassword(parsed.data);
    setForgotLoading(false);
    setForgotOpen(false);
    setForgotEmail("");
    // Mensagem genérica — não confirma se o e-mail existe
    toast.success("Se o e-mail estiver cadastrado, enviaremos um link de recuperação em instantes.");
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Painel esquerdo — branding */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-hero p-12 text-primary-foreground lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-primary-glow/40 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
            <Vote className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-[0.25em]">S A CONNECT</h1>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
              Gabinete Inteligente
            </p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold leading-[1.15]">
            Relacionamento que <span className="text-white/95 underline decoration-white/40 decoration-2 underline-offset-4">transforma</span> mandatos.
          </h2>
          <p className="max-w-md text-base text-white/80">
            CRM completo para gestão de gabinete político. Conecte-se com seus eleitores de forma
            inteligente, organizada e em conformidade com a LGPD.
          </p>
          <div className="flex gap-8 pt-4 text-sm">
            <div>
              <div className="text-2xl font-bold">12k+</div>
              <div className="text-white/70">Eleitores</div>
            </div>
            <div>
              <div className="text-2xl font-bold">98%</div>
              <div className="text-white/70">Engajamento</div>
            </div>
            <div>
              <div className="text-2xl font-bold">100%</div>
              <div className="text-white/70">LGPD</div>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-white/60">© 2026 S A CONNECT · Todos os direitos reservados</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Vote className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-base font-bold tracking-[0.2em] text-foreground">S A CONNECT</h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground">Acesse sua conta para gerenciar seu gabinete.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="text-sm font-semibold text-foreground">Senha</Label>
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                  className="text-xs font-medium text-primary hover:text-[hsl(var(--primary-hover))] hover:underline"
                >
                  Esqueceu?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10"
                  autoComplete="current-password"
                  required
                />
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
              disabled={loading || isLocked}
              className="h-11 w-full bg-primary text-primary-foreground shadow-elegant-sm hover:bg-[hsl(var(--primary-hover))] hover:shadow-elegant-md"
            >
              {isLocked
                ? `Aguarde ${remainingLock}s`
                : loading
                ? "Entrando..."
                : "Entrar no Sistema"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-semibold text-primary hover:text-[hsl(var(--primary-hover))] hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-elegant-md">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Recuperar senha</h3>
              <p className="text-sm text-muted-foreground">
                Informe o e-mail da sua conta. Enviaremos um link seguro para redefinir sua senha.
              </p>
            </div>
            <form onSubmit={handleForgot} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="h-11 pl-10"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={forgotLoading}>
                  {forgotLoading ? "Enviando..." : "Enviar link"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
