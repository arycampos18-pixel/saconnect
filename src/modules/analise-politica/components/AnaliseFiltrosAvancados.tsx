import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, X, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { catalogosService } from "@/modules/eleitores/services/catalogosService";
import { analiseService } from "../services/analiseService";

export type AnaliseFiltros = {
  ano_eleicao: number | null;
  lideranca_id: string | null;
  bairro: string | null;
  tag_ids: string[];
  desde: string | null; // ISO yyyy-mm-dd
  ate: string | null;   // ISO yyyy-mm-dd
};

export const FILTROS_VAZIOS: AnaliseFiltros = {
  ano_eleicao: null,
  lideranca_id: null,
  bairro: null,
  tag_ids: [],
  desde: null,
  ate: null,
};

type Props = {
  value: AnaliseFiltros;
  onChange: (v: AnaliseFiltros) => void;
  onApply?: (v: AnaliseFiltros) => void; // chamado ao clicar "Aplicar"
  showEleicao?: boolean;
  className?: string;
};

export function AnaliseFiltrosAvancados({
  value, onChange, onApply, showEleicao = true, className,
}: Props) {
  // estado local p/ aplicar só no botão (evita re-render dos gráficos a cada tecla)
  const [draft, setDraft] = useState<AnaliseFiltros>(value);
  useEffect(() => { setDraft(value); }, [value]);

  const { data: liderancas = [] } = useQuery({
    queryKey: ["af-liderancas"],
    queryFn: () => analiseService.listarLiderancas(),
  });
  const { data: bairros = [] } = useQuery({
    queryKey: ["af-bairros"],
    queryFn: () => catalogosService.bairros(),
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["af-tags"],
    queryFn: () => catalogosService.tags(),
  });
  const { data: anos = [] } = useQuery({
    queryKey: ["af-anos"],
    queryFn: () => analiseService.listarAnosEleicao(),
    enabled: showEleicao,
  });

  const set = <K extends keyof AnaliseFiltros>(k: K, v: AnaliseFiltros[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const aplicar = () => { onChange(draft); onApply?.(draft); };
  const limpar = () => { setDraft(FILTROS_VAZIOS); onChange(FILTROS_VAZIOS); onApply?.(FILTROS_VAZIOS); };

  const ativos = useMemo(() => {
    const xs: string[] = [];
    if (value.ano_eleicao) xs.push(`Eleição ${value.ano_eleicao}`);
    if (value.lideranca_id) {
      const l = (liderancas as any[]).find((x) => x.id === value.lideranca_id);
      if (l) xs.push(`Liderança: ${l.nome}`);
    }
    if (value.bairro) xs.push(`Bairro: ${value.bairro}`);
    if (value.tag_ids.length) {
      const names = (tags as any[]).filter((t) => value.tag_ids.includes(t.id)).map((t) => t.nome);
      xs.push(`Tags: ${names.join(", ") || value.tag_ids.length}`);
    }
    if (value.desde) xs.push(`De ${value.desde}`);
    if (value.ate)   xs.push(`Até ${value.ate}`);
    return xs;
  }, [value, liderancas, tags]);

  const toggleTag = (id: string) =>
    set("tag_ids", draft.tag_ids.includes(id)
      ? draft.tag_ids.filter((x) => x !== id)
      : [...draft.tag_ids, id]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="h-4 w-4" /> Filtros avançados
        </CardTitle>
        {ativos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {ativos.map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
          </div>
        )}
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {showEleicao && (
          <div>
            <Label className="text-xs">Eleição</Label>
            <Select
              value={draft.ano_eleicao ? String(draft.ano_eleicao) : "__all"}
              onValueChange={(v) => set("ano_eleicao", v === "__all" ? null : Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas</SelectItem>
                {(anos as number[]).map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="text-xs">Liderança</Label>
          <Select
            value={draft.lideranca_id ?? "__all"}
            onValueChange={(v) => set("lideranca_id", v === "__all" ? null : v)}
          >
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas</SelectItem>
              {(liderancas as any[]).map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Bairro</Label>
          <Select
            value={draft.bairro ?? "__all"}
            onValueChange={(v) => set("bairro", v === "__all" ? null : v)}
          >
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              {(bairros as string[]).map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tags</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-normal">
                <span className="truncate">
                  {draft.tag_ids.length === 0
                    ? "Todas"
                    : `${draft.tag_ids.length} selecionada(s)`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="max-h-64 space-y-1 overflow-auto">
                {(tags as any[]).length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    Sem tags cadastradas
                  </p>
                )}
                {(tags as any[]).map((t) => {
                  const checked = draft.tag_ids.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                        checked && "bg-muted",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: t.cor || "hsl(var(--primary))" }}
                        />
                        {t.nome}
                      </span>
                      {checked && <span className="text-xs text-primary">✓</span>}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <DatePopover
          label="De"
          value={draft.desde}
          onChange={(v) => set("desde", v)}
        />
        <DatePopover
          label="Até"
          value={draft.ate}
          onChange={(v) => set("ate", v)}
          min={draft.desde ?? undefined}
        />

        <div className="flex items-end justify-end gap-2 sm:col-span-2 lg:col-span-6">
          <Button variant="ghost" size="sm" onClick={limpar}>
            <X className="mr-1 h-4 w-4" /> Limpar
          </Button>
          <Button size="sm" onClick={aplicar}>Aplicar filtros</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DatePopover({
  label, value, onChange, min,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  min?: string;
}) {
  const date = value ? new Date(value + "T00:00:00") : undefined;
  const minDate = min ? new Date(min + "T00:00:00") : undefined;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start font-normal",
              !date && "text-muted-foreground",
            )}
          >
            {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)}
            disabled={(d) => (minDate ? d < minDate : false)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
          {value && (
            <div className="border-t p-2 text-right">
              <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
                Limpar
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}