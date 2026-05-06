import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, Megaphone, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { campanhasService, type Campanha } from "../services/campanhasService";
import { NovaCampanhaDialog } from "../components/NovaCampanhaDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CANAL_COR: Record<string, string> = {
  WhatsApp: "#10B981",
  SMS: "#3B82F6",
  Email: "#F59E0B",
};

export default function Campanhas() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [metricas, setMetricas] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([campanhasService.listarCampanhas(), campanhasService.metricas()]);
      setCampanhas(c);
      setMetricas(m);
    } catch (e: any) {
      toast.error("Erro ao carregar", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas Segmentadas</h1>
          <p className="text-sm text-muted-foreground">Envie mensagens direcionadas usando seus segmentos.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova campanha</Button>
      </div>

      {metricas && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Campanhas enviadas</p><p className="text-2xl font-bold">{metricas.totalCampanhas}</p></div><Megaphone className="h-5 w-5 text-primary" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total destinatários</p><p className="text-2xl font-bold">{metricas.totalDest}</p></div><Users className="h-5 w-5 text-primary" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Média / campanha</p><p className="text-2xl font-bold">{metricas.mediaPorCampanha}</p></div><BarChart3 className="h-5 w-5 text-primary" /></div></CardContent></Card>
        </div>
      )}

      {metricas?.porCanal?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alcance por canal</CardTitle>
            <CardDescription>Total de destinatários impactados por canal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricas.porCanal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="canal" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {metricas.porCanal.map((d: any, i: number) => <Cell key={i} fill={CANAL_COR[d.canal] ?? "#2563EB"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de campanhas</CardTitle>
          <CardDescription>Últimas 100 campanhas enviadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : campanhas.length === 0 ? (
            <div className="py-8 text-center">
              <Megaphone className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma campanha segmentada ainda.</p>
              <Button className="mt-4" onClick={() => setOpen(true)}>Criar primeira campanha</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {campanhas.map((c) => (
                <div key={c.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{c.nome_campanha ?? "(sem nome)"}</p>
                        <Badge variant="outline" style={{ color: CANAL_COR[c.canal] }}>{c.canal}</Badge>
                        {c.segmento && (
                          <Badge variant="secondary" style={{ borderLeft: `3px solid ${c.segmento.cor}` }}>
                            {c.segmento.nome}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.conteudo}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className="gap-1"><Send className="h-3 w-3" /> {c.total_destinatarios}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NovaCampanhaDialog open={open} onOpenChange={setOpen} onSent={carregar} />
    </div>
  );
}