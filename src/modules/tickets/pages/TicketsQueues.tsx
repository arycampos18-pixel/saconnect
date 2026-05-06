import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { ticketsService } from "../services/ticketsService";
import { useTicketsTenant } from "../hooks/useTicketsTenant";
import { toast } from "sonner";

export default function TicketsQueues() {
  const { companyId } = useTicketsTenant();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data } = useQuery({ queryKey: ["t_queues", companyId], queryFn: () => ticketsService.listQueues(companyId!), enabled: !!companyId });
  if (!companyId) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Filas de Atendimento</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Nome da fila" value={name} onChange={e => setName(e.target.value)} />
          <Button onClick={async () => {
            if (!name.trim()) return;
            await ticketsService.createQueue(companyId, { name }); setName("");
            qc.invalidateQueries({ queryKey: ["t_queues", companyId] }); toast.success("Fila criada");
          }}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
        </div>
        {(data ?? []).map(q => (
          <div key={q.id} className="flex items-center justify-between rounded-md border p-3">
            <div>{q.name}</div>
            <Button size="icon" variant="ghost" onClick={async () => {
              await ticketsService.deleteQueue(q.id); qc.invalidateQueries({ queryKey: ["t_queues", companyId] });
            }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
