import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTenantGate } from "../hooks/useTenantGate";
import { waService } from "../services/waService";

export default function WAQueues() {
  const { companyId } = useTenantGate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7C3AED");

  const { data } = useQuery({
    queryKey: ["wa", "queues", companyId],
    queryFn: () => waService.listQueues(companyId!),
    enabled: !!companyId,
  });

  async function handleCreate() {
    if (!companyId || !name.trim()) return;
    try {
      await waService.createQueue(companyId, { name: name.trim(), color });
      toast.success("Fila criada");
      setOpen(false); setName("");
      qc.invalidateQueries({ queryKey: ["wa", "queues", companyId] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Filas de Atendimento</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova Fila</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {data?.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma fila.</div>}
        {data?.map((q) => (
          <div key={q.id} className="flex items-center gap-3 rounded-md border p-3">
            <span className="h-3 w-3 rounded-full" style={{ background: q.color }} />
            <span className="font-medium">{q.name}</span>
          </div>
        ))}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Fila</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Cor</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
