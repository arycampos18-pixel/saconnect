import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Upload, RefreshCw, History, PlayCircle, Trash2, BarChart3, Users, MapPin, Vote, X, Maximize2, GitCompare, StopCircle, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { analiseService } from "../services/analiseService";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const ANOS_DISPONIVEIS = [2024, 2022, 2020, 2018, 2016, 2014, 2012, 2010];
const CARGOS_DISPONIVEIS = [
  "Presidente", "Vice-Presidente", "Governador", "Vice-Governador",
  "Senador", "Deputado Federal", "Deputado Estadual", "Deputado Distrital",
  "Prefeito", "Vice-Prefeito", "Vereador",
];
const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))", "hsl(var(--ring))"];

type FiltrosState = {
  ano_eleicao: number | null; turno: number | null; uf: string | null;
  cargo: string | null; municipio: string | null; partido: string | null;
  candidato: string | null; numero_candidato: string | null;
};

const FILTROS_STORAGE_KEY = "tse:filtros:v1";
const FILTROS_DEFAULT: FiltrosState = {
  ano_eleicao: 2024, turno: null, uf: "GO", cargo: null, municipio: null,
  partido: null, candidato: null, numero_candidato: null,
};
const NUM_KEYS: (keyof FiltrosState)[] = ["ano_eleicao", "turno"];

const FILTRO_LABELS: Record<keyof FiltrosState, string> = {
  ano_eleicao: "Ano",
  turno: "Turno",
  uf: "UF",
  cargo: "Cargo",
  municipio: "Município",
  partido: "Partido",
  candidato: "Candidato",
  numero_candidato: "Nº",
};

