import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useTicketsTenant } from "../hooks/useTicketsTenant";
import { ticketsService } from "../services/ticketsService";
import { TicketFormDialog } from "../components/TicketFormDialog";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { SlaIndicator } from "../components/SlaIndicator";

export default function TicketsList() {
  const { companyId } = useTicketsTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<{ status?: string; priority?: string; queue_id?: string; search: string; withEvent?: "any" | "yes" | "no" }>({ search: "", withEvent: "any" });

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", companyId, filters.status, filters.priority, filters.queue_id],
    queryFn: () => ticketsService.list(companyId!, { status: filters.status, priority: filters.priority, queue_id: filters.queue_id }),
    enabled: !!companyId,
  });
  const { data: events } = useQuery({ queryKey: ["events_all", companyId], queryFn: () => ticketsService.listEvents(companyId!), enabled: !!companyId });
  const ticketsWithEvent = new Set((events ?? []).map(e => e.ticket_id).filter(Boolean) as string[]);

  if (!companyId) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Selecione uma empresa.</CardContent></Card>;

  const list = (data ?? []).filter(t => {
    if (filters.search && !`${t.title} ${t.ticket_number} ${t.requester_name ?? ""}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.withEvent === "yes" && !ticketsWithEvent.has(t.id)) return false;
    if (filters.withEvent === "no" && ticketsWithEvent.has(t.id)) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Chamados</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Novo Chamado</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Input placeholder="Buscar..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
          <Select value={filters.status ?? "all"} onValueChange={v => setFilters({ ...filters, status: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="waiting">Aguardando</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="closed">Fechado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority ?? "all"} onValueChange={v => setFilters({ ...filters, priority: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.withEvent} onValueChange={(v: any) => setFilters({ ...filters, withEvent: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Todos (agenda)</SelectItem>
              <SelectItem value="yes">Com agendamento</SelectItem>
              <SelectItem value="no">Sem agendamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
        {!isLoading && list.length === 0 && <div className="text-sm text-muted-foreground">Nenhum chamado encontrado.</div>}
        <div className="space-y-2">
          {list.map(t => (
            <Link key={t.id} to={`/app/tickets/view/${t.id}`}
              className="flex items-center justify-between rounded-md border p-3 hover:bg-muted">
              <div className="space-y-1">
                <div className="font-medium">#{t.ticket_number} • {t.title}</div>
                <div className="text-xs text-muted-foreground">{t.requester_name ?? "—"}</div>
              </div>
              <div className="flex items-center gap-3">
                <SlaIndicator dueAt={t.sla_due_at} />
                <PriorityBadge value={t.priority} />
                <StatusBadge value={t.status} />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
      <TicketFormDialog open={open} onOpenChange={setOpen} companyId={companyId}
        onCreated={() => qc.invalidateQueries({ queryKey: ["tickets", companyId] })} />
    </Card>
  );
}
