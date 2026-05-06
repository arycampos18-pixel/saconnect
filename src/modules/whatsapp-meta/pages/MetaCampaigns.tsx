import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { metaService } from "@/modules/whatsapp-meta/services/whatsappMetaService";
import { toast } from "sonner";
import { Pause, Play, Plus, Trash2 } from "lucide-react";

const statusBadge = (s: string) => {
  if (s === "running") return "default";
  if (s === "completed") return "outline";
  if (s === "paused") return "secondary";
  return "secondary";
};

export default function MetaCampaigns() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string>("");
  const { data: sessions = [] } = useQuery({ queryKey: ["meta-sessions"], queryFn: () => metaService.listSessions() });
  const { data: templates = [] } = useQuery({
    queryKey: ["meta-templates", sessionId],
    queryFn: () => metaService.listTemplates(sessionId || undefined),
    enabled: !!sessionId,
  });
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["meta-campaigns", sessionId],
    queryFn: () => metaService.listCampaigns(sessionId || undefined),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", template_id: "",
    cadence_initial_seconds: 600, cadence_final_seconds: 600,
    scheduled_start_at: "",
  });

  const create = async () => {
    if (!sessionId || !form.name || !form.template_id) return toast.error("Preencha sessão, nome e template");
    try {
      await metaService.createCampaign({
        session_id: sessionId,
        template_id: form.template_id,
        name: form.name,
        description: form.description || null,
        cadence_initial_seconds: Number(form.cadence_initial_seconds),
        cadence_final_seconds: Number(form.cadence_final_seconds),
        scheduled_start_at: form.scheduled_start_at || null,
        status: "draft",
      });
      toast.success("Campanha criada");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["meta-campaigns"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const setStatus = async (id: string, status: string) => {
    await metaService.updateCampaign(id, { status, ...(status === "running" ? { started_at: new Date().toISOString() } : {}) });
    qc.invalidateQueries({ queryKey: ["meta-campaigns"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Deletar?")) return;
    await metaService.deleteCampaign(id);
    qc.invalidateQueries({ queryKey: ["meta-campaigns"] });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px]">
          <Label>Sessão</Label>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>{sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button className="ml-auto" onClick={() => setOpen(true)} disabled={!sessionId}>
          <Plus className="mr-2 h-4 w-4" /> Nova campanha
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Enviado</TableHead>
            <TableHead>Entregue</TableHead>
            <TableHead>Lido</TableHead>
            <TableHead>Erro</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={9}>Carregando…</TableCell></TableRow>}
          {!isLoading && campaigns.length === 0 && <TableRow><TableCell colSpan={9} className="text-muted-foreground">Nenhuma campanha.</TableCell></TableRow>}
          {campaigns.map((c) => {
            const pct = c.total_contacts > 0 ? Math.round(((c.sent_count + c.error_count) / c.total_contacts) * 100) : 0;
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell><Badge variant={statusBadge(c.status) as any}>{c.status}</Badge></TableCell>
                <TableCell>{c.total_contacts}</TableCell>
                <TableCell>{c.sent_count}</TableCell>
                <TableCell>{c.delivered_count}</TableCell>
                <TableCell>{c.read_count}</TableCell>
                <TableCell>{c.error_count}</TableCell>
                <TableCell><Progress value={pct} className="w-24" /></TableCell>
                <TableCell className="text-right space-x-1">
                  {c.status !== "running" ? (
                    <Button size="icon" variant="ghost" onClick={() => setStatus(c.id, "running")}><Play className="h-4 w-4" /></Button>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => setStatus(c.id, "paused")}><Pause className="h-4 w-4" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Template</Label>
              <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {templates.filter((t) => t.status === "APPROVED").map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cadência inicial (s)</Label><Input type="number" value={form.cadence_initial_seconds} onChange={(e) => setForm({ ...form, cadence_initial_seconds: Number(e.target.value) })} /></div>
              <div><Label>Cadência final (s)</Label><Input type="number" value={form.cadence_final_seconds} onChange={(e) => setForm({ ...form, cadence_final_seconds: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Início agendado</Label><Input type="datetime-local" value={form.scheduled_start_at} onChange={(e) => setForm({ ...form, scheduled_start_at: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}