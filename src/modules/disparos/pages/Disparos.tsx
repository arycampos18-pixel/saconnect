import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone, ShieldOff, ArrowRight, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { disparosService, type Disparo } from "../services/disparosService";
import { NovoDisparoDialog } from "../components/NovoDisparoDialog";

const statusColor: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  agendado: "bg-blue-500/10 text-blue-700",
  processando: "bg-amber-500/10 text-amber-700",
  pausado: "bg-orange-500/10 text-orange-700",
  concluido: "bg-green-500/10 text-green-700",
  cancelado: "bg-red-500/10 text-red-700",
  falhou: "bg-destructive/10 text-destructive",
};

export default function Disparos() {
  const [list, setList] = useState<Disparo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try { setList(await disparosService.listar()); }
    catch (e: any) { toast.error("Erro ao carregar", { description: e.message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Disparos em massa WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Crie disparos com fila controlada, agendamento, opt-out e anti-duplicatas.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/app/disparos/config"><Settings2 className="mr-2 h-4 w-4" /> Configurações</Link></Button>
          <Button asChild variant="outline"><Link to="/app/disparos/optout"><ShieldOff className="mr-2 h-4 w-4" /> Opt-out</Link></Button>
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo disparo</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Últimos 100 disparos.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p>
          : list.length === 0 ? (
            <div className="py-8 text-center">
              <Megaphone className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum disparo ainda.</p>
              <Button className="mt-4" onClick={() => setOpen(true)}>Criar primeiro disparo</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((d) => {
                const pct = d.total > 0 ? Math.round(((d.enviados + d.falhas) / d.total) * 100) : 0;
                return (
                  <Link to={`/app/disparos/${d.id}`} key={d.id} className="block rounded-lg border bg-card p-3 hover:border-primary/40 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{d.nome}</p>
                          <Badge className={statusColor[d.status]}>{d.status}</Badge>
                          {d.agendado_para && <Badge variant="outline">Agendado: {format(new Date(d.agendado_para), "dd/MM HH:mm", { locale: ptBR })}</Badge>}
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{d.template}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right text-xs">
                          <div className="font-semibold text-foreground">{d.enviados}/{d.total}</div>
                          <div className="text-muted-foreground">{d.falhas} falhas · {d.optouts} opt-out</div>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/20 text-xs font-bold text-primary">
                          {pct}%
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <NovoDisparoDialog open={open} onOpenChange={setOpen} onCreated={carregar} />
    </div>
  );
}