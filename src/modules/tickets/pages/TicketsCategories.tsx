import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { ticketsService } from "../services/ticketsService";
import { useTicketsTenant } from "../hooks/useTicketsTenant";
import { toast } from "sonner";

export default function TicketsCategories() {
  const { companyId } = useTicketsTenant();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const { data } = useQuery({ queryKey: ["t_cats", companyId], queryFn: () => ticketsService.listCategories(companyId!), enabled: !!companyId });
  if (!companyId) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Categorias</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
          <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16" />
          <Button onClick={async () => {
            if (!name.trim()) return;
            await ticketsService.createCategory(companyId, { name, color }); setName("");
            qc.invalidateQueries({ queryKey: ["t_cats", companyId] }); toast.success("Categoria criada");
          }}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
        </div>
        {(data ?? []).map(c => (
          <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: c.color }} />{c.name}</div>
            <Button size="icon" variant="ghost" onClick={async () => {
              await ticketsService.deleteCategory(c.id); qc.invalidateQueries({ queryKey: ["t_cats", companyId] });
            }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
