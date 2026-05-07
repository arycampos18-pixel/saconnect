import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Vote, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function CadastroCaboPublico() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<{ cabo_nome: string; nome: string | null } | null>(null);
  const [invalido, setInvalido] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", bairro: "", cidade: "", uf: "" });
  const [lgpd, setLgpd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await (supabase as any).rpc("public_get_cabo_link", { _token: token });
      if (error || !data || data.length === 0) setInvalido(true);
      else setInfo(data[0]);
      setLoading(false);
    })();
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!lgpd) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).rpc("public_submit_cabo_link", {
        _token: token, _nome: form.nome, _telefone: form.telefone,
        _bairro: form.bairro || null, _cidade: form.cidade || null, _uf: form.uf || null,
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err: any) {
      alert(err.message || "Erro ao enviar");
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;
  if (invalido) return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div className="max-w-md space-y-3">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
        <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
        <p className="text-sm text-muted-foreground">Solicite um novo link ao seu cabo eleitoral.</p>
      </div>
    </div>
  );

  const phoneOk = form.telefone.replace(/\D/g, "").length === 11;
  const podeEnviar = form.nome.trim().length >= 3 && phoneOk && lgpd;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-background">
      <div className="mx-auto flex max-w-md flex-col px-4 py-8">
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Vote className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Cadastro</h1>
          <p className="text-sm text-muted-foreground">Indicado por <b>{info?.cabo_nome}</b></p>
        </header>

        {enviado ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold">Cadastro recebido!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Obrigado, {form.nome.split(" ")[0]}!</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div><Label>Telefone *</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })} required placeholder="(11) 99999-9999" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Bairro</Label><Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
              <div><Label>UF</Label><Input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} maxLength={2} /></div>
            </div>
            <div className="flex items-start gap-2 pt-2">
              <Switch checked={lgpd} onCheckedChange={setLgpd} id="lgpd" />
              <Label htmlFor="lgpd" className="text-xs leading-tight">Concordo em compartilhar meus dados conforme a LGPD.</Label>
            </div>
            <Button type="submit" className="w-full" disabled={!podeEnviar || submitting}>
              {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Enviar cadastro"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}