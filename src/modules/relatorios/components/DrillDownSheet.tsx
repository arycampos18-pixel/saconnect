import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Search, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { drillService, type DrillDimensao, type DrillRow } from "../services/relatoriosService";
import { toast } from "sonner";

const LABELS: Record<DrillDimensao, string> = {
  bairro: "Eleitores do bairro",
  cidade: "Eleitores da cidade",
  genero: "Eleitores por gênero",
  origem: "Eleitores por origem",
  lideranca: "Eleitores da liderança",
  tag: "Eleitores com a tag",
  evento_status: "Eventos com status",
  evento_tipo: "Eventos do tipo",
  pesquisa_status: "Pesquisas com status",
  comunicacao_canal: "Mensagens pelo canal",
};

export type DrillTarget = { dimensao: DrillDimensao; valor: string } | null;

export function DrillDownSheet({
  target,
  onClose,
}: {
  target: DrillTarget;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<DrillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();

  useEffect(() => {
    if (!target) return;
    setLoading(true);
    setRows([]);
    setSearch("");
    setFrom(undefined);
    setTo(undefined);
    drillService
      .buscar(target.dimensao, target.valor)
      .then(setRows)
      .catch((e) => toast.error(e.message ?? "Erro ao buscar registros."))
      .finally(() => setLoading(false));
  }, [target]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const fromTs = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime() : null;
    const toTs = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime() : null;
    return rows.filter((r) => {
      if (s) {
        const hay = `${r.titulo} ${r.subtitulo ?? ""} ${r.meta ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (fromTs !== null || toTs !== null) {
        if (!r.data) return false;
        const ts = new Date(r.data).getTime();
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
      }
      return true;
    });
  }, [rows, search, from, to]);

  const filtrosAtivos = !!(search || from || to);

  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {target && (
          <>
            <SheetHeader>
              <SheetTitle>{LABELS[target.dimensao]}</SheetTitle>
              <SheetDescription>
                <span className="font-semibold text-foreground">{target.valor}</span>
                {!loading && (
                  <>
                    {" · "}
                    {filtrosAtivos
                      ? `${filtered.length} de ${rows.length} registro(s)`
                      : `${rows.length} registro(s)`}
                  </>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-3 rounded-md border bg-muted/30 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone, local..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DateField label="De" value={from} onChange={setFrom} />
                <DateField label="Até" value={to} onChange={setTo} />
              </div>
              {filtrosAtivos && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs"
                  onClick={() => { setSearch(""); setFrom(undefined); setTo(undefined); }}
                >
                  <X className="mr-1 h-3 w-3" /> Limpar filtros
                </Button>
              )}
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {rows.length === 0 ? "Nenhum registro encontrado." : "Nenhum registro corresponde aos filtros."}
                </p>
              ) : (
                <ul className="divide-y">
                  {filtered.map((r) => (
                    <li key={r.id} className="py-3">
                      <p className="font-medium text-foreground">{r.titulo}</p>
                      {r.subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{r.subtitulo}</p>}
                      {r.meta && <p className="mt-0.5 text-[11px] text-muted-foreground">{r.meta}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DateField({
  label, value, onChange,
}: { label: string; value?: Date; onChange: (d: Date | undefined) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-9 justify-start font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {value ? format(value, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}