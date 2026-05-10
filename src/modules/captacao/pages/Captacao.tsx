import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { eleitoresService } from "@/modules/eleitores/services/eleitoresService";
import {
  catalogosService, type Lideranca, type Cabo, type Tag,
} from "@/modules/eleitores/services/catalogosService";
import { formatPhoneBR, isValidPhoneBR, onlyDigits } from "@/shared/utils/phone";
import { isValidCPF, onlyDigitsCPF } from "@/shared/utils/cpf";
import { CpfInput } from "@/shared/components/CpfInput";
import { CepInput } from "@/shared/components/CepInput";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  telefone: z.string().trim().refine((v) => isValidPhoneBR(v), "Telefone inválido (DDD + número)"),
  cpf: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidCPF(v), "CPF inválido"),
  email: z.string().trim().email("E-mail inválido").max(150).optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  genero: z.string().optional().or(z.literal("")),
  cep: z.string().max(10).optional().or(z.literal("")),
  rua: z.string().max(150).optional().or(z.literal("")),
  numero: z.string().max(15).optional().or(z.literal("")),
  complemento: z.string().max(80).optional().or(z.literal("")),
  bairro: z.string().max(80).optional().or(z.literal("")),
  cidade: z.string().max(80).optional().or(z.literal("")),
  uf: z.string().max(2).optional().or(z.literal("")),
  observacoes: z.string().max(1000).optional().or(z.literal("")),
  origem: z.string().max(80).optional().or(z.literal("")),
});

type Form = z.infer<typeof schema>;

const empty: Form = {
  nome: "", telefone: "", cpf: "", email: "", data_nascimento: "", genero: "",
  cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  observacoes: "", origem: "Cadastro Manual",
};

