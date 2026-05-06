import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, RefreshCw, Eye, Trash2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { webhookRawService, type WebhookRaw } from "../services/webhookRawService";

export default function WebhookLogs() {
  const [filtro, setFiltro] = useState<"todos" | "erro" | "pendente">("todos");
  const [items, setItems] = useState<WebhookRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ pendentes: 0, erros: 0 });
  const [selecionado, setSelecionado] = useState<WebhookRaw | null>(null);
  const [reprocessando, setReprocessando] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [list, c] = await Promise.all([
        webhookRawService.listar(filtro, 200),
        webhookRawService.contarPendentesEErros(),
      ]);
      setItems(list);
      setCounts(c);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [filtro]);

  const reprocessar = async (raw: WebhookRaw) => {
    setReprocessando(raw.id);
    try {
      const r = await webhookRawService.reprocessar(raw);
      if (r.ok) toast.success("Reprocessado com sucesso");
      else toast.error(`Falha: ${r.message}`);
      await carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao reprocessar");
    } finally {
      setReprocessando(null);
    }
  };

  const remover = async (id: string) => {
    if (!confirm("Remover este registro? O payload bruto será perdido.")) return;
    try {
      await webhookRawService.remover(id);
      toast.success("Removido");
      await carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logs do Webhook WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Auditoria de toda mensagem recebida pela Z-API. Nada se perde aqui.
          </p>
        </div>
        <Button variant="outline" onClick={carregar} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <Clock className="h-8 w-8 text-amber-500" />
          <div><div className="text-2xl font-bold">{counts.pendentes}</div>
          <div className="text-xs text-muted-foreground">Não processados</div></div>
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div><div className="text-2xl font-bold">{counts.erros}</div>
          <div className="text-xs text-muted-foreground">Com erro</div></div>
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <div><div className="text-2xl font-bold">{items.length}</div>
          <div className="text-xs text-muted-foreground">Listados</div></div>
        </CardContent></Card>
      </div>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as any)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="pendente">Não processados</TabsTrigger>
          <TabsTrigger value="erro">Com erro</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>Eventos recentes</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Nenhum registro encontrado.</p>
          ) : (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3 border rounded-lg p-3 hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {it.processado
                          ? <Badge variant="secondary">Processado</Badge>
                          : <Badge variant="outline">Pendente</Badge>}
                        {it.erro && <Badge variant="destructive">Erro</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(it.created_at).toLocaleString("pt-BR")}
                        </span>
                        {it.evento && <span className="text-xs font-mono">{it.evento}</span>}
                      </div>
                      <div className="text-sm mt-1 truncate">
                        <span className="text-muted-foreground">phone:</span>{" "}
                        <span className="font-mono">{it.payload?.phone ?? it.payload?.from ?? "—"}</span>
                        {it.provedor_message_id && (
                          <> · <span className="text-muted-foreground">msgId:</span>{" "}
                            <span className="font-mono text-xs">{it.provedor_message_id.slice(0, 24)}…</span></>
                        )}
                      </div>
                      {it.erro && <div className="text-xs text-destructive mt-1 truncate">{it.erro}</div>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setSelecionado(it)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => reprocessar(it)} disabled={reprocessando === it.id}>
                        {reprocessando === it.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <RefreshCw className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remover(it.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selecionado} onOpenChange={(o) => !o && setSelecionado(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Payload bruto</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh]">
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
              {selecionado ? JSON.stringify(selecionado.payload, null, 2) : ""}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
