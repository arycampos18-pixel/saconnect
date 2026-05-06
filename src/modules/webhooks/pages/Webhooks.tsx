import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Webhook, Plus, Trash2, Send, ChevronRight, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import { webhooksService, EVENTOS_DISPONIVEIS, type WebhookSaida } from "../services/webhooksService";

export default function Webhooks() {
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();
  const { data: hooks } = useQuery({ queryKey: ["webhooks"], queryFn: () => webhooksService.listar() });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<WebhookSaida> | null>(null);
  const [verEntregas, setVerEntregas] = useState<WebhookSaida | null>(null);

  function novo() {
    setEdit({ nome: "", url: "", eventos: [], ativo: true, secret: "" });
    setOpen(true);
  }

  async function salvar() {
    if (!edit?.nome || !edit?.url) { toast.error("Preencha nome e URL"); return; }
    try {
      if (edit.id) {
        await webhooksService.atualizar(edit.id, edit);
      } else {
        await webhooksService.criar({
          nome: edit.nome!, url: edit.url!,
          eventos: edit.eventos ?? [], ativo: edit.ativo ?? true,
          secret: edit.secret ?? null,
        });
      }
      toast.success("Webhook salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function remover(id: string) {
    if (!confirm("Excluir este webhook?")) return;
    await webhooksService.remover(id);
    qc.invalidateQueries({ queryKey: ["webhooks"] });
  }

  async function testar(h: WebhookSaida) {
    const r = await webhooksService.testar(h.id, h.url, h.eventos[0] ?? "teste");
    if (r?.entregues > 0) toast.success("Webhook testado com sucesso");
    else toast.error("Falha ao entregar — veja o histórico");
  }

  if (!isAdmin) {
    return <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
      Apenas administradores podem gerenciar webhooks.
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <Webhook className="h-7 w-7 text-primary" /> Webhooks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Envie eventos do sistema para URLs externas (Make, Zapier, n8n, sistema próprio…).</p>
        </div>
        <Button onClick={novo}><Plus className="mr-2 h-4 w-4" /> Novo webhook</Button>
      </div>

      {(hooks ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
          Nenhum webhook configurado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {hooks!.map((h) => (
            <Card key={h.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{h.nome}</p>
                    {h.ativo
                      ? <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                      : <Badge variant="outline">Inativo</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{h.url}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {h.eventos.map((e) => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {h.total_disparos} disparos · último: {h.ultimo_disparo_em ? new Date(h.ultimo_disparo_em).toLocaleString("pt-BR") : "nunca"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => testar(h)}><Send className="mr-2 h-4 w-4" /> Testar</Button>
                  <Button size="sm" variant="outline" onClick={() => setVerEntregas(h)}><ChevronRight className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEdit(h); setOpen(true); }}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => remover(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar webhook" : "Novo webhook"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={edit?.nome ?? ""} onChange={(e) => setEdit({ ...edit!, nome: e.target.value })} /></div>
            <div><Label>URL de destino</Label><Input placeholder="https://" value={edit?.url ?? ""} onChange={(e) => setEdit({ ...edit!, url: e.target.value })} /></div>
            <div><Label>Secret (opcional, para HMAC SHA-256)</Label>
              <Input value={edit?.secret ?? ""} onChange={(e) => setEdit({ ...edit!, secret: e.target.value })} placeholder="Assina o body em X-Signature-256" />
            </div>
            <div>
              <Label>Eventos</Label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {EVENTOS_DISPONIVEIS.map((ev) => {
                  const checked = (edit?.eventos ?? []).includes(ev.id);
                  return (
                    <label key={ev.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                      <Checkbox checked={checked} onCheckedChange={(v) => {
                        const list = new Set(edit?.eventos ?? []);
                        if (v) list.add(ev.id); else list.delete(ev.id);
                        setEdit({ ...edit!, eventos: Array.from(list) });
                      }} />
                      <span>{ev.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={!!edit?.ativo} onCheckedChange={(v) => setEdit({ ...edit!, ativo: v })} />
              <span className="text-sm">Ativo</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!verEntregas} onOpenChange={(o) => !o && setVerEntregas(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Histórico — {verEntregas?.nome}</DialogTitle></DialogHeader>
          <Entregas webhook={verEntregas} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Entregas({ webhook }: { webhook: WebhookSaida | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["webhook_entregas", webhook?.id],
    queryFn: () => webhook ? webhooksService.listarEntregas(webhook.id) : Promise.resolve([]),
    enabled: !!webhook,
  });
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!data?.length) return <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma entrega registrada ainda.</p>;
  return (
    <div className="max-h-96 space-y-2 overflow-y-auto">
      {data.map((e: any) => (
        <div key={e.id} className="flex items-start gap-3 rounded border p-3 text-xs">
          {e.sucesso ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{e.evento} · {e.status_code ?? "—"}</p>
            <p className="text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</p>
            {e.erro && <p className="text-destructive">{e.erro}</p>}
            {e.resposta && <p className="mt-1 truncate text-muted-foreground">{e.resposta}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}