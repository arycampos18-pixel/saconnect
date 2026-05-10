import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Check, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { depStore } from "../store";
import type { FuncaoMembro } from "../data/mock";
import { eleitoresService } from "@/modules/eleitores/services/eleitoresService";
import { formatPhoneBR, isValidPhoneBR, onlyDigits } from "@/shared/utils/phone";
import { onlyDigitsCPF } from "@/shared/utils/cpf";
import { catalogosService, type Tag } from "@/modules/eleitores/services/catalogosService";
import { CepInput } from "@/shared/components/CepInput";
import { CpfInput } from "@/shared/components/CpfInput";
import { isValidCPF } from "@/shared/utils/cpf";

const FUNCOES: FuncaoMembro[] = ["Membro", "Coordenador", "Voluntário"];

const novoSchema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  telefone: z.string().trim().min(8, "Telefone obrigatório").max(20),
  email: z.string().trim().email("E-mail inválido").max(120).optional().or(z.literal("")),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  genero: z.string().optional().or(z.literal("")),
  cep: z.string().trim().max(15).optional().or(z.literal("")),
  rua: z.string().trim().max(120).optional().or(z.literal("")),
  numero: z.string().trim().max(20).optional().or(z.literal("")),
  complemento: z.string().trim().max(80).optional().or(z.literal("")),
  bairro: z.string().trim().max(80).optional().or(z.literal("")),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  uf: z.string().trim().max(2).optional().or(z.literal("")),
  observacoes: z.string().trim().max(500).optional().or(z.literal("")),
  consentimento_lgpd: z.boolean(),
  funcao: z.enum(["Membro", "Coordenador", "Voluntário"]),
});

const novoInicial = {
  nome: "", telefone: "", email: "", cpf: "",
  data_nascimento: "", genero: "",
  cep: "", rua: "", numero: "", complemento: "",
  bairro: "", cidade: "", uf: "",
  observacoes: "",
  consentimento_lgpd: false,
  funcao: "Membro" as FuncaoMembro,
};

