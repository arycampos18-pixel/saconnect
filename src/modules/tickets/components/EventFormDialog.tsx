import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ticketsService } from "../services/ticketsService";
import { googleCalendarService } from "../services/googleCalendarService";
import type { TicketEvent } from "../types";
import { toast } from "sonner";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventFormDialog({
  open, onOpenChange, companyId, ticketId, initial, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  companyId: string; ticketId?: string | null; initial?: TicketEvent | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "", description: "",
    start_datetime: toLocalInput(new Date()),
    end_datetime: toLocalInput(new Date(Date.now() + 60 * 60_000)),
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title, description: initial.description ?? "",
        start_datetime: toLocalInput(new Date(initial.start_datetime)),
        end_datetime: toLocalInput(new Date(initial.end_datetime)),
      });
    } else {
      setForm({ title: "", description: "",
        start_datetime: toLocalInput(new Date()),
        end_datetime: toLocalInput(new Date(Date.now() + 60 * 60_000)) });
    }
  }, [open, initial]);

  async function save() {
    if (!form.title.trim()) return toast.error("Informe um título");
    try {
      const payload: any = {
        title: form.title, description: form.description || null,
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: new Date(form.end_datetime).toISOString(),
        ticket_id: ticketId ?? null,
      };
      const saved = initial
        ? await ticketsService.updateEvent(initial.id, payload)
        : await ticketsService.createEvent(companyId, payload);
      toast.success("Agendamento salvo");
      onOpenChange(false); onSaved();
      if (saved?.id) googleCalendarService.syncEvent(saved.id, 'upsert');
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar agendamento" : "Novo agendamento"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Início</Label><Input type="datetime-local" value={form.start_datetime} onChange={e => setForm({ ...form, start_datetime: e.target.value })} /></div>
            <div><Label>Fim</Label><Input type="datetime-local" value={form.end_datetime} onChange={e => setForm({ ...form, end_datetime: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
