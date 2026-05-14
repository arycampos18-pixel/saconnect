import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { campanhasService, type PreviewSegmento } from "../services/campanhasService";
import { segmentacaoService, type Segmento, type SegmentoFiltros } from "@/modules/segmentacao/services/segmentacaoService";
import { departamentosService } from "@/modules/departamentos-gabinete/services/departamentosService";
import type { DepartamentoGab } from "@/modules/departamentos-gabinete/data/mock";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { Users, Phone, Mail, ShieldCheck, Send, Search, Check, ChevronsUpDown, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string; color?: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="mt-1 w-full justify-between font-normal h-auto min-h-9 py-1.5">
            <div className="flex flex-wrap gap-1 items-center">
              {selected.length === 0 ? (
                <span className="text-muted-foreground text-sm">Todos</span>
              ) : (
                selected.slice(0, 4).map((v) => {
                  const opt = options.find((o) => o.value === v);
                  return (
                    <Badge key={v} variant="secondary" className="gap-1 pl-2 pr-1">
                      {opt?.color && <span className="inline-block h-2 w-2 rounded-full" style={{ background: opt.color }} />}
                      {opt?.label ?? v}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggle(v); }}
                        className="ml-0.5 rounded hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })
              )}
              {selected.length > 4 && <Badge variant="secondary">+{selected.length - 4}</Badge>}
            </div>
            <Search className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command>
            <CommandInput placeholder={`Buscar ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>Nenhum resultado.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const isSel = selected.includes(o.value);
                  return (
                    <CommandItem key={o.value} value={o.label} onSelect={() => onToggle(o.value)}>
                      <Check className={cn("mr-2 h-4 w-4", isSel ? "opacity-100" : "opacity-0")} />
                      {o.color && <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: o.color }} />}
                      {o.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
}

export function NovaCampanhaDialog({ open, onOpenChange, onSent }: Props) {
  const { loading: companyLoading, currentCompany } = useCompany();
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [loadingSeg, setLoadingSeg] = useState(false);
  const [segmentoId, setSegmentoId] = useState("");
  const [segmentoOpen, setSegmentoOpen] = useState(false);
  const [modo, setModo] = useState<"segmento" | "filtro">("segmento");
  const [opcoes, setOpcoes] = useState<{
    bairros: string[]; cidades: string[]; origens: string[];
    tags: { id: string; nome: string; cor: string }[];
  }>({ bairros: [], cidades: [], origens: [], tags: [] });
  const [departamentos, setDepartamentos] = useState<DepartamentoGab[]>([]);
  const [filtros, setFiltros] = useState<SegmentoFiltros>({});
  const [nome, setNome] = useState("");
  const [canal, setCanal] = useState<"WhatsApp" | "SMS" | "Email">("WhatsApp");
  const [conteudo, setConteudo] = useState("");
  const [apenasLgpd, setApenasLgpd] = useState(true);
  const [preview, setPreview] = useState<PreviewSegmento | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open || companyLoading || !currentCompany) return;
    setLoadingSeg(true);
      Promise.all([
        segmentacaoService.listar(),
        segmentacaoService.opcoesDisponiveis(),
        departamentosService.listarDepartamentos().catch((e: Error) => {
          console.error("[NovaCampanhaDialog] departamentos:", e);
          toast.error("Não foi possível carregar departamentos.", {
            description: e?.message ?? String(e),
          });
          return [] as DepartamentoGab[];
        }),
      ])
        .then(([segs, ops, deps]) => {
          setSegmentos(segs);
          setDepartamentos((deps ?? []).filter((d) => d.status !== "Inativo"));
          setOpcoes({
            bairros: ops.bairros, cidades: ops.cidades, origens: ops.origens,
            tags: ops.tags,
          });
        })
        .catch((e) => toast.error("Erro ao carregar dados", { description: e.message }))
        .finally(() => setLoadingSeg(false));
    setNome(""); setConteudo(""); setSegmentoId(""); setPreview(null);
    setApenasLgpd(true); setCanal("WhatsApp"); setFiltros({}); setModo("segmento");
  }, [open, companyLoading, currentCompany?.id]);

  useEffect(() => {
    if (modo === "segmento") {
      if (!segmentoId) { setPreview(null); return; }
      setLoadingPrev(true);
      campanhasService.previewSegmento(segmentoId)
        .then(setPreview)
        .catch((e) => toast.error("Erro no preview", { description: e.message }))
        .finally(() => setLoadingPrev(false));
    } else {
      const temFiltro = Object.values(filtros).some((v) =>
        Array.isArray(v) ? v.length > 0 : v != null && v !== ""
      );
      if (!temFiltro) { setPreview(null); return; }
      setLoadingPrev(true);
      const t = setTimeout(() => {
        campanhasService.previewFiltros(filtros)
          .then(setPreview)
          .catch((e) => toast.error("Erro no preview", { description: e.message }))
          .finally(() => setLoadingPrev(false));
      }, 300);
      return () => clearTimeout(t);
    }
  }, [segmentoId, modo, filtros]);

  const elegiveis = preview
    ? canal === "Email"
      ? (apenasLgpd ? Math.min(preview.comEmail, preview.comConsentimento) : preview.comEmail)
      : (apenasLgpd ? Math.min(preview.comTelefone, preview.comConsentimento) : preview.comTelefone)
    : 0;

  const enviar = async () => {
    if (!nome.trim() || !conteudo.trim()) {
      toast.error("Preencha nome e conteúdo"); return;
    }
    if (modo === "segmento" && !segmentoId) {
      toast.error("Escolha um segmento"); return;
    }
    if (modo === "filtro" && !preview) {
      toast.error("Defina ao menos um filtro"); return;
    }
    setEnviando(true);
    try {
      const total = await campanhasService.enviarCampanha({
        nome, canal, conteudo,
        segmento_id: modo === "segmento" ? segmentoId : null,
        filtros_adhoc: modo === "filtro" ? filtros : undefined,
        nome_filtro: modo === "filtro" ? "Filtro rápido" : undefined,
        apenas_lgpd: apenasLgpd,
      });
      toast.success(`Campanha enviada para ${total} destinatários`);
      onOpenChange(false);
      onSent();
    } catch (e: any) {
      toast.error("Erro ao enviar", { description: e.message });
    } finally {
      setEnviando(false);
    }
  };

  const segSelecionado = segmentos.find((s) => s.id === segmentoId);

  /** Departamentos do gabinete + valores já usados em `eleitores.origem` (o filtro segmenta por esse campo). */
  const opcoesDepartamentoOuOrigem = useMemo(() => {
    const fromDeps = departamentos.map((d) => ({ value: d.nome.trim(), label: d.nome.trim() }));
    const fromOrigem = opcoes.origens.map((o) => ({ value: o.trim(), label: o.trim() }));
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (const x of [...fromDeps, ...fromOrigem]) {
      const k = x.value;
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push({ value: k, label: x.label });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [departamentos, opcoes.origens]);

  const toggleArr = (key: keyof SegmentoFiltros, val: string) => {
    setFiltros((prev) => {
      const cur = (prev[key] as string[] | undefined) ?? [];
      const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
      return { ...prev, [key]: next };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova campanha segmentada</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome da campanha</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Convite evento sábado" /></div>
            <div>
              <Label>Canal</Label>
              <Select value={canal} onValueChange={(v: any) => setCanal(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Público-alvo</Label>
            <Tabs value={modo} onValueChange={(v) => { setModo(v as any); setPreview(null); }} className="mt-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="segmento">Segmento salvo</TabsTrigger>
                <TabsTrigger value="filtro">Filtro rápido</TabsTrigger>
              </TabsList>

              <TabsContent value="segmento" className="mt-3 space-y-1">
                <Popover open={segmentoOpen} onOpenChange={setSegmentoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                      disabled={loadingSeg || segmentos.length === 0}
                    >
                      {segSelecionado ? (
                        <span className="inline-flex items-center gap-2 truncate">
                          <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: segSelecionado.cor }} />
                          {segSelecionado.nome}
                          <span className="text-muted-foreground">({segSelecionado.total_cache})</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {loadingSeg ? "Carregando segmentos..." : segmentos.length === 0 ? "Nenhum segmento cadastrado" : "Escolha um segmento..."}
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar segmento..." />
                      <CommandList>
                        <CommandEmpty>Nenhum segmento encontrado.</CommandEmpty>
                        <CommandGroup>
                          {segmentos.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={`${s.nome} ${s.descricao ?? ""}`}
                              onSelect={() => { setSegmentoId(s.id); setSegmentoOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", segmentoId === s.id ? "opacity-100" : "opacity-0")} />
                              <span className="inline-block h-2 w-2 rounded-full mr-2 shrink-0" style={{ background: s.cor }} />
                              <span className="flex-1 truncate">{s.nome}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{s.total_cache}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {!loadingSeg && segmentos.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Você ainda não tem segmentos.{" "}
                    <Link to="/app/political/segmentation" className="text-primary underline" onClick={() => onOpenChange(false)}>
                      Criar segmento
                    </Link>
                  </p>
                )}
              </TabsContent>

              <TabsContent value="filtro" className="mt-3 space-y-3">
                <MultiSelect label="Bairros" options={opcoes.bairros.map((b) => ({ value: b, label: b }))} selected={filtros.bairros ?? []} onToggle={(v) => toggleArr("bairros", v)} />
                <MultiSelect label="Cidades" options={opcoes.cidades.map((c) => ({ value: c, label: c }))} selected={filtros.cidades ?? []} onToggle={(v) => toggleArr("cidades", v)} />
                <MultiSelect label="Tags" options={opcoes.tags.map((t) => ({ value: t.id, label: t.nome, color: t.cor }))} selected={filtros.tags ?? []} onToggle={(v) => toggleArr("tags", v)} />
                <MultiSelect
                  label="Departamentos"
                  options={opcoesDepartamentoOuOrigem}
                  selected={filtros.origens ?? []}
                  onToggle={(v) => toggleArr("origens", v)}
                />
                <p className="text-[11px] text-muted-foreground -mt-1">
                  Filtra pelo campo <strong>origem</strong> do eleitor (use o mesmo nome do departamento na ficha do eleitor para coincidir).
                </p>
              </TabsContent>
            </Tabs>
          </div>
          <div>
            <Label>Conteúdo</Label>
            <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={5} placeholder="Olá {{nome}}, ..." />
            <p className="mt-1 text-xs text-muted-foreground">{conteudo.length} caracteres</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="lgpd" checked={apenasLgpd} onCheckedChange={(v) => setApenasLgpd(!!v)} />
            <Label htmlFor="lgpd" className="cursor-pointer">Enviar apenas para quem aceitou LGPD</Label>
          </div>

          {loadingPrev ? (
            <p className="text-sm text-muted-foreground">Calculando preview...</p>
          ) : preview && (
            <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold">Preview do envio</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div><Users className="mx-auto h-4 w-4 text-primary" /><p className="text-lg font-bold">{preview.total}</p><p className="text-[10px] text-muted-foreground">No segmento</p></div>
                <div><Phone className="mx-auto h-4 w-4 text-primary" /><p className="text-lg font-bold">{preview.comTelefone}</p><p className="text-[10px] text-muted-foreground">Com telefone</p></div>
                <div><Mail className="mx-auto h-4 w-4 text-primary" /><p className="text-lg font-bold">{preview.comEmail}</p><p className="text-[10px] text-muted-foreground">Com email</p></div>
                <div><ShieldCheck className="mx-auto h-4 w-4 text-primary" /><p className="text-lg font-bold">{preview.comConsentimento}</p><p className="text-[10px] text-muted-foreground">LGPD</p></div>
              </div>
              <div className="rounded bg-background p-2 text-center text-sm">
                <span className="text-muted-foreground">Receberão: </span>
                <strong className="text-primary">{elegiveis} destinatários</strong>
              </div>
              {preview.exemplos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1">Exemplos:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {preview.exemplos.map((e, i) => (
                      <li key={i}>{e.nome} {canal === "Email" ? `· ${e.email ?? "—"}` : `· ${e.telefone ?? "—"}`}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando || !preview || elegiveis === 0}>
            <Send className="mr-2 h-4 w-4" /> Enviar para {elegiveis}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}