export function AdicionarMembroDialog({
  open, onOpenChange, departamentoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departamentoId: string;
}) {
  const [tab, setTab] = useState("eleitor");
  const [novo, setNovo] = useState(novoInicial);
  const [tagsDisponiveis, setTagsDisponiveis] = useState<Tag[]>([]);
  const [tagsSel, setTagsSel] = useState<string[]>([]);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [csv, setCsv] = useState<File | null>(null);

  // Validação de telefone + duplicidade
  const [dupCheck, setDupCheck] = useState<{
    loading: boolean;
    porTelefone: { id: string; nome: string } | null;
    porCpf: { id: string; nome: string } | null;
  }>({ loading: false, porTelefone: null, porCpf: null });

  // Aba "selecionar da base de eleitores"
  const [busca, setBusca] = useState("");
  const [eleitores, setEleitores] = useState<Array<{ id: string; nome: string; telefone: string | null; cpf: string | null; bairro: string | null }>>([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [funcaoSel, setFuncaoSel] = useState<FuncaoMembro>("Membro");

  useEffect(() => {
    if (tab !== "eleitor" || !open) return;
    const t = setTimeout(async () => {
      setCarregando(true);
      try {
        let q = supabase.from("eleitores")
          .select("id, nome, telefone, cpf, bairro")
          .order("nome").limit(50);
        if (busca.trim()) {
          const term = busca.trim();
          q = q.or(`nome.ilike.%${term}%,telefone.ilike.%${term}%,cpf.ilike.%${term}%`);
        }
        const { data, error } = await q;
        if (error) throw error;
        setEleitores(data ?? []);
      } catch (e: any) {
        toast.error("Erro ao buscar eleitores: " + (e?.message ?? ""));
      } finally { setCarregando(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [busca, tab, open]);

  useEffect(() => {
    if (!open) return;
    catalogosService.tags().then(setTagsDisponiveis).catch(() => {});
  }, [open]);

  // Checagem de duplicidade (telefone + CPF) com debounce
  const telDigits = onlyDigits(novo.telefone);
  const cpfDigits = onlyDigitsCPF(novo.cpf);
  const telValido = isValidPhoneBR(novo.telefone);
  useEffect(() => {
    if (tab !== "novo") return;
    if (telDigits.length < 10 && cpfDigits.length !== 11) {
      setDupCheck({ loading: false, porTelefone: null, porCpf: null });
      return;
    }
    let cancelled = false;
    setDupCheck((p) => ({ ...p, loading: true }));
    const t = setTimeout(async () => {
      try {
        const r = await eleitoresService.checarDuplicidade({
          telefone: telDigits.length >= 10 ? telDigits : null,
          cpf: cpfDigits.length === 11 ? cpfDigits : null,
        });
        if (!cancelled) setDupCheck({ loading: false, ...r });
      } catch {
        if (!cancelled) setDupCheck({ loading: false, porTelefone: null, porCpf: null });
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [telDigits, cpfDigits, tab]);

  const adicionarDoEleitor = async () => {
    const e = eleitores.find((x) => x.id === selecionado);
    if (!e) { toast.error("Selecione um eleitor"); return; }
    try {
      await depStore.adicionarMembro({
        departamentoId,
        eleitorId: e.id,
        nome: e.nome,
        telefone: e.telefone ?? "",
        cpf: e.cpf ?? undefined,
        bairro: e.bairro ?? undefined,
        funcao: funcaoSel,
      });
      toast.success("Eleitor adicionado como membro");
      setSelecionado(null); setBusca("");
      onOpenChange(false);
    } catch {}
  };

  const cadastrarNovo = async () => {
    const parsed = novoSchema.safeParse(novo);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    const v = parsed.data;
    if (!isValidPhoneBR(v.telefone)) {
      toast.error("Telefone inválido. Use 10 ou 11 dígitos (DDD + número).");
      return;
    }
    if (v.cpf && !isValidCPF(v.cpf)) {
      toast.error("CPF inválido. Verifique os dígitos verificadores.");
      return;
    }
    if (dupCheck.porTelefone) {
      toast.error(`Telefone já cadastrado para o eleitor ${dupCheck.porTelefone.nome}.`);
      return;
    }
    if (dupCheck.porCpf) {
      toast.error(`CPF já cadastrado para o eleitor ${dupCheck.porCpf.nome}.`);
      return;
    }
    setSalvandoNovo(true);
    try {
      // 1) Cria o eleitor na base
      const eleitorId = await eleitoresService.create({
        nome: v.nome,
        telefone: v.telefone,
        email: v.email || null,
        cpf: v.cpf || null,
        data_nascimento: v.data_nascimento || null,
        genero: v.genero || null,
        cep: v.cep || null,
        rua: v.rua || null,
        numero: v.numero || null,
        complemento: v.complemento || null,
        bairro: v.bairro || null,
        cidade: v.cidade || null,
        uf: v.uf ? v.uf.toUpperCase() : null,
        observacoes: v.observacoes || null,
        origem: "Departamento",
        consentimento_lgpd: v.consentimento_lgpd,
        tag_ids: tagsSel,
      });
      // 2) Vincula o eleitor ao departamento como membro
      await depStore.adicionarMembro({
        departamentoId,
        eleitorId,
        nome: v.nome,
        telefone: v.telefone,
        email: v.email || undefined,
        cpf: v.cpf || undefined,
        bairro: v.bairro || undefined,
        funcao: v.funcao,
      });
      toast.success("Eleitor cadastrado e adicionado ao departamento");
      setNovo(novoInicial);
      setTagsSel([]);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao cadastrar eleitor: " + (e?.message ?? ""));
    } finally {
      setSalvandoNovo(false);
    }
  };

  const importarCSV = async () => {
    if (!csv) { toast.error("Selecione um arquivo CSV"); return; }
    const text = await csv.text();
    const linhas = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    let count = 0;
    for (const linha of linhas.slice(1)) {
      const [nome, telefone, email, cpf, funcaoRaw] = linha.split(",").map((s) => s?.trim() ?? "");
      if (!nome || !telefone) continue;
      const funcao: FuncaoMembro = (FUNCOES as string[]).includes(funcaoRaw) ? (funcaoRaw as FuncaoMembro) : "Membro";
      try {
        await depStore.adicionarMembro({ departamentoId, nome, telefone, email: email || undefined, cpf: cpf || undefined, funcao });
        count++;
      } catch {}
    }
    toast.success(`${count} membros importados`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar membro</DialogTitle>
          <DialogDescription>
            Selecione um eleitor existente, cadastre um novo eleitor ou importe uma lista.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="eleitor">Da base de eleitores</TabsTrigger>
            <TabsTrigger value="novo">Novo membro</TabsTrigger>
            <TabsTrigger value="csv">Importar CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="eleitor" className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, telefone ou CPF..." className="pl-9" />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              {carregando && <div className="p-4 text-center text-sm text-muted-foreground">Carregando…</div>}
              {!carregando && eleitores.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">Nenhum eleitor encontrado.</div>
              )}
              {eleitores.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelecionado(e.id)}
                  className={`flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted/50 ${selecionado === e.id ? "bg-primary/10" : ""}`}
                >
                  <div>
                    <div className="font-medium">{e.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.telefone ?? "—"} {e.bairro ? `• ${e.bairro}` : ""} {e.cpf ? `• ${e.cpf}` : ""}
                    </div>
                  </div>
                  {selecionado === e.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
            <div>
              <Label>Função no Departamento</Label>
              <Select value={funcaoSel} onValueChange={(v) => setFuncaoSel(v as FuncaoMembro)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNCOES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="novo" className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Dados pessoais</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Nome completo *</Label>
                  <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} maxLength={120} />
                </div>
                <div>
                  <Label>Telefone *</Label>
                  <div className="relative">
                    <Input
                      value={novo.telefone}
                      onChange={(e) => setNovo({ ...novo, telefone: formatPhoneBR(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      className={
                        telDigits.length === 0
                          ? ""
                          : !telValido
                          ? "border-destructive pr-9"
                          : dupCheck.porTelefone
                          ? "border-destructive pr-9"
                          : "border-emerald-500 pr-9"
                      }
                    />
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                      {dupCheck.loading && telDigits.length >= 10 ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : telDigits.length >= 10 && telValido && !dupCheck.porTelefone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : telDigits.length > 0 && (!telValido || dupCheck.porTelefone) ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : null}
                    </div>
                  </div>
                  {telDigits.length > 0 && !telValido && (
                    <p className="mt-1 text-xs text-destructive">Telefone inválido (use DDD + número).</p>
                  )}
                  {telValido && dupCheck.porTelefone && (
                    <p className="mt-1 text-xs text-destructive">
                      Já cadastrado: {dupCheck.porTelefone.nome}
                    </p>
                  )}
                  {telValido && !dupCheck.porTelefone && !dupCheck.loading && telDigits.length >= 10 && (
                    <p className="mt-1 text-xs text-emerald-600">Telefone válido e disponível.</p>
                  )}
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
                </div>
                <CpfInput
                  value={novo.cpf}
                  onChange={(v) => setNovo({ ...novo, cpf: v })}
                  error={
                    cpfDigits.length === 11 && dupCheck.porCpf
                      ? `CPF já cadastrado: ${dupCheck.porCpf.nome}`
                      : undefined
                  }
                />
                <div>
                  <Label>Data de nascimento</Label>
                  <Input type="date" value={novo.data_nascimento} onChange={(e) => setNovo({ ...novo, data_nascimento: e.target.value })} />
                </div>
                <div>
                  <Label>Gênero</Label>
                  <Select value={novo.genero || "nao_informado"} onValueChange={(v) => setNovo({ ...novo, genero: v === "nao_informado" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao_informado">Não informado</SelectItem>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Endereço</p>
              <div className="grid gap-3 sm:grid-cols-6">
                <CepInput
                  className="sm:col-span-2"
                  value={novo.cep}
                  onChange={(cep) => setNovo((p) => ({ ...p, cep }))}
                  onAddressFound={(addr) =>
                    setNovo((p) => ({
                      ...p,
                      rua: addr.rua,
                      bairro: addr.bairro,
                      cidade: addr.cidade,
                      uf: addr.uf,
                    }))
                  }
                />
                <div className="sm:col-span-3">
                  <Label>Rua</Label>
                  <Input value={novo.rua} onChange={(e) => setNovo({ ...novo, rua: e.target.value })} />
                </div>
                <div className="sm:col-span-1">
                  <Label>Número</Label>
                  <Input value={novo.numero} onChange={(e) => setNovo({ ...novo, numero: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Complemento</Label>
                  <Input value={novo.complemento} onChange={(e) => setNovo({ ...novo, complemento: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Bairro</Label>
                  <Input value={novo.bairro} onChange={(e) => setNovo({ ...novo, bairro: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Cidade</Label>
                  <Input value={novo.cidade} onChange={(e) => setNovo({ ...novo, cidade: e.target.value })} />
                </div>
                <div className="sm:col-span-6 sm:max-w-[120px]">
                  <Label>UF</Label>
                  <Input maxLength={2} value={novo.uf} onChange={(e) => setNovo({ ...novo, uf: e.target.value.toUpperCase() })} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Classificação</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Função no Departamento</Label>
                  <Select value={novo.funcao} onValueChange={(v) => setNovo({ ...novo, funcao: v as FuncaoMembro })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUNCOES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tags do eleitor</Label>
                  <div className="flex flex-wrap gap-2 rounded-md border p-2 max-h-24 overflow-y-auto">
                    {tagsDisponiveis.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhuma tag cadastrada.</span>
                    )}
                    {tagsDisponiveis.map((t) => {
                      const sel = tagsSel.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setTagsSel((prev) => sel ? prev.filter((x) => x !== t.id) : [...prev, t.id])
                          }
                          className={`rounded-full border px-2 py-0.5 text-xs ${sel ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                        >
                          {t.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  rows={2}
                  value={novo.observacoes}
                  onChange={(e) => setNovo({ ...novo, observacoes: e.target.value })}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
              <Checkbox
                id="lgpd_membro"
                checked={novo.consentimento_lgpd}
                onCheckedChange={(v) => setNovo({ ...novo, consentimento_lgpd: !!v })}
              />
              <Label htmlFor="lgpd_membro" className="text-xs leading-snug">
                Declaro que possuo consentimento do titular para o tratamento dos dados (LGPD).
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Formato esperado (cabeçalho na primeira linha): <code>Nome, Telefone, Email, CPF, Função</code>
            </p>
            <Input type="file" accept=".csv,text/csv" onChange={(e) => setCsv(e.target.files?.[0] ?? null)} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {tab === "eleitor" && <Button onClick={adicionarDoEleitor} disabled={!selecionado}>Adicionar eleitor</Button>}
          {tab === "novo" && (
            <Button onClick={cadastrarNovo} disabled={salvandoNovo}>
              {salvandoNovo ? "Salvando…" : "Cadastrar eleitor e adicionar"}
            </Button>
          )}
          {tab === "csv" && <Button onClick={importarCSV}>Importar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}