import { useEffect, useState } from "react";
import { Vote, Phone, User, Shield, Check, Loader2, AlertCircle, IdCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCPF, isValidCPF, onlyDigitsCPF } from "@/shared/utils/cpf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function CadastroPublico() {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [lgpd, setLgpd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ valido: boolean; motivo?: string; lideranca?: { nome: string } | null; cabo?: { nome: string } | null; telefone_destino?: string | null } | null>(null);
  const [validandoToken, setValidandoToken] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) return;
    setToken(t);
    setValidandoToken(true);
    supabase.functions.invoke("auto-cadastro-validar", { body: { token: t } })
      .then(({ data, error }) => {
        if (error) setTokenInfo({ valido: false, motivo: "Erro ao validar link" });
        else {
          const info = data as any;
          setTokenInfo(info);
          if (info?.valido && info?.telefone_destino) {
            setTel(formatPhone(String(info.telefone_destino)));
          }
        }
      })
      .finally(() => setValidandoToken(false));
  }, []);

  const telefoneBloqueado = !!tokenInfo?.telefone_destino;
  const phoneOk = tel.replace(/\D/g, "").length >= 10;
  const cpfDigits = onlyDigitsCPF(cpf);
  const cpfOk = cpfDigits.length === 0 || isValidCPF(cpfDigits);
  const podeEnviar = nome.trim().length >= 3 && phoneOk && cpfOk && lgpd;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-cadastro-submit", {
        body: {
          token: token ?? undefined,
          nome: nome.trim(),
          telefone: tel.replace(/\D/g, ""),
          cpf: cpfDigits || undefined,
          email: email || undefined,
          lgpd: true,
        },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error ?? error?.message ?? "Falha ao enviar cadastro");
        return;
      }
      setEnviado(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar cadastro");
    } finally {
      setSubmitting(false);
    }
  };

  if (token && validandoToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background">
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Validando link…</div>
      </div>
    );
  }
  if (token && tokenInfo && !tokenInfo.valido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background px-4">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-elegant-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">Link inválido</h2>
          <p className="mt-2 text-sm text-muted-foreground">{tokenInfo.motivo ?? "Solicite um novo link de cadastro."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-background">
      <div className="mx-auto flex max-w-md flex-col px-4 py-8">
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent shadow-elegant-glow">
            <Vote className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SA CONNECT</h1>
          <p className="text-sm text-muted-foreground">
            Faça parte da nossa rede de apoiadores e receba novidades do mandato.
          </p>
          {tokenInfo?.valido && (tokenInfo.lideranca || tokenInfo.cabo) && (
            <p className="text-xs text-muted-foreground">
              Indicado por: <span className="font-medium text-foreground">{tokenInfo.lideranca?.nome ?? tokenInfo.cabo?.nome}</span>
            </p>
          )}
        </header>

        {enviado ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-elegant-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Cadastro recebido!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Obrigado, {nome.split(" ")[0]}! Em breve entraremos em contato.
            </p>
            <Button
              onClick={() => { setEnviado(false); setNome(""); setTel(""); setCpf(""); setEmail(""); setLgpd(false); }}
              variant="outline"
              className="mt-6"
            >
              Fazer outro cadastro
            </Button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-elegant-lg"
          >
            <div className="space-y-2">
              <Label htmlFor="p-nome">
                Seu nome <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="p-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="h-12 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-tel" className="flex items-center gap-2">
                WhatsApp <span className="text-destructive">*</span>
                {telefoneBloqueado && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <Lock className="h-3 w-3" /> Protegido
                  </span>
                )}
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="p-tel"
                  value={tel}
                  onChange={(e) => setTel(formatPhone(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className="h-12 pl-10"
                  maxLength={15}
                  inputMode="numeric"
                  disabled={telefoneBloqueado}
                  readOnly={telefoneBloqueado}
                />
              </div>
              {telefoneBloqueado ? (
                <p className="text-[11px] text-muted-foreground">
                  Este número recebeu o link de cadastro e não pode ser alterado. Apenas um administrador pode editar.
                </p>
              ) : tel && !phoneOk && (
                <p className="flex items-center gap-1 text-xs text-warning">
                  <AlertCircle className="h-3 w-3" /> Informe DDD + 9 dígitos
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-cpf">CPF (opcional)</Label>
              <div className="relative">
                <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="p-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="h-12 pl-10"
                  maxLength={14}
                  inputMode="numeric"
                />
              </div>
              {cpf && !cpfOk && (
                <p className="flex items-center gap-1 text-xs text-warning">
                  <AlertCircle className="h-3 w-3" /> CPF inválido
                </p>
              )}
            </div>

          <div className="space-y-2">
            <Label htmlFor="p-email">E-mail (opcional)</Label>
            <Input
              id="p-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="h-12"
            />
          </div>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-4 cursor-pointer">
              <Switch checked={lgpd} onCheckedChange={setLgpd} className="mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Autorizo o uso dos meus dados <span className="text-destructive">*</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  De acordo com a LGPD, autorizo o gabinete a entrar em contato comigo via os canais informados.
                </p>
              </div>
            </label>

            <Button
              type="submit"
              disabled={!podeEnviar || submitting}
              className="h-12 w-full bg-gradient-accent text-accent-foreground shadow-elegant-md hover:brightness-110"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><Shield className="mr-2 h-4 w-4" /> Enviar cadastro</>
              )}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              Seus dados estão protegidos pela Lei Geral de Proteção de Dados.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}