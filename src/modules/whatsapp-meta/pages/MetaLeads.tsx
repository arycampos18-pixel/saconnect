import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { metaService } from "@/modules/whatsapp-meta/services/whatsappMetaService";
import { Label } from "@/components/ui/label";

export default function MetaLeads() {
  const [status, setStatus] = useState<string>("");
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["meta-leads", status],
    queryFn: () => metaService.listLeads({ status: status || undefined }),
  });

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-end gap-3">
        <div className="min-w-[200px]">
          <Label>Status</Label>
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="new">Novo</SelectItem>
              <SelectItem value="contacted">Contatado</SelectItem>
              <SelectItem value="converted">Convertido</SelectItem>
              <SelectItem value="lost">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Última interação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={5}>Carregando…</TableCell></TableRow>}
          {!isLoading && leads.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum lead.</TableCell></TableRow>}
          {leads.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{l.name ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs">{l.phone_number}</TableCell>
              <TableCell>{l.interaction_type ?? "—"}</TableCell>
              <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
              <TableCell className="text-xs">{l.last_interaction_at ? new Date(l.last_interaction_at).toLocaleString("pt-BR") : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}