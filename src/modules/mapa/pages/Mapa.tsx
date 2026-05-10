import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LTooltip, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { mapaService, type BairroAgregado } from "../services/mapaService";
import { catalogosService, type Lideranca, type Tag } from "@/modules/eleitores/services/catalogosService";

// Centro padrão: Brasil
const CENTRO_BR: [number, number] = [-15.78, -47.93];

export default function Mapa() {
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [progresso, setProgresso] = useState({ done: 0, total: 0 });
  const [bairros, setBairros] = useState<BairroAgregado[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [cidade, setCidade] = useState("todas");
  const [tagId, setTagId] = useState("todas");
  const [liderancaId, setLiderancaId] = useState("todas");

  async function carregar() {
    setLoading(true);
    try {
      const dados = await mapaService.agregarPorBairro({ cidade, tagId, liderancaId });
      setBairros(dados);
      // Geocode in background
      setGeocoding(true);
      setProgresso({ done: 0, total: dados.length });
      const comCoords = await mapaService.geocodificar(dados, (done, total) =>
        setProgresso({ done, total })
      );
      setBairros(comCoords);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar mapa.");
    } finally {
      setLoading(false);
      setGeocoding(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const [c, l, t] = await Promise.all([
          mapaService.cidadesDisponiveis(),
          catalogosService.liderancas(),
          catalogosService.tags(),
        ]);
        setCidades(c);
        setLiderancas(l);
        setTags(t);
      } catch (e: any) {
        toast.error(e.message ?? "Erro ao carregar filtros.");
      }
    })();
  }, []);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidade, tagId, liderancaId]);

  const totalGeral = useMemo(() => bairros.reduce((s, b) => s + b.total, 0), [bairros]);
  const maxTotal = useMemo(() => bairros.reduce((m, b) => Math.max(m, b.total), 1), [bairros]);
  const comCoords = bairros.filter((b) => b.lat != null && b.lng != null);
  const semCoords = bairros.length - comCoords.length;

  const center: [number, number] = comCoords.length
    ? [comCoords[0].lat!, comCoords[0].lng!]
    : CENTRO_BR;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <MapPin className="h-7 w-7 text-primary" /> Mapa Eleitoral
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Distribuição dos eleitores por bairro (OpenStreetMap).
          </p>
        </div>
        <Button variant="outline" onClick={carregar} disabled={loading || geocoding}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading || geocoding ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cidade</label>
          <Select value={cidade} onValueChange={setCidade}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="z-[1000]">
              <SelectItem value="todas">Todas</SelectItem>
              {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Liderança</label>
          <Select value={liderancaId} onValueChange={setLiderancaId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="z-[1000]">
              <SelectItem value="todas">Todas</SelectItem>
              {liderancas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tag</label>
          <Select value={tagId} onValueChange={setTagId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="z-[1000]">
              <SelectItem value="todas">Todas</SelectItem>
              {tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <p className="text-sm text-muted-foreground">Bairros</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{bairros.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <p className="text-sm text-muted-foreground">Eleitores mapeados</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{totalGeral}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <p className="text-sm text-muted-foreground">Sem coordenadas</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{semCoords}</p>
        </div>
      </div>

      {geocoding && (
        <div className="flex items-center gap-2 rounded-md border bg-accent/30 px-3 py-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Geolocalizando bairros: {progresso.done}/{progresso.total}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elegant-sm">
        <div className="h-[520px] w-full">
          <MapContainer
            center={center}
            zoom={comCoords.length ? 12 : 4}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {comCoords.map((b) => {
              const radius = 10 + (b.total / maxTotal) * 30;
              return (
                <CircleMarker
                  key={`${b.bairro}-${b.cidade}`}
                  center={[b.lat!, b.lng!]}
                  radius={radius}
                  pathOptions={{
                    color: "hsl(217 91% 35%)",
                    fillColor: "hsl(217 91% 50%)",
                    fillOpacity: 0.55,
                    weight: 1,
                  }}
                >
                  <LTooltip direction="top" offset={[0, -6]} opacity={1}>
                    <strong>{b.bairro}</strong> — {b.total} eleitor(es)
                  </LTooltip>
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">{b.bairro}</p>
                      <p className="text-muted-foreground">
                        {[b.cidade, b.uf].filter(Boolean).join(" / ")}
                      </p>
                      <p>Total: <strong>{b.total}</strong></p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {bairros.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <h3 className="mb-3 font-semibold text-foreground">Top bairros</h3>
          <div className="flex flex-wrap gap-2">
            {bairros.slice(0, 12).map((b) => (
              <Badge key={`${b.bairro}-${b.cidade}`} variant="outline" className="text-xs">
                {b.bairro} · <span className="ml-1 font-bold text-primary">{b.total}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}