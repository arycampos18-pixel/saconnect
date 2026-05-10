import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Play, Pause, X, Send, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Users, Search, MessageSquare, MessageCircleQuestion, Ban, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { waBulkService, type WaBulkCampanha, type WaBulkTemplate } from "../services/waBulkService";
import { parseCsv, parseMatrix, type CsvParseResult } from "../utils/csvParser";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

function contarVarsTemplate(texto: string | null | undefined): number {
  if (!texto) return 0;
  const s = new Set<number>();
  for (const m of texto.matchAll(/\{\{(\d+)\}\}/g)) s.add(parseInt(m[1], 10));
  return s.size;
}

// Validação heurística de telefone (espelha wa_bulk_telefone_valido no banco)
function telefoneValido(tel: string): boolean {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 8 || d.length > 15) return false;
  if (d.startsWith("55")) {
    if (d.length !== 12 && d.length !== 13) return false;
    const ddd = parseInt(d.slice(2, 4), 10);
    if (isNaN(ddd) || ddd < 11 || ddd > 99) return false;
    if (d.length === 13 && d[4] !== "9") return false;
    if (/^(\d)\1{9,}$/.test(d.slice(2))) return false;
  }
  return true;
}

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  agendada: { label: "Agendada", variant: "outline" },
  em_andamento: { label: "Em andamento", variant: "default" },
  pausada: { label: "Pausada", variant: "outline" },
  concluida: { label: "Concluída", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

export default function WaBulkCampanhas() {
  const [items, setItems] = useState<WaBulkCampanha[]>([]);
  const [templates, setTemplates] = useState<WaBulkTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "", template_id: "", velocidade_envio: 500, agendado_para: "",
    destinatarios_raw: "",
    janela_inicio: "", janela_fim: "", timezone: "America/Sao_Paulo",
    dias_semana: [1, 2, 3, 4, 5] as number[],
  });
  const [tab, setTab] = useState<"manual" | "csv" | "eleitores">("manual");
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [optoutDigits, setOptoutDigits] = useState<Set<string>>(new Set());
  const [elFiltros, setElFiltros] = useState({ busca: "", cidade: "", bairro: "", uf: "", cabo_eleitoral_id: "", lideranca_id: "", apenas_lgpd: false });
  const [elResultados, setElResultados] = useState<{ id: string; nome: string; telefone: string; cidade: string | null; bairro: string | null; uf: string | null; status_validacao_whatsapp?: string | null; telefone_validado?: boolean | null }[]>([]);
  const [elSelecionados, setElSelecionados] = useState<Set<string>>(new Set());
  const [elBuscando, setElBuscando] = useState(false);
  const [cabos, setCabos] = useState<{ id: string; nome: string }[]>([]);
  const [liderancas, setLiderancas] = useState<{ id: string; nome: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([waBulkService.listCampanhas(), waBulkService.listTemplates()]);
      setItems(c); setTemplates(t);
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); }, []);

  // Carrega lista de opt-out para filtrar previews
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("wa_bulk_optout").select("telefone_digits").limit(50000);
      setOptoutDigits(new Set(((data ?? []) as any[]).map((r) => r.telefone_digits)));
    })();
  }, []);

  // Carrega listas de cabos/lideranças para filtros (lazy: na 1ª abertura do tab)
  useEffect(() => {
    if (tab !== "eleitores") return;
    if (cabos.length || liderancas.length) return;
    (async () => {
      const [c, l] = await Promise.all([
        waBulkService.listCabosEleitorais(),
        waBulkService.listLiderancas(),
      ]);
      setCabos(c); setLiderancas(l);
    })();
  }, [tab, cabos.length, liderancas.length]);

  const buscarEleitores = async () => {
    setElBuscando(true);
    try {
      const r = await waBulkService.buscarEleitores({
        busca: elFiltros.busca || undefined,
        cidade: elFiltros.cidade || undefined,
        bairro: elFiltros.bairro || undefined,
        uf: elFiltros.uf || undefined,
        cabo_eleitoral_id: elFiltros.cabo_eleitoral_id || undefined,
        lideranca_id: elFiltros.lideranca_id || undefined,
        apenas_lgpd: elFiltros.apenas_lgpd,
        limit: 2000,
      });
      setElResultados(r);
      setElSelecionados(new Set(r.map((x) => x.id)));
      toast.success(`${r.length} eleitores encontrados (todos selecionados)`);
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
    finally { setElBuscando(false); }
  };

  const toggleSelEleitor = (id: string) => {
    const s = new Set(elSelecionados);
    if (s.has(id)) s.delete(id); else s.add(id);
    setElSelecionados(s);
  };

  const parseDestinatarios = (raw: string) =>
    raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const parts = l.split(/[,;\t]/).map((p) => p.trim());
      return { telefone: parts[0], nome: parts[1] };
    });

  const onCsvFile = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 10MB)");
      return;
    }
    const isXlsx = /\.(xlsx|xls)$/i.test(file.name);
    let r: CsvParseResult;
    try {
      if (isXlsx) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
        r = parseMatrix(rows as string[][]);
      } else {
        const texto = await file.text();
        r = parseCsv(texto);
      }
    } catch (e: any) {
      toast.error("Falha ao ler arquivo: " + (e?.message ?? e));
      return;
    }
    setCsvResult(r);
    setCsvFileName(file.name);
    if (r.validos === 0) {
      toast.error("Nenhum destinatário válido encontrado no CSV");
    } else {
      toast.success(`Arquivo carregado: ${r.validos} válidos de ${r.total}`);
    }
  };

  const limparCsv = () => {
    setCsvResult(null);
    setCsvFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setForm({
      nome: "", template_id: "", velocidade_envio: 500, agendado_para: "",
      destinatarios_raw: "",
      janela_inicio: "", janela_fim: "", timezone: "America/Sao_Paulo",
      dias_semana: [1, 2, 3, 4, 5],
    });
    limparCsv();
    setElResultados([]); setElSelecionados(new Set());
    setElFiltros({ busca: "", cidade: "", bairro: "", uf: "", cabo_eleitoral_id: "", lideranca_id: "", apenas_lgpd: false });
    setTab("manual");
  };

  const destinatariosFinal = useMemo(() => {
    if (tab === "csv" && csvResult) {
      return csvResult.itens
        .filter((i) => i._valido && telefoneValido(i.telefone) && !optoutDigits.has(i.telefone.replace(/\D/g, "")))
        .map((i) => ({ telefone: i.telefone, nome: i.nome, variaveis: i.variaveis }));
    }
    if (tab === "eleitores") {
      return elResultados
        .filter((e) => elSelecionados.has(e.id))
        .map((e) => ({ telefone: e.telefone, nome: e.nome }))
        .filter((d) => telefoneValido(d.telefone) && !optoutDigits.has((d.telefone ?? "").replace(/\D/g, "")));
    }
    return parseDestinatarios(form.destinatarios_raw)
      .filter((d) => telefoneValido(d.telefone) && !optoutDigits.has((d.telefone ?? "").replace(/\D/g, "")));
  }, [tab, csvResult, form.destinatarios_raw, optoutDigits, elResultados, elSelecionados]);

  const optoutBloqueados = useMemo(() => {
    if (tab === "csv" && csvResult) {
      return csvResult.itens.filter((i) => i._valido && optoutDigits.has(i.telefone)).length;
    }
    if (tab === "eleitores") {
      return elResultados
        .filter((e) => elSelecionados.has(e.id))
        .filter((e) => optoutDigits.has((e.telefone ?? "").replace(/\D/g, ""))).length;
    }
    return parseDestinatarios(form.destinatarios_raw)
      .filter((d) => optoutDigits.has((d.telefone ?? "").replace(/\D/g, ""))).length;
  }, [tab, csvResult, form.destinatarios_raw, optoutDigits, elResultados, elSelecionados]);

  // Resumo de envio: total bruto selecionado, opt-out bloqueados, e split WhatsApp validado x sem validação
  const resumoEnvio = useMemo(() => {
    let bruto = 0;
    let invalidos = 0;
    let comWhats = 0;
    let semWhats = 0;
    if (tab === "eleitores") {
      const sel = elResultados.filter((e) => elSelecionados.has(e.id));
      bruto = sel.length;
      invalidos = sel.filter((e) => !telefoneValido(e.telefone)).length;
      const validos = sel.filter((e) => telefoneValido(e.telefone) && !optoutDigits.has((e.telefone ?? "").replace(/\D/g, "")));
      comWhats = validos.filter((e) => e.telefone_validado || e.status_validacao_whatsapp === "validado").length;
      semWhats = validos.length - comWhats;
    } else if (tab === "csv" && csvResult) {
      bruto = csvResult.itens.filter((i) => i._valido).length;
      invalidos = csvResult.itens.filter((i) => i._valido && !telefoneValido(i.telefone)).length;
      comWhats = destinatariosFinal.length;
      semWhats = 0;
    } else {
      const list = parseDestinatarios(form.destinatarios_raw);
      bruto = list.length;
      invalidos = list.filter((d) => !telefoneValido(d.telefone)).length;
      comWhats = destinatariosFinal.length;
      semWhats = 0;
    }
    return {
      bruto,
      optout: optoutBloqueados,
      invalidos,
      enviar: destinatariosFinal.length,
      comWhats,
      semWhats,
    };
  }, [tab, csvResult, form.destinatarios_raw, elResultados, elSelecionados, optoutDigits, optoutBloqueados, destinatariosFinal]);

  const templateSelecionado = useMemo(
    () => templates.find((t) => t.id === form.template_id) ?? null,
    [templates, form.template_id],
  );
  const varsRequeridas = contarVarsTemplate(templateSelecionado?.body_text);
  const destSemVars = useMemo(() => {
    if (!varsRequeridas) return 0;
    return destinatariosFinal.filter((d) => {
      const v: any = (d as any).variaveis;
      if (!v) return true;
      const count = Array.isArray(v) ? v.length : Object.keys(v).length;
      return count < varsRequeridas;
    }).length;
  }, [destinatariosFinal, varsRequeridas]);

  const salvar = async () => {
    const dest = destinatariosFinal;
    if (!form.nome || dest.length === 0) {
      toast.error("Informe nome e ao menos um destinatário");
      return;
    }
    if (varsRequeridas > 0 && destSemVars > 0) {
      const ok = confirm(
        `${destSemVars} de ${dest.length} destinatários não têm todas as ${varsRequeridas} variáveis exigidas pelo template. Continuar mesmo assim?`,
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      await waBulkService.createCampanha({
        nome: form.nome,
        template_id: form.template_id || null,
        velocidade_envio: form.velocidade_envio,
        agendado_para: form.agendado_para || null,
        janela_inicio: form.janela_inicio || null,
        janela_fim: form.janela_fim || null,
        timezone: form.timezone || "America/Sao_Paulo",
        dias_semana: form.dias_semana,
        destinatarios: dest,
      });
      toast.success(`Campanha criada com ${dest.length} destinatários`);
      setOpen(false);
      resetForm();
      carregar();
    } catch (e: any) { toast.error(e.message ?? "Erro ao criar"); }
    finally { setSaving(false); }
  };

  const acao = async (c: WaBulkCampanha, status: WaBulkCampanha["status"]) => {
    try {
      await waBulkService.updateCampanhaStatus(c.id, status);
      toast.success("Status atualizado");
      carregar();
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  const dispararWorker = async () => {
    try {
      const r = await waBulkService.dispararWorker();
      toast.success(`Worker: ${r?.processados ?? 0} processadas`);
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Campanhas</h2>
          <p className="text-sm text-muted-foreground">Disparos API OFICIAL via Meta.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={dispararWorker}><Send className="mr-2 h-4 w-4" /> Disparar fila</Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova campanha</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Template</Label>
                    <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                      <SelectContent>
                        {templates.filter((t) => t.status === "aprovado").map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome} {contarVarsTemplate(t.body_text) > 0 && `· ${contarVarsTemplate(t.body_text)} var`}
                          </SelectItem>
                        ))}
                        {templates.filter((t) => t.status === "aprovado").length === 0 && (
                          <div className="p-2 text-xs text-muted-foreground">Nenhum template aprovado</div>
                        )}
                      </SelectContent>
                    </Select>
                    {templateSelecionado && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {varsRequeridas === 0
                          ? "Sem variáveis."
                          : `Requer ${varsRequeridas} variável(is). Use colunas no CSV: ${Array.from({ length: varsRequeridas }, (_, i) => `var${i + 1}`).join(", ")}`}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Velocidade (msg/h)</Label>
                    <Input type="number" value={form.velocidade_envio} onChange={(e) => setForm({ ...form, velocidade_envio: +e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Agendar para (opcional)</Label>
                  <Input type="datetime-local" value={form.agendado_para} onChange={(e) => setForm({ ...form, agendado_para: e.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Janela início</Label>
                    <Input type="time" value={form.janela_inicio} onChange={(e) => setForm({ ...form, janela_inicio: e.target.value })} />
                  </div>
                  <div>
                    <Label>Janela fim</Label>
                    <Input type="time" value={form.janela_fim} onChange={(e) => setForm({ ...form, janela_fim: e.target.value })} />
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="America/Sao_Paulo" />
                  </div>
                </div>
                <div>
                  <Label>Dias da semana permitidos</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {[
                      { v: 1, l: "Seg" }, { v: 2, l: "Ter" }, { v: 3, l: "Qua" },
                      { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" }, { v: 7, l: "Dom" },
                    ].map((d) => {
                      const ativo = form.dias_semana.includes(d.v);
                      return (
                        <button
                          key={d.v}
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            dias_semana: ativo
                              ? form.dias_semana.filter((x) => x !== d.v)
                              : [...form.dias_semana, d.v].sort(),
                          })}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                            ativo ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {d.l}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Deixe a janela em branco para enviar 24h. Sem dias selecionados = todos os dias.
                  </p>
                </div>
                <div>
                  <Label>Destinatários *</Label>
                  <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-1">
                    <TabsList>
                      <TabsTrigger value="manual">Colar lista</TabsTrigger>
                      <TabsTrigger value="csv"><FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Importar CSV</TabsTrigger>
                      <TabsTrigger value="eleitores"><Users className="mr-1 h-3.5 w-3.5" /> Da base de Eleitores</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="mt-2">
                      <Textarea
                        rows={8}
                        value={form.destinatarios_raw}
                        onChange={(e) => setForm({ ...form, destinatarios_raw: e.target.value })}
                        placeholder={"5511999999999, Maria\n5511888888888, João"}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        1 por linha — formato: telefone, nome. Total:{" "}
                        {parseDestinatarios(form.destinatarios_raw).length}
                      </p>
                    </TabsContent>
                    <TabsContent value="csv" className="mt-2 space-y-3">
                      {!csvResult ? (
                        <div
                          className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const f = e.dataTransfer.files?.[0];
                            if (f) onCsvFile(f);
                          }}
                        >
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm font-medium">Arraste CSV ou XLSX aqui (ou clique para selecionar)</p>
                          <p className="text-xs text-muted-foreground">
                            Colunas aceitas: <code>telefone</code>, <code>nome</code> + variáveis livres · máx. 10MB
                          </p>
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            className="max-w-xs"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsvFile(f); }}
                          />
                        </div>
                      ) : (
                        <CsvPreview
                          fileName={csvFileName}
                          result={csvResult}
                          onRemove={limparCsv}
                        />
                      )}
                    </TabsContent>
                    <TabsContent value="eleitores" className="mt-2 space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        <Input placeholder="Buscar nome ou telefone" value={elFiltros.busca} onChange={(e) => setElFiltros({ ...elFiltros, busca: e.target.value })} />
                        <Input placeholder="Cidade" value={elFiltros.cidade} onChange={(e) => setElFiltros({ ...elFiltros, cidade: e.target.value })} />
                        <Input placeholder="Bairro" value={elFiltros.bairro} onChange={(e) => setElFiltros({ ...elFiltros, bairro: e.target.value })} />
                        <Input placeholder="UF (ex: SP)" maxLength={2} value={elFiltros.uf} onChange={(e) => setElFiltros({ ...elFiltros, uf: e.target.value.toUpperCase() })} />
                        <Select value={elFiltros.cabo_eleitoral_id || "__all"} onValueChange={(v) => setElFiltros({ ...elFiltros, cabo_eleitoral_id: v === "__all" ? "" : v })}>
                          <SelectTrigger><SelectValue placeholder="Cabo eleitoral" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all">Todos os cabos</SelectItem>
                            {cabos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={elFiltros.lideranca_id || "__all"} onValueChange={(v) => setElFiltros({ ...elFiltros, lideranca_id: v === "__all" ? "" : v })}>
                          <SelectTrigger><SelectValue placeholder="Liderança" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all">Todas as lideranças</SelectItem>
                            {liderancas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" checked={elFiltros.apenas_lgpd} onChange={(e) => setElFiltros({ ...elFiltros, apenas_lgpd: e.target.checked })} />
                          Apenas com aceite LGPD
                        </label>
                        <Button size="sm" onClick={buscarEleitores} disabled={elBuscando}>
                          <Search className="mr-1 h-3.5 w-3.5" /> {elBuscando ? "Buscando..." : "Buscar"}
                        </Button>
                      </div>
                      {elResultados.length > 0 && (
                        <div className="rounded-md border">
                          <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-xs">
                            <span>{elResultados.length} encontrados · {elSelecionados.size} selecionados</span>
                            <div className="flex gap-2">
                              <button type="button" className="text-primary hover:underline" onClick={() => setElSelecionados(new Set(elResultados.map((e) => e.id)))}>
                                Selecionar todos
                              </button>
                              <button type="button" className="text-muted-foreground hover:underline" onClick={() => setElSelecionados(new Set())}>
                                Limpar
                              </button>
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-xs">
                              <tbody>
                                {elResultados.slice(0, 500).map((e) => {
                                  const sel = elSelecionados.has(e.id);
                                  const optout = optoutDigits.has((e.telefone ?? "").replace(/\D/g, ""));
                                  return (
                                    <tr key={e.id} className={`border-t ${optout ? "opacity-50" : ""}`}>
                                      <td className="w-8 px-2">
                                        <input type="checkbox" checked={sel} onChange={() => toggleSelEleitor(e.id)} />
                                      </td>
                                      <td className="py-1.5 font-medium">{e.nome}</td>
                                      <td className="text-muted-foreground">{e.telefone}</td>
                                      <td className="text-muted-foreground">{[e.bairro, e.cidade, e.uf].filter(Boolean).join(" · ")}</td>
                                      {optout && <td className="pr-2 text-right text-amber-600">opt-out</td>}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {elResultados.length > 500 && (
                              <p className="border-t bg-muted/30 px-3 py-1.5 text-center text-xs text-muted-foreground">
                                Exibindo 500 de {elResultados.length}. Refine os filtros para ver outros.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                  {destinatariosFinal.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-600" />
                      {destinatariosFinal.length} destinatários serão enviados.
                    </p>
                  )}
                  {varsRequeridas > 0 && destSemVars > 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      <AlertCircle className="mr-1 inline h-3 w-3" />
                      {destSemVars} destinatário(s) sem todas as {varsRequeridas} variáveis.
                    </p>
                  )}
                  {optoutBloqueados > 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      <AlertCircle className="mr-1 inline h-3 w-3" />
                      {optoutBloqueados} contato(s) na lista de opt-out serão ignorados automaticamente.
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => {
                    if (!form.nome || destinatariosFinal.length === 0) {
                      toast.error("Informe nome e ao menos um destinatário");
                      return;
                    }
                    setConfirmOpen(true);
                  }}
                  disabled={saving}
                >
                  {saving ? "Criando..." : "Revisar e criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent className="max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar envio da campanha</AlertDialogTitle>
                <AlertDialogDescription>
                  Revise os números abaixo antes de criar a campanha <strong>{form.nome || "—"}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <ResumoLinha icon={<Users className="h-4 w-4 text-muted-foreground" />} label="Total selecionado" value={resumoEnvio.bruto} />
                <ResumoLinha icon={<AlertCircle className="h-4 w-4 text-amber-600" />} label="Telefones inválidos" value={resumoEnvio.invalidos} tone={resumoEnvio.invalidos > 0 ? "warn" : undefined} />
                <ResumoLinha icon={<Ban className="h-4 w-4 text-amber-600" />} label="Opt-out bloqueados" value={resumoEnvio.optout} tone={resumoEnvio.optout > 0 ? "warn" : undefined} />
                <div className="my-1 border-t" />
                <ResumoLinha icon={<MessageSquare className="h-4 w-4 text-emerald-600" />} label="Enviar via WhatsApp (validados)" value={resumoEnvio.comWhats} tone="ok" highlight />
                {resumoEnvio.semWhats > 0 && (
                  <ResumoLinha icon={<MessageCircleQuestion className="h-4 w-4 text-blue-600" />} label="Sem validação WhatsApp (tentativa via Meta API)" value={resumoEnvio.semWhats} />
                )}
                <div className="my-1 border-t" />
                <ResumoLinha icon={<Send className="h-4 w-4 text-primary" />} label="Total a enviar" value={resumoEnvio.enviar} highlight tone="ok" />
                {varsRequeridas > 0 && destSemVars > 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    <AlertCircle className="mr-1 inline h-3 w-3" />
                    {destSemVars} destinatário(s) sem todas as {varsRequeridas} variáveis exigidas pelo template.
                  </p>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={saving}>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={saving || resumoEnvio.enviar === 0}
                  onClick={async (e) => {
                    e.preventDefault();
                    await salvar();
                    setConfirmOpen(false);
                  }}
                >
                  {saving ? "Criando..." : `Confirmar e criar (${resumoEnvio.enviar.toLocaleString()})`}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Carregando...</Card>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma campanha criada.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const st = STATUS[c.status] ?? STATUS.rascunho;
            const total = c.total_destinatarios || 1;
            const pct = Math.min(100, Math.round((c.total_enviados / total) * 100));
            return (
              <Card key={c.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{c.nome}</h3>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Criada em {new Date(c.created_at).toLocaleString()}
                      {c.agendado_para && ` · Agendada: ${new Date(c.agendado_para).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/app/whatsapp-bulk/campanhas/${c.id}`}>
                        Detalhes <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    {(c.status === "rascunho" || c.status === "agendada" || c.status === "pausada") && !c.pausada && (
                      <Button size="sm" onClick={() => acao(c, "em_andamento")}>
                        <Play className="mr-1 h-3.5 w-3.5" /> Iniciar
                      </Button>
                    )}
                    {c.status !== "concluida" && c.status !== "cancelada" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await waBulkService.pausarCampanha(c.id, !c.pausada);
                            toast.success(c.pausada ? "Campanha retomada" : "Campanha pausada");
                            carregar();
                          } catch (e: any) { toast.error(e.message ?? "Erro"); }
                        }}
                      >
                        {c.pausada ? <><Play className="mr-1 h-3.5 w-3.5" /> Retomar</> : <><Pause className="mr-1 h-3.5 w-3.5" /> Pausar</>}
                      </Button>
                    )}
                    {c.status !== "concluida" && c.status !== "cancelada" && (
                      <Button size="sm" variant="ghost" onClick={() => acao(c, "cancelada")}>
                        <X className="mr-1 h-3.5 w-3.5" /> Cancelar
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <Metric label="Total" value={c.total_destinatarios} />
                  <Metric label="Enviados" value={c.total_enviados} />
                  <Metric label="Entregues" value={c.total_entregues} />
                  <Metric label="Erros" value={c.total_erros} />
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} className="mt-1 h-2" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function CsvPreview({
  fileName,
  result,
  onRemove,
}: {
  fileName: string;
  result: CsvParseResult;
  onRemove: () => void;
}) {
  const preview = result.itens.slice(0, 8);
  const invalidos = result.itens.filter((i) => !i._valido).slice(0, 5);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{fileName}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          <X className="mr-1 h-3.5 w-3.5" /> Trocar arquivo
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Total" value={result.total} />
        <Stat label="Válidos" value={result.validos} className="text-emerald-600" />
        <Stat label="Inválidos" value={result.invalidos} className="text-amber-600" />
        <Stat label="Duplicados" value={result.duplicados} className="text-amber-600" />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 py-1 text-left">#</th>
              <th className="px-2 py-1 text-left">Telefone</th>
              <th className="px-2 py-1 text-left">Nome</th>
              <th className="px-2 py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((i, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-2 py-1 text-muted-foreground">{i._linha}</td>
                <td className="px-2 py-1 font-mono">{i.telefone || "—"}</td>
                <td className="px-2 py-1">{i.nome || "—"}</td>
                <td className="px-2 py-1">
                  {i._valido ? (
                    <Badge variant="outline" className="text-emerald-600">OK</Badge>
                  ) : (
                    <Badge variant="destructive">{i._motivo}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.total > preview.length && (
          <p className="border-t bg-muted/30 px-2 py-1 text-center text-xs text-muted-foreground">
            +{result.total - preview.length} linhas adicionais
          </p>
        )}
      </div>
      {invalidos.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="flex items-center gap-1 font-medium">
            <AlertCircle className="h-3.5 w-3.5" /> Linhas com problema (primeiras 5):
          </p>
          <ul className="mt-1 list-disc pl-5">
            {invalidos.map((i, idx) => (
              <li key={idx}>Linha {i._linha}: {i._motivo}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${className ?? ""}`}>{value}</p>
    </div>
  );
}
function ResumoLinha({ icon, label, value, tone, highlight }: { icon: React.ReactNode; label: string; value: number; tone?: "ok" | "warn"; highlight?: boolean }) {
  const toneClass = tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-foreground";
  return (
    <div className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 ${highlight ? "bg-muted/50" : ""}`}>
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-base font-semibold tabular-nums ${toneClass}`}>{value.toLocaleString()}</span>
    </div>
  );
}