function FiltrosChips({
  filtros, onRemove, onClearAll,
}: {
  filtros: FiltrosState;
  onRemove: (k: keyof FiltrosState) => void;
  onClearAll: () => void;
}) {
  const ativos = (Object.keys(filtros) as (keyof FiltrosState)[])
    .filter((k) => filtros[k] !== null && filtros[k] !== undefined && filtros[k] !== "");

  if (ativos.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-normal">Nenhum filtro aplicado</Badge>
        <span>Mostrando todos os resultados disponíveis.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          Filtros ativos
          <Badge variant="outline" className="h-4 min-w-4 px-1 text-[10px] font-mono">
            {ativos.length}
          </Badge>
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Limpar todos
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-[64px] sm:max-h-none overflow-y-auto">
        {ativos.map((k) => {
          const turnoLabel = k === "turno" ? `${filtros[k]}º turno` : String(filtros[k]);
          return (
            <Badge
              key={k}
              variant="secondary"
              className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal hover:bg-secondary/80 max-w-full"
            >
              <span className="text-muted-foreground shrink-0">{FILTRO_LABELS[k]}:</span>
              <span className="font-medium text-foreground max-w-[120px] sm:max-w-[180px] truncate">{turnoLabel}</span>
              <button
                type="button"
                onClick={() => onRemove(k)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-background/80 transition-colors shrink-0"
                aria-label={`Remover filtro ${FILTRO_LABELS[k]}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function parseFiltros(source: URLSearchParams | Record<string, string>): Partial<FiltrosState> {
  const get = (k: string) =>
    source instanceof URLSearchParams ? source.get(k) : (source[k] ?? null);
  const out: Partial<FiltrosState> = {};
  (Object.keys(FILTROS_DEFAULT) as (keyof FiltrosState)[]).forEach((k) => {
    const v = get(k);
    if (v === null || v === undefined || v === "") return;
    (out as any)[k] = NUM_KEYS.includes(k) ? Number(v) : v;
  });
  return out;
}

function loadFiltrosIniciais(searchParams: URLSearchParams): FiltrosState {
  const fromUrl = parseFiltros(searchParams);
  if (Object.keys(fromUrl).length > 0) return { ...FILTROS_DEFAULT, ...fromUrl };
  try {
    const raw = localStorage.getItem(FILTROS_STORAGE_KEY);
    if (raw) return { ...FILTROS_DEFAULT, ...parseFiltros(JSON.parse(raw)) };
  } catch { /* ignore */ }
  return FILTROS_DEFAULT;
}

function SelectFiltro({
  value, onChange, placeholder, options,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <Select value={value ?? "all"} onValueChange={(v) => onChange(v === "all" ? null : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value="all">Todos · {placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function FiltrosTSE({
  filtros, setFiltro, limpar, opcoes,
}: {
  filtros: FiltrosState;
  setFiltro: <K extends keyof FiltrosState>(k: K, v: FiltrosState[K]) => void;
  limpar: () => void;
  opcoes: { cargos: string[]; municipios: string[]; partidos: string[]; candidatos: string[]; numeros: string[] };
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 mb-3">
      <Select value={filtros.ano_eleicao ? String(filtros.ano_eleicao) : "all"}
        onValueChange={(v) => setFiltro("ano_eleicao", v === "all" ? null : Number(v))}>
        <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os anos</SelectItem>
          {ANOS_DISPONIVEIS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filtros.turno ? String(filtros.turno) : "all"}
        onValueChange={(v) => setFiltro("turno", v === "all" ? null : Number(v))}>
        <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os turnos</SelectItem>
          <SelectItem value="1">1º turno</SelectItem>
          <SelectItem value="2">2º turno</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filtros.uf ?? "all"} onValueChange={(v) => setFiltro("uf", v === "all" ? null : v)}>
        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas UFs</SelectItem>
          {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
        </SelectContent>
      </Select>
      <SelectFiltro value={filtros.cargo} onChange={(v) => setFiltro("cargo", v)}
        placeholder="Cargo" options={opcoes.cargos} />
      <SelectFiltro value={filtros.municipio} onChange={(v) => setFiltro("municipio", v)}
        placeholder="Município" options={opcoes.municipios} />
      <SelectFiltro value={filtros.partido} onChange={(v) => setFiltro("partido", v)}
        placeholder="Partido" options={opcoes.partidos} />
      <SelectFiltro value={filtros.candidato} onChange={(v) => setFiltro("candidato", v)}
        placeholder="Candidato" options={opcoes.candidatos} />
      <div className="col-span-2 md:col-span-1 flex gap-2">
        <div className="flex-1">
          <SelectFiltro value={filtros.numero_candidato} onChange={(v) => setFiltro("numero_candidato", v)}
            placeholder="Nº Candidato" options={opcoes.numeros} />
        </div>
        <Button variant="outline" onClick={limpar} title="Limpar filtros">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon, label, value, hint, accent = "primary",
}: {
  icon: any; label: string; value: React.ReactNode; hint?: React.ReactNode;
  accent?: "primary" | "accent" | "secondary" | "destructive";
}) {
  const accentMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary ring-primary/20",
    accent: "bg-accent/15 text-accent-foreground ring-accent/30",
    secondary: "bg-secondary text-secondary-foreground ring-border",
    destructive: "bg-destructive/10 text-destructive ring-destructive/20",
  };
  return (
    <Card className="relative overflow-hidden border-border/60 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`rounded-lg p-2.5 ring-1 ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl font-bold leading-tight tabular-nums truncate">{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-full w-full flex flex-col gap-2 p-2">
      <Skeleton className="h-3 w-32" />
      <div className="flex-1 grid grid-cols-6 items-end gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="w-full" style={{ height: `${30 + ((i * 17) % 60)}%` }} />
        ))}
      </div>
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center px-4">
      <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ChartFrame({
  title, subtitle, icon: Icon, isLoading, isEmpty, emptyMessage, action, heightClass, comparison, children,
}: {
  title: string; subtitle?: string; icon?: any;
  isLoading: boolean; isEmpty: boolean; emptyMessage: string;
  action?: React.ReactNode; heightClass?: string;
  comparison?: { dimension: "candidato" | "partido" | "municipio" | "cargo"; baseFiltros: FiltrosState };
  children: React.ReactNode;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const baseAno = comparison?.baseFiltros.ano_eleicao ?? 2024;
  const [periodA, setPeriodA] = useState<{ ano: number; turno: number | null }>({ ano: baseAno, turno: comparison?.baseFiltros.turno ?? null });
  const [periodB, setPeriodB] = useState<{ ano: number; turno: number | null }>({ ano: baseAno - 4, turno: comparison?.baseFiltros.turno ?? null });

  const compareEnabled = fullscreen && compareMode && !!comparison;

  const { data: rowsA = [], isLoading: loadingA } = useQuery({
    queryKey: ["tse-compare-A", comparison?.dimension, periodA, comparison?.baseFiltros],
    queryFn: () => analiseService.listarResultadosTSE({ ...comparison!.baseFiltros, ano_eleicao: periodA.ano, turno: periodA.turno }),
    enabled: compareEnabled,
  });
  const { data: rowsB = [], isLoading: loadingB } = useQuery({
    queryKey: ["tse-compare-B", comparison?.dimension, periodB, comparison?.baseFiltros],
    queryFn: () => analiseService.listarResultadosTSE({ ...comparison!.baseFiltros, ano_eleicao: periodB.ano, turno: periodB.turno }),
    enabled: compareEnabled,
  });

  const compareData = useMemo(() => {
    if (!comparison) return [] as { name: string; A: number; B: number; delta: number }[];
    const dim = comparison.dimension;
    const sumBy = (arr: any[]) => {
      const m = new Map<string, number>();
      for (const r of arr) {
        const k = r[dim]; if (!k) continue;
        m.set(String(k), (m.get(String(k)) ?? 0) + (Number(r.votos) || 0));
      }
      return m;
    };
    const a = sumBy(rowsA as any[]);
    const b = sumBy(rowsB as any[]);
    const all = new Set<string>([...a.keys(), ...b.keys()]);
    return [...all]
      .map((name) => {
        const A = a.get(name) ?? 0;
        const B = b.get(name) ?? 0;
        return { name, A, B, delta: A - B };
      })
      .sort((x, y) => (y.A + y.B) - (x.A + x.B))
      .slice(0, 10);
  }, [rowsA, rowsB, comparison]);

  const compareLoading = loadingA || loadingB;
  const totalA = compareData.reduce((s, r) => s + r.A, 0);
  const totalB = compareData.reduce((s, r) => s + r.B, 0);
  const labelA = `${periodA.ano}${periodA.turno ? ` · ${periodA.turno}º` : ""}`;
  const labelB = `${periodB.ano}${periodB.turno ? ` · ${periodB.turno}º` : ""}`;

  const canExpand = !isLoading && !isEmpty;
  return (
    <>
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-start gap-2 min-w-0">
          {Icon && (
            <div className="rounded-md bg-primary/10 text-primary p-1.5 mt-0.5">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold leading-tight">{title}</CardTitle>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {action}
          {canExpand && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFullscreen(true)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Ver em tela cheia"
              title="Ver em tela cheia"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent
        className={`pt-0 ${heightClass ?? "h-[260px] sm:h-[300px] md:h-[340px]"} ${
          canExpand ? "cursor-zoom-in" : ""
        }`}
        onClick={() => canExpand && setFullscreen(true)}
        role={canExpand ? "button" : undefined}
        aria-label={canExpand ? `Ampliar ${title}` : undefined}
      >
        {isLoading ? <ChartSkeleton /> : isEmpty ? <ChartEmpty message={emptyMessage} /> : children}
      </CardContent>
    </Card>
    <Dialog open={fullscreen} onOpenChange={setFullscreen}>
      <DialogContent className="max-w-[100vw] sm:max-w-[95vw] h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 gap-0 flex flex-col rounded-none sm:rounded-lg">
        <DialogHeader className="px-4 py-3 border-b border-border/60 shrink-0">
          <DialogTitle className="text-base flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            {title}
          </DialogTitle>
          {subtitle && <DialogDescription className="text-xs">{subtitle}</DialogDescription>}
          {comparison && (
            <div className="mt-2 pt-2 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`cmp-${title}`} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <GitCompare className="h-3.5 w-3.5 text-primary" />
                  Comparar dois períodos
                </label>
                <Switch id={`cmp-${title}`} checked={compareMode} onCheckedChange={setCompareMode} />
              </div>
              {compareMode && (
                <div className="grid grid-cols-2 gap-2">
                  <PeriodPicker label="Período A" color="hsl(var(--primary))" value={periodA} onChange={setPeriodA} />
                  <PeriodPicker label="Período B" color="hsl(var(--accent))" value={periodB} onChange={setPeriodB} />
                </div>
              )}
            </div>
          )}
        </DialogHeader>
        <div className="flex-1 min-h-0 p-3 sm:p-4">
          {compareMode && comparison ? (
            compareLoading ? (
              <ChartSkeleton />
            ) : compareData.length === 0 ? (
              <ChartEmpty message="Sem dados para os períodos selecionados." />
            ) : (
              <div className="h-full flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-border/60 p-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                      <span className="text-muted-foreground">{labelA}</span>
                    </div>
                    <div className="text-base font-semibold tabular-nums">{totalA.toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="rounded-md border border-border/60 p-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: "hsl(var(--accent))" }} />
                      <span className="text-muted-foreground">{labelB}</span>
                    </div>
                    <div className="text-base font-semibold tabular-nums">{totalB.toLocaleString("pt-BR")}</div>
                    <div className={`text-[11px] mt-0.5 ${totalA - totalB >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      Δ {totalA - totalB >= 0 ? "+" : ""}{(totalA - totalB).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString("pt-BR")} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any) => Number(v).toLocaleString("pt-BR")}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                      <Bar dataKey="A" name={labelA} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="B" name={labelB} fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          ) : (
            children
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function PeriodPicker({
  label, color, value, onChange,
}: {
  label: string;
  color: string;
  value: { ano: number; turno: number | null };
  onChange: (v: { ano: number; turno: number | null }) => void;
}) {
  return (
    <div className="rounded-md border border-border/60 p-2 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Select value={String(value.ano)} onValueChange={(v) => onChange({ ...value, ano: Number(v) })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ANOS_DISPONIVEIS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={value.turno ? String(value.turno) : "all"}
          onValueChange={(v) => onChange({ ...value, turno: v === "all" ? null : Number(v) })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Turno" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos turnos</SelectItem>
            <SelectItem value="1">1º turno</SelectItem>
            <SelectItem value="2">2º turno</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function AnaliseTSE() {
  const { isSuperAdmin, hasPermission, loading } = useCompany();
  const allowed = isSuperAdmin || hasPermission("configuracoes.manage");
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    ano_eleicao: 2024, turno: 1, uf: "GO",
    cargo: "", numero_candidato: "", partido: "", codigo_municipio: "",
  });
  const [anosHistorico, setAnosHistorico] = useState<number[]>([2024]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtros, setFiltros] = useState<FiltrosState>(() => loadFiltrosIniciais(searchParams));

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    (Object.keys(filtros) as (keyof FiltrosState)[]).forEach((k) => {
      const v = filtros[k];
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    try { localStorage.setItem(FILTROS_STORAGE_KEY, JSON.stringify(filtros)); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const { data: logs = [], isFetching: logsFetching, refetch: refetchLogs } = useQuery({
    queryKey: ["tse-logs"],
    queryFn: () => analiseService.listarLogsTSE(50),
    enabled: allowed,
    refetchInterval: (q) => {
      const data = (q.state.data as any[] | undefined) ?? [];
      const ativo = data.some((l) => l.status === "iniciado" || l.status === "processando");
      return ativo ? 1500 : false;
    },
  });

  const { data: ultimoBatch } = useQuery({
    queryKey: ["tse-ultimo-batch"],
    queryFn: () => analiseService.ultimoBatchTSE(),
    enabled: allowed && !batchId,
  });
  const batchAtivo = batchId ?? ultimoBatch ?? null;

  const { data: jobs = [] } = useQuery({
    queryKey: ["tse-jobs", batchAtivo],
    queryFn: () => analiseService.listarJobsTSE(batchAtivo),
    enabled: allowed && !!batchAtivo,
    refetchInterval: 4000,
  });

  const { data: rows = [], isLoading: rowsLoading, isFetching: rowsFetching } = useQuery({
    queryKey: ["tse-results", filtros],
    queryFn: () => analiseService.listarResultadosTSE(filtros),
    enabled: allowed,
  });

  const importar = useMutation({
    mutationFn: () => analiseService.importarTSE({
      ano_eleicao: Number(form.ano_eleicao),
      turno: Number(form.turno),
      uf: form.uf,
      cargo: form.cargo || null,
      numero_candidato: form.numero_candidato || null,
      partido: form.partido || null,
      codigo_municipio: form.codigo_municipio || null,
    }),
    onSuccess: (r) => {
      toast.success(r.started
        ? "Importação iniciada em background. Acompanhe o progresso nos logs."
        : `Importação concluída: ${r.importados}/${r.total} registros`);
      qc.invalidateQueries({ queryKey: ["tse-logs"] });
      qc.invalidateQueries({ queryKey: ["tse-results"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro na importação"),
  });

  const importarHistorico = useMutation({
    mutationFn: () => analiseService.importarTSEHistorico({
      uf: form.uf,
      escopo: "auto",
      cargo: form.cargo || null,
      codigo_municipio: form.codigo_municipio || null,
      anos: anosHistorico,
    }),
    onSuccess: (r) => {
      toast.success(`Importação histórica iniciada — ${r.total_jobs} jobs (${r.anos.join(", ")})`);
      setBatchId(r.batch_id);
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["tse-logs"] });
        qc.invalidateQueries({ queryKey: ["tse-results"] });
        qc.invalidateQueries({ queryKey: ["tse-jobs"] });
        qc.invalidateQueries({ queryKey: ["tse-ultimo-batch"] });
      }, 5000);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao iniciar importação histórica"),
  });

  const retomar = useMutation({
    mutationFn: () => analiseService.importarTSEHistorico({ retomar_batch_id: batchAtivo! }),
    onSuccess: (r) => {
      toast.success(r.total_jobs > 0
        ? `Retomando ${r.total_jobs} job(s) do lote`
        : "Nada a retomar — todos os jobs já concluíram");
      qc.invalidateQueries({ queryKey: ["tse-jobs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao retomar"),
  });

  const limparLogs = useMutation({
    mutationFn: () => analiseService.limparLogsTSE(),
    onSuccess: () => {
      toast.success("Logs de importação removidos");
      qc.invalidateQueries({ queryKey: ["tse-logs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao limpar logs"),
  });

  const cancelarImport = useMutation({
    mutationFn: (logId: string) => analiseService.cancelarImportacaoTSE(logId),
    onSuccess: () => {
      toast.success("Cancelamento solicitado. A importação será encerrada nos próximos segundos.");
      refetchLogs();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao cancelar"),
  });

  const marcarErro = useMutation({
    mutationFn: (logId: string) => analiseService.marcarLogTSEComoErro(logId),
    onSuccess: () => {
      toast.success("Importação travada marcada como erro.");
      refetchLogs();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao marcar"),
  });

  // Detecta importações travadas: ativas há mais de N segundos sem nenhuma atualização de progresso.
  const STUCK_THRESHOLD_SEC = 60;
  const stuckLogs = useMemo(() => {
    const agora = Date.now();
    return (logs as any[]).filter((l) => {
      if (l.status !== "iniciado" && l.status !== "processando") return false;
      const prog = (l.detalhes && (l.detalhes as any).progresso) || null;
      const ref = prog?.atualizado_em ? new Date(prog.atualizado_em).getTime() : new Date(l.created_at).getTime();
      return agora - ref > STUCK_THRESHOLD_SEC * 1000;
    });
  }, [logs]);

  // Refresca o relógio a cada 5s para reavaliar quando uma importação fica travada
  const [, setTick] = useState(0);
  useEffect(() => {
    const ativos = (logs as any[]).some((l) => l.status === "iniciado" || l.status === "processando");
    if (!ativos) return;
    const t = setInterval(() => setTick((v) => v + 1), 5000);
    return () => clearInterval(t);
  }, [logs]);

  // Bloqueia novas importações enquanto houver alguma ativa (iniciado/processando)
  // que ainda não esteja travada — evita sobrecarga e duplicação.
  const importacaoAtiva = useMemo(() => {
    const stuckIds = new Set(stuckLogs.map((l: any) => l.id));
    return (logs as any[]).some(
      (l) => (l.status === "iniciado" || l.status === "processando") && !stuckIds.has(l.id),
    );
  }, [logs, stuckLogs]);

  const tentarNovamente = (l: any) => {
    if (importacaoAtiva) {
      toast.error("Já existe uma importação em andamento. Aguarde concluir antes de tentar novamente.");
      return;
    }
    marcarErro.mutate(l.id, {
      onSuccess: async () => {
        try {
          await analiseService.importarTSE({
            ano_eleicao: Number(l.ano_eleicao),
            turno: Number(l.turno) || 1,
            uf: String(l.uf || "").toUpperCase(),
            cargo: l.cargo ?? null,
          });
          toast.success("Nova tentativa enviada.");
          refetchLogs();
        } catch (e: any) {
          toast.error(e?.message ?? "Falha ao reenviar");
        }
      },
    });
  };

  const jobsResumo = useMemo(() => {
    const arr = jobs as any[];
    const by = (s: string) => arr.filter((j) => j.status === s).length;
    return {
      total: arr.length,
      pendente: by("pendente"),
      em_andamento: by("em_andamento"),
      concluido: by("concluido"),
      erro: by("erro"),
      pendentesOuErro: by("pendente") + by("erro") + by("em_andamento"),
    };
  }, [jobs]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error("Arquivo vazio");
      const header = lines[0].split(/[;,]/).map((h) => h.trim().toLowerCase());
      const idx = (n: string) => header.indexOf(n);
      const required = ["ano_eleicao", "uf", "cargo", "candidato", "votos"];
      for (const r of required) if (idx(r) < 0) throw new Error(`Coluna obrigatória ausente: ${r}`);
      const rows = lines.slice(1).map((l) => {
        const c = l.split(/[;,]/);
        return {
          ano_eleicao: Number(c[idx("ano_eleicao")]),
          turno: Number(c[idx("turno")] ?? 1) || 1,
          uf: c[idx("uf")],
          municipio: idx("municipio") >= 0 ? c[idx("municipio")] : null,
          codigo_municipio: idx("codigo_municipio") >= 0 ? c[idx("codigo_municipio")] : null,
          cargo: c[idx("cargo")],
          codigo_cargo: idx("codigo_cargo") >= 0 ? c[idx("codigo_cargo")] : null,
          candidato: c[idx("candidato")],
          numero_candidato: idx("numero_candidato") >= 0 ? c[idx("numero_candidato")] : null,
          partido: idx("partido") >= 0 ? c[idx("partido")] : null,
          zona_eleitoral: idx("zona_eleitoral") >= 0 ? c[idx("zona_eleitoral")] : null,
          secao_eleitoral: idx("secao_eleitoral") >= 0 ? c[idx("secao_eleitoral")] : null,
          votos: Number(c[idx("votos")]) || 0,
          fonte_arquivo: `manual:${file.name}`,
          status_importacao: "manual",
        };
      });
      return analiseService.uploadManualTSE(rows);
    },
    onSuccess: (r) => {
      toast.success(`Upload concluído: ${r.count} registros`);
      qc.invalidateQueries({ queryKey: ["tse-results"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro no upload"),
  });

  const resumo = useMemo(() => {
    const ultima = (logs as any[])[0];
    const seções = new Set<string>();
    (rows as any[]).forEach((r) => r.zona_eleitoral && seções.add(`${r.zona_eleitoral}-${r.secao_eleitoral ?? ""}`));
    return { ultima, seções: seções.size };
  }, [logs, rows]);

  const dashboard = useMemo(() => {
    const arr = rows as any[];
    const totalVotos = arr.reduce((s, r) => s + (Number(r.votos) || 0), 0);
    const candidatos = new Map<string, number>();
    const partidos = new Map<string, number>();
    const municipios = new Map<string, number>();
    const cargos = new Map<string, number>();
    for (const r of arr) {
      const v = Number(r.votos) || 0;
      if (r.candidato) candidatos.set(`${r.candidato} (${r.partido ?? "—"})`, (candidatos.get(`${r.candidato} (${r.partido ?? "—"})`) ?? 0) + v);
      if (r.partido) partidos.set(r.partido, (partidos.get(r.partido) ?? 0) + v);
      if (r.municipio) municipios.set(r.municipio, (municipios.get(r.municipio) ?? 0) + v);
      if (r.cargo) cargos.set(r.cargo, (cargos.get(r.cargo) ?? 0) + v);
    }
    const top = (m: Map<string, number>, n = 10) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, votos]) => ({ name, votos }));
    return {
      totalVotos,
      qtdCandidatos: candidatos.size,
      qtdPartidos: partidos.size,
      qtdMunicipios: municipios.size,
      topCandidatos: top(candidatos),
      topPartidos: top(partidos, 8),
      topMunicipios: top(municipios),
      porCargo: top(cargos, 8),
    };
  }, [rows]);

  const setFiltro = <K extends keyof FiltrosState>(k: K, v: FiltrosState[K]) =>
    setFiltros((f) => ({ ...f, [k]: v }));

  const opcoesFiltros = useMemo(() => {
    const arr = rows as any[];
    const uniq = (key: string) => {
      const s = new Set<string>();
      for (const r of arr) {
        const v = r?.[key];
        if (v !== null && v !== undefined && String(v).trim() !== "") s.add(String(v));
      }
      return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
    };
    const cargosBase = uniq("cargo");
    const cargos = [...new Set([...CARGOS_DISPONIVEIS, ...cargosBase])];
    return {
      cargos,
      municipios: uniq("municipio"),
      partidos: uniq("partido"),
      candidatos: uniq("candidato"),
      numeros: uniq("numero_candidato"),
    };
  }, [rows]);

  const limparFiltros = () =>
    setFiltros({ ano_eleicao: null, turno: null, uf: null, cargo: null, municipio: null, partido: null, candidato: null, numero_candidato: null });

  if (loading) return <PageShell title="TSE"><div className="text-sm text-muted-foreground">Carregando…</div></PageShell>;
  if (!allowed) return <Navigate to="/app" replace />;

  return (
    <PageShell title="Resultados TSE" description="Importação automática dos resultados oficiais do TSE (Dados Abertos).">
      <Tabs defaultValue="importar">
        <TabsList>
          <TabsTrigger value="importar">Importar</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="logs">Logs ({(logs as any[]).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="importar">
          <Card>
            <CardHeader><CardTitle className="text-base">Importação automática (Dados Abertos TSE)</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div>
                <Label className="text-xs">Ano</Label>
                <Input type="number" value={form.ano_eleicao}
                  onChange={(e) => setForm({ ...form, ano_eleicao: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Turno</Label>
                <Select value={String(form.turno)} onValueChange={(v) => setForm({ ...form, turno: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1º turno</SelectItem>
                    <SelectItem value="2">2º turno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">UF</Label>
                <Select value={form.uf} onValueChange={(v) => setForm({ ...form, uf: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Código município (IBGE/TSE)</Label>
                <Input value={form.codigo_municipio} onChange={(e) => setForm({ ...form, codigo_municipio: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Cargo</Label>
                <Input placeholder="Ex: VEREADOR, DEPUTADO FEDERAL" value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Nº Candidato</Label>
                <Input value={form.numero_candidato} onChange={(e) => setForm({ ...form, numero_candidato: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Partido</Label>
                <Input value={form.partido} onChange={(e) => setForm({ ...form, partido: e.target.value })} />
              </div>
              <div className="md:col-span-4">
                <Label className="text-xs">Anos para importação histórica</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {ANOS_DISPONIVEIS.map((a) => {
                    const active = anosHistorico.includes(a);
                    return (
                      <Button
                        key={a}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() => {
                          setAnosHistorico((prev) =>
                            prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a].sort((x, y) => y - x)
                          );
                          // Sincroniza o campo "Ano" com o último chip clicado
                          // para que "Importar ano selecionado" respeite a escolha.
                          if (!active) setForm((f) => ({ ...f, ano_eleicao: a }));
                        }}
                      >
                        {a}
                      </Button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cada ano selecionado roda 1º e 2º turnos ({anosHistorico.length} ano{anosHistorico.length === 1 ? "" : "s"} ={" "}
                  {anosHistorico.length * 2} jobs).
                </p>
              </div>
              <div className="md:col-span-4 flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => importarHistorico.mutate()}
                  disabled={importarHistorico.isPending || !form.uf || anosHistorico.length === 0 || importacaoAtiva}
                  title={importacaoAtiva
                    ? "Aguarde a importação atual concluir antes de iniciar outra"
                    : "Importa os anos selecionados (1º e 2º turnos) para a UF"}
                >
                  <History className="mr-2 h-4 w-4" />
                  {importarHistorico.isPending
                    ? "Iniciando…"
                    : `Importar ${anosHistorico.length} ano${anosHistorico.length === 1 ? "" : "s"}`}
                </Button>
                <Button
                  onClick={() => importar.mutate()}
                  disabled={importar.isPending || importacaoAtiva}
                  title={importacaoAtiva ? "Aguarde a importação atual concluir antes de iniciar outra" : undefined}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {importar.isPending
                    ? "Importando…"
                    : importacaoAtiva
                      ? "Importação em andamento…"
                      : "Importar ano selecionado"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Upload manual (contingência)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                CSV com colunas: ano_eleicao, turno, uf, municipio, codigo_municipio, cargo, candidato,
                numero_candidato, partido, zona_eleitoral, secao_eleitoral, votos.
              </p>
              <input ref={fileRef} type="file" accept=".csv,.txt"
                onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])}
                className="text-sm" />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Enviar CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          <div className="space-y-4 md:space-y-5">
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-3 sm:p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3 md:mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Dashboard de resultados
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                    Visão consolidada dos resultados eleitorais com base nos filtros selecionados.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {rowsFetching && !rowsLoading && (
                    <Badge variant="outline" className="gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Atualizando
                    </Badge>
                  )}
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {(rows as any[]).length} registros
                  </Badge>
                </div>
              </div>
              <FiltrosTSE filtros={filtros} setFiltro={setFiltro} limpar={limparFiltros} opcoes={opcoesFiltros} />
              <div className="mt-3 pt-3 border-t border-border/60">
                <FiltrosChips
                  filtros={filtros}
                  onRemove={(k) => setFiltro(k, null as any)}
                  onClearAll={limparFiltros}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <KPICard icon={Vote} label="Total de votos" accent="primary"
                value={rowsLoading ? <Skeleton className="h-7 w-24" /> : dashboard.totalVotos.toLocaleString("pt-BR")}
                hint={filtros.ano_eleicao ? `Eleição ${filtros.ano_eleicao}` : "Todos os anos"} />
              <KPICard icon={Users} label="Candidatos" accent="accent"
                value={rowsLoading ? <Skeleton className="h-7 w-16" /> : dashboard.qtdCandidatos.toLocaleString("pt-BR")}
                hint={dashboard.topCandidatos[0]?.name ? `Líder: ${dashboard.topCandidatos[0].name}` : "—"} />
              <KPICard icon={BarChart3} label="Partidos" accent="secondary"
                value={rowsLoading ? <Skeleton className="h-7 w-16" /> : dashboard.qtdPartidos.toLocaleString("pt-BR")}
                hint={dashboard.topPartidos[0]?.name ? `Líder: ${dashboard.topPartidos[0].name}` : "—"} />
              <KPICard icon={MapPin} label="Municípios" accent="primary"
                value={rowsLoading ? <Skeleton className="h-7 w-16" /> : dashboard.qtdMunicipios.toLocaleString("pt-BR")}
                hint={filtros.uf ? `UF: ${filtros.uf}` : "Todas as UFs"} />
            </div>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              <ChartFrame
                title="Top 10 candidatos"
                subtitle="Mais votados nos filtros aplicados"
                icon={Users}
                isLoading={rowsLoading}
                isEmpty={dashboard.topCandidatos.length === 0}
                emptyMessage="Nenhum candidato encontrado para os filtros atuais."
                heightClass="h-[280px] sm:h-[340px] md:h-[380px]"
                comparison={{ dimension: "candidato", baseFiltros: filtros }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.topCandidatos} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => Number(v).toLocaleString("pt-BR")} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9 }} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [Number(v).toLocaleString("pt-BR"), "Votos"]}
                    />
                    <Bar dataKey="votos" radius={[0, 6, 6, 0]}>
                      {dashboard.topCandidatos.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>

              <ChartFrame
                title="Votos por partido"
                subtitle="Distribuição percentual entre legendas"
                icon={BarChart3}
                isLoading={rowsLoading}
                isEmpty={dashboard.topPartidos.length === 0}
                emptyMessage="Sem partidos para exibir. Refine os filtros ou importe novos dados."
                heightClass="h-[280px] sm:h-[340px] md:h-[380px]"
                comparison={{ dimension: "partido", baseFiltros: filtros }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboard.topPartidos}
                      dataKey="votos"
                      nameKey="name"
                      innerRadius="45%"
                      outerRadius="75%"
                      paddingAngle={2}
                      label={(e: any) => {
                        const total = dashboard.topPartidos.reduce((s, x) => s + x.votos, 0) || 1;
                        return `${((e.votos / total) * 100).toFixed(1)}%`;
                      }}
                      labelLine={false}
                    >
                      {dashboard.topPartidos.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [Number(v).toLocaleString("pt-BR"), "Votos"]}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>

              <ChartFrame
                title="Top 10 municípios"
                subtitle="Cidades com maior volume de votos"
                icon={MapPin}
                isLoading={rowsLoading}
                isEmpty={dashboard.topMunicipios.length === 0}
                emptyMessage="Nenhum município com votos nos filtros atuais."
                heightClass="h-[300px] sm:h-[340px] md:h-[380px]"
                comparison={{ dimension: "municipio", baseFiltros: filtros }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.topMunicipios} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => Number(v).toLocaleString("pt-BR")} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 9 }} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [Number(v).toLocaleString("pt-BR"), "Votos"]}
                    />
                    <Bar dataKey="votos" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>

              <ChartFrame
                title="Votos por cargo"
                subtitle="Comparativo entre cargos disputados"
                icon={Vote}
                isLoading={rowsLoading}
                isEmpty={dashboard.porCargo.length === 0}
                emptyMessage="Nenhum cargo encontrado. Tente remover o filtro de cargo."
                heightClass="h-[280px] sm:h-[320px] md:h-[360px]"
                comparison={{ dimension: "cargo", baseFiltros: filtros }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.porCargo} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => Number(v).toLocaleString("pt-BR")} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9 }} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [Number(v).toLocaleString("pt-BR"), "Votos"]}
                    />
                    <Bar dataKey="votos" radius={[0, 6, 6, 0]}>
                      {dashboard.porCargo.map((_, i) => (
                        <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {rowsFetching && !rowsLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
              {rowsLoading
                ? "Carregando resultados…"
                : `Análise calculada sobre os ${(rows as any[]).length} registros mais votados retornados pelos filtros (limite 500).`}
            </p>
          </div>
        </TabsContent>
        <TabsContent value="resultados">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Resultados ({(rows as any[]).length})</CardTitle>
              <Badge variant="outline">{resumo.seções} zonas/seções</Badge>
            </CardHeader>
            <CardContent>
              <FiltrosTSE filtros={filtros} setFiltro={setFiltro} limpar={limparFiltros} opcoes={opcoesFiltros} />
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ano</TableHead><TableHead>UF</TableHead><TableHead>Município</TableHead>
                      <TableHead>Cargo</TableHead><TableHead>Candidato</TableHead><TableHead>Partido</TableHead>
                      <TableHead>Zona</TableHead><TableHead>Seção</TableHead><TableHead className="text-right">Votos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rows as any[]).length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                        Sem resultados.
                      </TableCell></TableRow>
                    ) : (rows as any[]).slice(0, 200).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.ano_eleicao}</TableCell>
                        <TableCell>{r.uf}</TableCell>
                        <TableCell className="text-xs">{r.municipio}</TableCell>
                        <TableCell className="text-xs">{r.cargo}</TableCell>
                        <TableCell className="text-xs">{r.candidato}</TableCell>
                        <TableCell>{r.partido}</TableCell>
                        <TableCell>{r.zona_eleitoral}</TableCell>
                        <TableCell>{r.secao_eleitoral ?? "—"}</TableCell>
                        <TableCell className="text-right font-medium">{r.votos.toLocaleString("pt-BR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          {stuckLogs.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {stuckLogs.length === 1
                  ? "1 importação parece travada"
                  : `${stuckLogs.length} importações parecem travadas`}
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-sm">
                  Sem progresso há mais de {STUCK_THRESHOLD_SEC}s. O worker pode ter sido encerrado por falta de memória.
                  Você pode marcar como erro ou tentar novamente.
                </p>
                <div className="space-y-2">
                  {stuckLogs.map((l) => (
                    <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-destructive/40 bg-destructive/5 px-3 py-2">
                      <div className="text-xs">
                        <span className="font-medium">{l.uf} {l.ano_eleicao}/{l.turno}</span>
                        {" • "}
                        <span className="text-muted-foreground">
                          iniciada {Math.round((Date.now() - new Date(l.created_at).getTime()) / 1000)}s atrás
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={marcarErro.isPending}
                          onClick={() => marcarErro.mutate(l.id)}
                        >
                          Marcar como erro
                        </Button>
                        <Button
                          size="sm"
                          disabled={marcarErro.isPending}
                          onClick={() => tentarNovamente(l)}
                        >
                          <RefreshCw className="mr-1 h-3.5 w-3.5" />
                          Tentar novamente
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Logs de importação</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchLogs()}
                  disabled={logsFetching}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${logsFetching ? "animate-spin" : ""}`} />
                  {logsFetching ? "Atualizando…" : "Atualizar"}
                </Button>
                <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm("Remover TODOS os logs de importação do TSE? Os resultados importados não serão afetados.")) {
                    limparLogs.mutate();
                  }
                }}
                disabled={limparLogs.isPending || (logs as any[]).length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {limparLogs.isPending ? "Limpando…" : "Limpar logs"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead><TableHead>Ano/Turno</TableHead><TableHead>UF</TableHead>
                    <TableHead>Cargo</TableHead><TableHead>Arquivo</TableHead><TableHead>Status</TableHead>
                    <TableHead className="min-w-[220px]">Progresso</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead className="w-[110px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs as any[]).length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                      Sem importações registradas.
                    </TableCell></TableRow>
                  ) : (logs as any[]).map((l) => {
                    const ativo = l.status === "iniciado" || l.status === "processando";
                    const prog = (l.detalhes && (l.detalhes as any).progresso) || {};
                    const linhas = prog.linhas_processadas ?? l.total_registros ?? 0;
                    const lotes = prog.lotes_concluidos ?? l.registros_atualizados ?? 0;
                    const lotesErro = prog.lotes_com_erro ?? 0;
                    const bytes = prog.bytes_baixados ?? 0;
                    const importados = l.registros_novos ?? 0;
                    // Sem total exato; estimamos pct pelo importado/processado
                    const pct = ativo
                      ? (linhas > 0 ? Math.min(95, Math.floor((importados / Math.max(linhas, 1)) * 100)) : 5)
                      : (l.status === "concluído" || l.status === "concluído com erros" ? 100 : 0);
                    const cancelando = (l as any).cancel_requested && ativo;
                    return (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{l.ano_eleicao}/{l.turno}</TableCell>
                      <TableCell>{l.uf}</TableCell>
                      <TableCell className="text-xs">{l.cargo ?? "—"}</TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]">{l.arquivo}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === "concluído" ? "default" : l.status === "erro" ? "destructive" : "secondary"}>
                          {ativo ? (
                            <span className="flex items-center gap-1">
                              <RefreshCw className="h-3 w-3 animate-spin" /> {cancelando ? "cancelando" : l.status}
                            </span>
                          ) : l.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(ativo || pct > 0) && (
                          <div className="space-y-1">
                            <Progress value={pct} className="h-2" />
                            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>{linhas.toLocaleString("pt-BR")} linhas</span>
                              <span>{lotes} lotes</span>
                              {lotesErro > 0 && (
                                <span className="text-destructive">{lotesErro} c/ erro</span>
                              )}
                              {bytes > 0 && (
                                <span>{(bytes / 1024 / 1024).toFixed(1)} MB</span>
                              )}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{l.registros_novos}/{l.total_registros}</TableCell>
                      <TableCell className="text-right">
                        {ativo && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={cancelando || cancelarImport.isPending}
                            onClick={() => {
                              if (confirm("Cancelar esta importação? Os lotes já gravados serão mantidos.")) {
                                cancelarImport.mutate(l.id);
                              }
                            }}
                          >
                            <StopCircle className="mr-1 h-3.5 w-3.5" />
                            {cancelando ? "Cancelando…" : "Cancelar"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
