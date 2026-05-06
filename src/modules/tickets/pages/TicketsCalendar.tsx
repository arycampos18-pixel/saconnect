import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useTicketsTenant } from "../hooks/useTicketsTenant";
import { ticketsService } from "../services/ticketsService";
import { EventFormDialog } from "../components/EventFormDialog";
import type { TicketEvent } from "../types";

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

export default function TicketsCalendar() {
  const { companyId } = useTicketsTenant();
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TicketEvent | null>(null);

  const { data: events } = useQuery({ queryKey: ["events_all", companyId], queryFn: () => ticketsService.listEvents(companyId!), enabled: !!companyId });

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d) });
    while (cells.length % 7) cells.push({ date: null });
    return cells;
  }, [cursor]);

  if (!companyId) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Selecione uma empresa.</CardContent></Card>;

  const eventsByDay = new Map<string, TicketEvent[]>();
  for (const e of events ?? []) {
    const k = new Date(e.start_datetime).toDateString();
    const arr = eventsByDay.get(k) ?? [];
    arr.push(e); eventsByDay.set(k, arr);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setCursor(addMonths(cursor, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <CardTitle className="text-lg">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</CardTitle>
          <Button size="icon" variant="outline" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Novo evento</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground">
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => <div key={d} className="px-2 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((c, i) => (
            <div key={i} className="min-h-[90px] rounded-md border p-1 text-xs">
              {c.date && (
                <>
                  <div className="mb-1 text-muted-foreground">{c.date.getDate()}</div>
                  <div className="space-y-1">
                    {(eventsByDay.get(c.date.toDateString()) ?? []).map(ev => (
                      <button key={ev.id} onClick={() => { setEditing(ev); setOpen(true); }}
                        className="block w-full truncate rounded bg-primary/10 px-1.5 py-0.5 text-left text-[11px] text-primary hover:bg-primary/20">
                        {new Date(ev.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {ev.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {editing?.ticket_id && (
          <div className="mt-3 text-xs">
            <Link to={`/app/tickets/view/${editing.ticket_id}`} className="text-primary hover:underline">Ver chamado vinculado →</Link>
          </div>
        )}
      </CardContent>
      <EventFormDialog open={open} onOpenChange={setOpen} companyId={companyId} initial={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["events_all", companyId] })} />
    </Card>
  );
}
