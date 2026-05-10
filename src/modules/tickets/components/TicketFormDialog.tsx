import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { ticketsService } from "../services/ticketsService";
import { toast } from "sonner";
import { DropdownComNovoCadastro } from "@/shared/components/forms/DropdownComNovoCadastro";

export function TicketFormDialog({
  open, onOpenChange, companyId, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; companyId: string; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium", status: "open",
    requester_name: "", requester_email: "", requester_phone: "",
    queue_id: "", category_id: "", sla_hours: "24",
  });

  useEffect(() => {
    if (!open) setForm({ title: "", description: "", priority: "medium", status: "open",
      requester_name: "", requester_email: "", requester_phone: "",
      queue_id: "", category_id: "", sla_hours: "24" });
  }, [open]);

  const { data: queues } = useQuery({ queryKey: ["t_queues", companyId], queryFn: () => ticketsService.listQueues(companyId), enabled: open });
  const { data: cats, refetch: refetchCats } = useQuery({ queryKey: ["t_cats", companyId], queryFn: () => ticketsService.listCategories(companyId), enabled: open });

  async function handleSave() {
    if (!form.title.trim()) return toast.error("Informe um título");
    try {
      const sla = form.sla_hours ? new Date(Date.now() + Number(form.sla_hours) * 3600_000).toISOString() : null;
      await ticketsService.create(companyId, {
        title: form.title, description: form.description || null,
        priority: form.priority as any, status: form.status as any,
        requester_name: form.requester_name || null, requester_email: form.requester_email || null, requester_phone: form.requester_phone || null,
        queue_id: form.queue_id || null, category_id: form.category_id || null,
        sla_due_at: sla,
      });
      toast.success("Chamado criado");
      onOpenChange(false); onCreated();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Novo Chamado</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>SLA (horas)</Label><Input type="number" value={form.sla_hours} onChange={e => setForm({ ...form, sla_hours: e.target.value })} /></div>
            <div>
              <Label>Fila</Label>
              <Select value={form.queue_id || "_none"} onValueChange={v => setForm({ ...form, queue_id: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {queues?.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <DropdownComNovoCadastro
                campo="categorias"
                label="categoria"
                opcoes={(cats ?? []).map((c: any) => ({ id: c.id, nome: c.name }))}
                value={form.category_id || null}
                onChange={(v) => setForm({ ...form, category_id: v ?? "" })}
                emptyOptionLabel="—"
                placeholder="—"
                onCreated={(item) => { setForm((f) => ({ ...f, category_id: item.id })); refetchCats(); }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Solicitante</Label><Input value={form.requester_name} onChange={e => setForm({ ...form, requester_name: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input value={form.requester_email} onChange={e => setForm({ ...form, requester_email: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.requester_phone} onChange={e => setForm({ ...form, requester_phone: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
