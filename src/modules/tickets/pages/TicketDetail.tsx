import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ticketsService } from "../services/ticketsService";
import { googleCalendarService } from "../services/googleCalendarService";
import { useTicketsTenant } from "../hooks/useTicketsTenant";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { SlaIndicator } from "../components/SlaIndicator";
import { EventFormDialog } from "../components/EventFormDialog";
import { TICKET_EVENTS } from "../types";

export default function TicketDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { companyId, hasPermission } = useTicketsTenant();
  const [msg, setMsg] = useState("");
  const [internal, setInternal] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  const { data: ticket } = useQuery({ queryKey: ["ticket", id], queryFn: () => ticketsService.get(id) });
  const { data: messages } = useQuery({ queryKey: ["ticket_msgs", id], queryFn: () => ticketsService.listMessages(id) });
  const { data: events } = useQuery({ queryKey: ["ticket_events", id], queryFn: () => ticketsService.listEventsByTicket(id) });

  if (!ticket) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Chamado não encontrado.</CardContent></Card>;
  if (!companyId) return null;

  async function send() {
    if (!msg.trim()) return;
    await ticketsService.addMessage(companyId!, { ticket_id: id, content: msg, sender_type: "agent", is_internal_note: internal });
    setMsg("");
    qc.invalidateQueries({ queryKey: ["ticket_msgs", id] });
  }

  async function changeStatus(status: string) {
    await ticketsService.update(id, { status: status as any });
    qc.invalidateQueries({ queryKey: ["ticket", id] });
    await ticketsService.addMessage(companyId!, { ticket_id: id, sender_type: "system", content: `Status alterado para ${status}` });
    qc.invalidateQueries({ queryKey: ["ticket_msgs", id] });
    window.dispatchEvent(new CustomEvent(TICKET_EVENTS.STATUS_CHANGED, { detail: { id, status } }));
    // Sincroniza eventos vinculados com Google Calendar conforme novo status
    if (status === "resolved" || status === "closed" || status === "cancelled") {
      const evs = events ?? [];
      for (const ev of evs) {
        if (ev.status !== "cancelled") {
          await ticketsService.updateEvent(ev.id, { status: status === "resolved" ? "done" : "cancelled" });
          googleCalendarService.syncEvent(ev.id, status === "resolved" ? "upsert" : "delete");
        }
      }
      qc.invalidateQueries({ queryKey: ["ticket_events", id] });
    }
  }

  async function removeTicket() {
    if (!hasPermission("tickets.delete") && !confirm("Excluir este chamado?")) return;
    await ticketsService.remove(id);
    toast.success("Chamado excluído");
    history.back();
  }

  type TimelineItem = { kind: "msg" | "event"; at: string; data: any };
  const timeline: TimelineItem[] = [
    ...(messages ?? []).map(m => ({ kind: "msg" as const, at: m.created_at, data: m })),
    ...(events ?? []).map(e => ({ kind: "event" as const, at: e.created_at, data: e })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <Link to="/app/tickets/list" className="inline-flex items-center text-xs text-muted-foreground hover:underline">
                <ArrowLeft className="mr-1 h-3 w-3" /> Voltar
              </Link>
              <CardTitle className="text-xl">#{ticket.ticket_number} • {ticket.title}</CardTitle>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge value={ticket.status} />
                <PriorityBadge value={ticket.priority} />
                <SlaIndicator dueAt={ticket.sla_due_at} />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={removeTicket}><Trash2 className="h-4 w-4" /></Button>
          </CardHeader>
          {ticket.description && <CardContent className="text-sm">{ticket.description}</CardContent>}
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {timeline.length === 0 && <div className="text-sm text-muted-foreground">Sem interações ainda.</div>}
            {timeline.map((it, i) => it.kind === "msg" ? (
              <div key={i} className={"rounded-md border p-2 text-sm " + (it.data.is_internal_note ? "bg-amber-50 dark:bg-amber-950/30" : "")}>
                <div className="text-xs text-muted-foreground">{it.data.sender_type ?? "—"} • {new Date(it.at).toLocaleString()}{it.data.is_internal_note ? " • nota interna" : ""}</div>
                <div className="whitespace-pre-wrap">{it.data.content}</div>
              </div>
            ) : (
              <div key={i} className="rounded-md border border-primary/40 bg-primary/5 p-2 text-sm">
                <div className="text-xs text-primary">📅 Agendamento • {new Date(it.at).toLocaleString()}</div>
                <div className="font-medium">{it.data.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(it.data.start_datetime).toLocaleString()} → {new Date(it.data.end_datetime).toLocaleString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Responder</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Digite sua mensagem..." />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={internal} onCheckedChange={setInternal} id="internal" />
                <Label htmlFor="internal" className="text-sm">Nota interna</Label>
              </div>
              <Button onClick={send}>Enviar</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Solicitante</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>{ticket.requester_name ?? "—"}</div>
            <div className="text-muted-foreground">{ticket.requester_email ?? "—"}</div>
            <div className="text-muted-foreground">{ticket.requester_phone ?? "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Atendimento</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <Label>Status</Label>
              <Select value={ticket.status} onValueChange={changeStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Agendamento</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setEventOpen(true)}><CalendarPlus className="mr-2 h-4 w-4" />Novo</Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(events ?? []).length === 0 && <div className="text-muted-foreground">Nenhum agendamento vinculado.</div>}
            {(events ?? []).map(e => (
              <div key={e.id} className="rounded-md border p-2">
                <div className="font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.start_datetime).toLocaleString()} → {new Date(e.end_datetime).toLocaleString()}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <EventFormDialog open={eventOpen} onOpenChange={setEventOpen} companyId={companyId} ticketId={id}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["ticket_events", id] });
          window.dispatchEvent(new CustomEvent(TICKET_EVENTS.EVENT_SCHEDULED, { detail: { ticketId: id } }));
        }} />
    </div>
  );
}
