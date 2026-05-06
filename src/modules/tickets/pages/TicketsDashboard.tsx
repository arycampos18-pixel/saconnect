import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTicketsTenant } from "../hooks/useTicketsTenant";
import { ticketsService } from "../services/ticketsService";
import { Link } from "react-router-dom";

export default function TicketsDashboard() {
  const { companyId } = useTicketsTenant();
  const { data: tickets } = useQuery({ queryKey: ["tickets_all", companyId], queryFn: () => ticketsService.list(companyId!), enabled: !!companyId });
  const { data: events } = useQuery({ queryKey: ["events_all", companyId], queryFn: () => ticketsService.listEvents(companyId!), enabled: !!companyId });
  if (!companyId) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Selecione uma empresa.</CardContent></Card>;
  const list = tickets ?? [];
  const open = list.filter(t => t.status === "open").length;
  const inProg = list.filter(t => t.status === "in_progress").length;
  const overdue = list.filter(t => t.sla_due_at && new Date(t.sla_due_at) < new Date() && !["resolved", "closed"].includes(t.status)).length;
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Stat title="Abertos" value={open} />
      <Stat title="Em andamento" value={inProg} />
      <Stat title="SLA vencido" value={overdue} className="text-destructive" />
      <Stat title="Agendamentos" value={(events ?? []).length} />
      <Card className="md:col-span-4">
        <CardHeader><CardTitle className="text-base">Últimos chamados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.slice(0, 8).map(t => (
            <Link key={t.id} to={`/app/tickets/view/${t.id}`} className="flex items-center justify-between rounded-md border p-2 hover:bg-muted">
              <div><div className="font-medium">#{t.ticket_number} • {t.title}</div>
                <div className="text-xs text-muted-foreground">{t.status} • {t.priority}</div></div>
              <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
            </Link>
          ))}
          {list.length === 0 && <div className="text-sm text-muted-foreground">Nenhum chamado.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value, className }: { title: string; value: number; className?: string }) {
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><div className={"text-2xl font-semibold " + (className ?? "")}>{value}</div></CardContent></Card>
  );
}