export default function Captacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<Form>(empty);
  const [liderancaId, setLiderancaId] = useState<string>("");
  const [caboId, setCaboId] = useState<string>("");
  const [vinculoTravado, setVinculoTravado] = useState<{ lideranca: boolean; cabo: boolean }>({
    lideranca: false,
    cabo: false,
  });
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [cabos, setCabos] = useState<Cabo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      catalogosService.liderancas(),
      catalogosService.cabos(),
      catalogosService.tags(),
    ]).then(([l, c, t]) => { setLiderancas(l); setCabos(c); setTags(t); });
    // origens distintas existentes (sem catálogo dedicado)
    (supabase as any)
      .from("eleitores")
      .select("origem")
      .not("origem", "is", null)
      .limit(1000)
      .then(({ data }: any) => {
        const set = new Set<string>(["Cadastro Manual", "Auto-cadastro", "QR Code", "WhatsApp", "Importação"]);
        (data ?? []).forEach((r: any) => { if (r.origem) set.add(r.origem); });
        setOrigens(Array.from(set).sort());
      });
  }, []);

  // Pré-preenche e trava Liderança/Cabo de acordo com o cadastro do usuário logado.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const sb: any = supabase;
      // 1) É um cabo eleitoral? Então herda lideranca + cabo.
      const { data: cabo } = await sb
        .from("cabos_eleitorais")
        .select("id, lideranca_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cabo?.id) {
        if (cabo.lideranca_id) setLiderancaId(cabo.lideranca_id);
        setCaboId(cabo.id);
        setVinculoTravado({ lideranca: !!cabo.lideranca_id, cabo: true });
        return;
      }
      // 2) É uma liderança? Então herda apenas a liderança.
      const { data: lid } = await sb
        .from("liderancas")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (lid?.id) {
        setLiderancaId(lid.id);
        setVinculoTravado({ lideranca: true, cabo: false });
      }
    })();
  }, [user]);

  const cabosFiltrados = cabos.filter((c) => !liderancaId || c.lideranca_id === liderancaId);
  const upd = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const updTelefone = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, telefone: formatPhoneBR(e.target.value) }));

  const toggleTag = (id: string) =>
    setTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (!consent) {
      toast.error("É necessário registrar o consentimento LGPD do eleitor.");
      return;
    }
    setSaving(true);
    try {
      const d = parsed.data;
      // Anti-duplicidade
      const dup = await eleitoresService.checarDuplicidade({
        telefone: d.telefone,
        cpf: d.cpf || null,
      });
      if (dup.porTelefone) {
        toast.error(`Telefone já cadastrado para ${dup.porTelefone.nome}`);
        setSaving(false);
        return;
      }
      if (dup.porCpf) {
        toast.error(`CPF já cadastrado para ${dup.porCpf.nome}`);
        setSaving(false);
        return;
      }
      await eleitoresService.create({
        nome: d.nome,
        telefone: onlyDigits(d.telefone),
        cpf: d.cpf ? onlyDigitsCPF(d.cpf) : null,
        email: d.email || null,
        data_nascimento: d.data_nascimento || null,
        genero: d.genero || null,
        cep: d.cep || null,
        rua: d.rua || null,
        numero: d.numero || null,
        complemento: d.complemento || null,
        bairro: d.bairro || null,
        cidade: d.cidade || null,
        uf: d.uf || null,
        observacoes: d.observacoes || null,
        consentimento_lgpd: consent,
        lideranca_id: liderancaId || null,
        cabo_id: caboId || null,
        origem: d.origem || "Cadastro Manual",
        tag_ids: tagIds,
      });
      toast.success("Eleitor cadastrado com sucesso!");
      navigate("/app/eleitores");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserPlus className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Novo Eleitor</h1>
          <p className="text-sm text-muted-foreground">Cadastre um novo eleitor na sua base.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Dados pessoais
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input id="nome" value={form.nome} onChange={upd("nome")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input id="telefone" value={form.telefone} onChange={updTelefone} placeholder="(11) 99999-9999" inputMode="tel" required />
            </div>
            <div className="space-y-2">
              <CpfInput value={form.cpf} onChange={(v) => setForm((f) => ({ ...f, cpf: v }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={upd("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_nascimento">Data de nascimento</Label>
              <Input id="data_nascimento" type="date" value={form.data_nascimento} onChange={upd("data_nascimento")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genero">Gênero</Label>
              <Select value={form.genero} onValueChange={(v) => setForm((f) => ({ ...f, genero: v }))}>
                <SelectTrigger id="genero"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                  <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="origem">Origem do cadastro</Label>
              <Select
                value={form.origem || "Cadastro Manual"}
                onValueChange={(v) => setForm((f) => ({ ...f, origem: v }))}
              >
                <SelectTrigger id="origem"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {origens.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Endereço
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="md:col-span-2 space-y-2">
              <CepInput
                value={form.cep}
                onChange={(cep) => setForm((f) => ({ ...f, cep }))}
                onAddressFound={(addr) =>
                  setForm((f) => ({
                    ...f,
                    rua: addr.rua,
                    bairro: addr.bairro,
                    cidade: addr.cidade,
                    uf: addr.uf,
                  }))
                }
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="rua">Rua</Label>
              <Input id="rua" value={form.rua} onChange={upd("rua")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" value={form.numero} onChange={upd("numero")} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input id="complemento" value={form.complemento} onChange={upd("complemento")} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" value={form.bairro} onChange={upd("bairro")} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={form.cidade} onChange={upd("cidade")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input id="uf" value={form.uf} onChange={upd("uf")} maxLength={2} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Vínculo e classificação
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Liderança</Label>
              <Select
                value={liderancaId}
                onValueChange={(v) => { setLiderancaId(v); setCaboId(""); }}
                disabled={vinculoTravado.lideranca}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a liderança" /></SelectTrigger>
                <SelectContent>
                  {liderancas.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vinculoTravado.lideranca && (
                <p className="text-xs text-muted-foreground">Vínculo herdado do seu cadastro.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cabo eleitoral</Label>
              <Select
                value={caboId}
                onValueChange={setCaboId}
                disabled={vinculoTravado.cabo || !liderancaId}
              >
                <SelectTrigger><SelectValue placeholder={liderancaId ? "Selecione o cabo" : "Escolha uma liderança"} /></SelectTrigger>
                <SelectContent>
                  {cabosFiltrados.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vinculoTravado.cabo && (
                <p className="text-xs text-muted-foreground">Vínculo herdado do seu cadastro.</p>
              )}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const active = tagIds.includes(t.id);
                  return (
                    <Badge
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={
                        "cursor-pointer border-0 font-normal transition-colors " +
                        (active
                          ? "bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]"
                          : "bg-primary/10 text-primary hover:bg-primary/20")
                      }
                    >
                      {t.nome}
                    </Badge>
                  );
                })}
                {tags.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada.</p>
                )}
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" rows={3} value={form.observacoes} onChange={upd("observacoes")} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Consentimento LGPD
              </h2>
              <p className="mt-1 text-sm text-foreground">
                O eleitor autoriza o contato e o tratamento dos seus dados pelo gabinete?
              </p>
            </div>
            <Switch checked={consent} onCheckedChange={setConsent} />
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar eleitor
          </Button>
        </div>
      </form>
    </div>
  );
}
