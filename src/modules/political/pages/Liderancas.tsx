import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { liderancasCabosService, type Lideranca } from "../services/liderancasCabosService";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { CpfInput } from "@/shared/components/CpfInput";
import { CepInput } from "@/shared/components/CepInput";
import { formatPhoneBR, isValidPhoneBR } from "@/shared/utils/phone";
import { isValidCPF, onlyDigitsCPF } from "@/shared/utils/cpf";
import { supabase } from "@/integrations/supabase/client";

const ORIGENS_PADRAO = [
  "Cadastro Manual",
  "Indicação",
  "Evento",
  "Reunião de bairro",
  "Importação",
  "WhatsApp",
  "QR Code",
];

function nullIfEmpty(s: string | undefined | null): string | null {
  const t = (s ?? "").trim();
  return t || null;
}

const emptyForm: Partial<Lideranca> = {
  status: "ativo",
  ativo: true,
  meta: 100,
  nome: "",
  telefone: "",
  email: "",
  cpf: "",
  rg: "",
  nome_mae: "",
  data_nascimento: "",
  genero: "",
  origem: "Cadastro Manual",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  regiao: "",
  observacoes: "",
};

export default function Liderancas() {
  const qc = useQueryClient();
  const { currentCompany, loading: companyLoading } = useCompany();
  const cid = currentCompany?.id ?? null;

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["liderancas", cid],
    queryFn: () => liderancasCabosService.listarLiderancas(cid),
    enabled: !companyLoading,
  });

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Lideranca | null>(null);
  const [form, setForm] = useState<Partial<Lideranca>>(emptyForm);
  const [origens, setOrigens] = useState<string[]>(ORIGENS_PADRAO);

  useEffect(() => {
    if (!open) return;
    const sb = supabase as any;
    sb
      .from("liderancas")
      .select("origem")
      .not("origem", "is", null)
      .limit(400)
      .then(({ data: rows }: { data: { origem: string | null }[] | null }) => {
        const set = new Set<string>(ORIGENS_PADRAO);
        (rows ?? []).forEach((r) => {
          if (r.origem) set.add(r.origem);
        });
        setOrigens(Array.from(set).sort());
      })
      .catch(() => setOrigens(ORIGENS_PADRAO));
  }, [open]);

  function openNew() {
    setEdit(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(l: Lideranca) {
    setEdit(l);
    setForm({
      ...l,
      telefone: l.telefone ? formatPhoneBR(l.telefone) : "",
      cpf: l.cpf ? onlyDigitsCPF(l.cpf) : "",
      rg: l.rg ?? "",
      nome_mae: l.nome_mae ?? "",
      data_nascimento: l.data_nascimento ?? "",
      genero: l.genero ?? "",
      origem: l.origem ?? "Cadastro Manual",
    });
    setOpen(true);
  }

  const upd =
    (k: keyof Partial<Lideranca>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const updTelefone = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, telefone: formatPhoneBR(e.target.value) }));

  function buildPayload(): Partial<Lideranca> {
    const ufRaw = nullIfEmpty(form.uf);
    return {
      nome: form.nome!.trim(),
      email: nullIfEmpty(form.email),
      telefone: form.telefone ?? "",
      cpf: form.cpf ?? "",
      rg: nullIfEmpty(form.rg),
      nome_mae: nullIfEmpty(form.nome_mae),
      data_nascimento: nullIfEmpty(form.data_nascimento),
      genero: nullIfEmpty(form.genero),
      origem: nullIfEmpty(form.origem) ?? "Cadastro Manual",
      cep: nullIfEmpty(form.cep),
      rua: nullIfEmpty(form.rua),
      numero: nullIfEmpty(form.numero),
      complemento: nullIfEmpty(form.complemento),
      bairro: nullIfEmpty(form.bairro),
      cidade: nullIfEmpty(form.cidade),
      uf: ufRaw ? ufRaw.toUpperCase().slice(0, 2) : null,
      regiao: nullIfEmpty(form.regiao),
      observacoes: nullIfEmpty(form.observacoes),
      status: form.status ?? "ativo",
      meta: form.meta ?? 100,
      ativo: form.ativo ?? true,
    };
  }

  async function save() {
    if (!form.nome?.trim()) {
      toast.error("Informe o nome");
      return;
    }
    const tel = (form.telefone ?? "").replace(/\D/g, "");
    if (tel && !isValidPhoneBR(form.telefone ?? "")) {
      toast.error("Telefone inválido (DDD + número)");
      return;
    }
    const emailTrim = (form.email ?? "").trim();
    if (emailTrim) {
      const parsed = z.string().email().safeParse(emailTrim);
      if (!parsed.success) {
        toast.error("E-mail inválido");
        return;
      }
    }
    const cpfDigits = onlyDigitsCPF(form.cpf ?? "");
    if (cpfDigits && !isValidCPF(form.cpf ?? "")) {
      toast.error("CPF inválido");
      return;
    }

    const payload = buildPayload();
    try {
      if (edit) {
        await liderancasCabosService.atualizarLideranca(edit.id, payload);
        toast.success("Liderança atualizada");
      } else {
        await liderancasCabosService.criarLideranca({
          ...payload,
          company_id: currentCompany?.id,
        });
        toast.success("Liderança criada");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["liderancas", cid] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover esta liderança?")) return;
    try {
      await liderancasCabosService.removerLideranca(id);
      qc.invalidateQueries({ queryKey: ["liderancas", cid] });
      toast.success("Removida");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Lideranças
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de lideranças e suas regiões.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Liderança
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lideranças cadastradas ({data.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {companyLoading || isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !cid ? (
            <p className="text-sm text-destructive">
              Nenhuma empresa ativa. Acesse Configurações → Empresas para vincular sua conta.
            </p>
          ) : isError ? (
            <p className="text-sm text-destructive">Erro ao carregar lideranças. Verifique sua conexão e tente novamente.</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma liderança cadastrada. Clique em <strong>Nova Liderança</strong> para começar.
            </p>
          ) : (
            <div className="space-y-2">
              {data.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {l.nome}
                      <Badge variant={l.status === "ativo" ? "default" : "secondary"}>{l.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l.regiao || "—"} · {l.telefone || "sem telefone"} · {l.email || "sem email"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(l)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(l.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{edit ? "Editar liderança" : "Nova liderança"}</DialogTitle>
            <DialogDescription>Preencha os dados da liderança.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-4 shadow-elegant-sm md:p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Dados pessoais
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="lid-nome">Nome completo *</Label>
                  <Input id="lid-nome" value={form.nome ?? ""} onChange={upd("nome")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lid-tel">Telefone</Label>
                  <Input
                    id="lid-tel"
                    value={form.telefone ?? ""}
                    onChange={updTelefone}
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                  />
                </div>
                <div className="space-y-2">
                  <CpfInput id="lid-cpf" value={form.cpf ?? ""} onChange={(v) => setForm((f) => ({ ...f, cpf: v }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lid-rg">RG</Label>
                  <Input
                    id="lid-rg"
                    value={form.rg ?? ""}
                    onChange={upd("rg")}
                    placeholder="Opcional"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="lid-nome-mae">Nome da mãe</Label>
                  <Input
                    id="lid-nome-mae"
                    value={form.nome_mae ?? ""}
                    onChange={upd("nome_mae")}
                    placeholder="Opcional"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lid-email">E-mail</Label>
                  <Input id="lid-email" type="email" value={form.email ?? ""} onChange={upd("email")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lid-nasc">Data de nascimento</Label>
                  <Input
                    id="lid-nasc"
                    type="date"
                    value={form.data_nascimento ?? ""}
                    onChange={upd("data_nascimento")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lid-genero">Gênero</Label>
                  <Select value={form.genero ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, genero: v }))}>
                    <SelectTrigger id="lid-genero">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                      <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lid-origem">Origem do cadastro</Label>
                  <Select
                    value={form.origem || "Cadastro Manual"}
                    onValueChange={(v) => setForm((f) => ({ ...f, origem: v }))}
                  >
                    <SelectTrigger id="lid-origem">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {origens.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-elegant-sm md:p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Endereço</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                <div className="md:col-span-2 space-y-2">
                  <CepInput
                    value={form.cep ?? ""}
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
                  <Label htmlFor="lid-rua">Rua</Label>
                  <Input id="lid-rua" value={form.rua ?? ""} onChange={upd("rua")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lid-numero">Número</Label>
                  <Input id="lid-numero" value={form.numero ?? ""} onChange={upd("numero")} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="lid-comp">Complemento</Label>
                  <Input id="lid-comp" value={form.complemento ?? ""} onChange={upd("complemento")} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="lid-bairro">Bairro</Label>
                  <Input id="lid-bairro" value={form.bairro ?? ""} onChange={upd("bairro")} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="lid-cidade">Cidade</Label>
                  <Input id="lid-cidade" value={form.cidade ?? ""} onChange={upd("cidade")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lid-uf">UF</Label>
                  <Input id="lid-uf" value={form.uf ?? ""} onChange={upd("uf")} maxLength={2} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-elegant-sm md:p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Atuação e notas
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lid-regiao">Região / zona de atuação</Label>
                  <Input
                    id="lid-regiao"
                    value={form.regiao ?? ""}
                    onChange={upd("regiao")}
                    placeholder="Ex: Zona Norte"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lid-obs">Observações</Label>
                  <Textarea id="lid-obs" rows={3} value={form.observacoes ?? ""} onChange={upd("observacoes")} />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
