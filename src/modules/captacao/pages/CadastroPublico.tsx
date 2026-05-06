import { useState } from "react";
import { Vote, Phone, User, MapPin, Shield, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { todosBairros } from "@/shared/data/mockData";

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function CadastroPublico() {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [bairro, setBairro] = useState("");
  const [lgpd, setLgpd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const phoneOk = tel.replace(/\D/g, "").length === 11;
  const podeEnviar = nome.trim().length >= 3 && phoneOk && bairro && lgpd;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setEnviado(true);
    }, 900);
  };

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
              onClick={() => { setEnviado(false); setNome(""); setTel(""); setBairro(""); setLgpd(false); }}
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
              <Label htmlFor="p-tel">
                WhatsApp <span className="text-destructive">*</span>
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
                />
              </div>
              {tel && !phoneOk && (
                <p className="flex items-center gap-1 text-xs text-warning">
                  <AlertCircle className="h-3 w-3" /> Informe DDD + 9 dígitos
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Seu bairro <span className="text-destructive">*</span>
              </Label>
              <Select value={bairro} onValueChange={setBairro}>
                <SelectTrigger className="h-12">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Selecione" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {todosBairros.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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