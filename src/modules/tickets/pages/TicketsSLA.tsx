import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useTicketsTenant } from "../hooks/useTicketsTenant";
import { ticketsService } from "../services/ticketsService";
import { SlaIndicator } from "../components/SlaIndicator";
import { StatusBadge } from "../components/StatusBadge";

export default function TicketsSLA() {
  const { companyId } = useTicketsTenant();
  const { data } = useQuery({ queryKey: ["tickets_sla", companyId], queryFn: () => ticketsService.list(companyId!), enabled: !!companyId });
  if (!companyId) return null;
  const list = (data ?? [])
    .filter(t => t.sla_due_at && !["resolved", "closed"].includes(t.status))
    .sort((a, b) => (a.sla_due_at ?? "").localeCompare(b.sla_due_at ?? ""));
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">SLA — chamados ativos</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {list.length === 0 && <div className="text-sm text-muted-foreground">Nenhum chamado com SLA.</div>}
        {list.map(t => (
          <Link key={t.id} to={`/app/tickets/view/${t.id}`} className="flex items-center justify-between rounded-md border p-2 hover:bg-muted">
            <div className="text-sm">#{t.ticket_number} • {t.title}</div>
            <div className="flex items-center gap-3"><SlaIndicator dueAt={t.sla_due_at} /><StatusBadge value={t.status} /></div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
