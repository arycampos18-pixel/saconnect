import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Pause, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { disparosService, type Disparo, type DisparoDestinatario } from "../services/disparosService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const destStatusColor: Record<string, string> = {
  pendente: "bg-muted",
  enviando: "bg-amber-500/10 text-amber-700",
  enviado: "bg-green-500/10 text-green-700",
  falhou: "bg-destructive/10 text-destructive",
  optout: "bg-orange-500/10 text-orange-700",
  ignorado: "bg-muted text-muted-foreground",
};

export default function DisparoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Disparo | null>(null);
  const [dest, setDest] = useState<DisparoDestinatario[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);

  const recarregar = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [disp, des] = await Promise.all([
        disparosService.obter(id),
        disparosService.destinatarios(id, filtro),
      ]);
      setD(disp); setDest(des);
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { recarregar(); }, [id, filtro]);

  // auto-refresh enquanto processando
  useEffect(() => {
    if (d?.status !== "processando") return;
    const i = setInterval(recarregar, 5000);
    return () => clearInterval(i);
  }, [d?.status]);

  const iniciar = async () => {
    try { await disparosService.iniciar(id!); toast.success("Disparo em execução"); recarregar(); }
    catch (e: any) { toast.error("Erro", { description: e.message }); }
  };
  const pausar = async () => { await disparosService.pausar(id!); toast.success("Pausado"); recarregar(); };
  const cancelar = async () => { if (!confirm("Cancelar disparo?")) return; await disparosService.cancelar(id!); toast.success("Cancelado"); recarregar(); };

  if (!d) return <div className="p-6"><p className="text-sm text-muted-foreground">{loading ? "Carregando..." : "Disparo não encontrado"}</p></div>;

  const pct = d.total > 0 ? Math.round(((d.enviados + d.falhas) / d.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost"><Link to="/app/disparos"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{d.nome}</h1>
          <p className="text-xs text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
        </div>
        <Badge>{d.status}</Badge>
        <Button size="sm" variant="ghost" onClick={recarregar}><RefreshCw className="h-4 w-4" /></Button>
        {(d.status === "rascunho" || d.status === "agendado" || d.status === "pausado") && (
          <Button size="sm" onClick={iniciar}><Play className="mr-1 h-4 w-4" /> Iniciar</Button>
        )}
        {d.status === "processando" && (
          <Button size="sm" variant="secondary" onClick={pausar}><Pause className="mr-1 h-4 w-4" /> Pausar</Button>
        )}
        {d.status !== "concluido" && d.status !== "cancelado" && (
          <Button size="sm" variant="destructive" onClick={cancelar}><X className="mr-1 h-4 w-4" /> Cancelar</Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <KPI label="Total" v={d.total} />
        <KPI label="Enviados" v={d.enviados} cor="text-green-600" />
        <KPI label="Falhas" v={d.falhas} cor="text-destructive" />
        <KPI label="Opt-out" v={d.optouts} cor="text-orange-600" />
        <KPI label="Progresso" v={`${pct}%`} cor="text-primary" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Mensagem</CardTitle></CardHeader>
        <CardContent><p className="whitespace-pre-wrap rounded bg-muted p-3 text-sm">{d.template}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Destinatários</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={filtro} onValueChange={setFiltro}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
              <TabsTrigger value="enviado">Enviados</TabsTrigger>
              <TabsTrigger value="falhou">Falhas</TabsTrigger>
              <TabsTrigger value="optout">Opt-out</TabsTrigger>
              <TabsTrigger value="ignorado">Ignorados</TabsTrigger>
            </TabsList>
            <TabsContent value={filtro} className="mt-3">
              {dest.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum destinatário neste filtro.</p>
              ) : (
                <div className="max-h-[480px] overflow-y-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="text-left">
                        <th className="p-2">Nome</th>
                        <th className="p-2">Telefone</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Enviado em</th>
                        <th className="p-2">Erro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dest.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="p-2">{r.nome ?? "—"}</td>
                          <td className="p-2">{r.telefone}</td>
                          <td className="p-2"><Badge className={destStatusColor[r.status]}>{r.status}</Badge></td>
                          <td className="p-2 text-xs text-muted-foreground">{r.enviado_em ? format(new Date(r.enviado_em), "dd/MM HH:mm:ss") : "—"}</td>
                          <td className="p-2 text-xs text-destructive">{r.erro ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, v, cor }: { label: string; v: any; cor?: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${cor ?? ""}`}>{v}</p>
    </CardContent></Card>
  );
}