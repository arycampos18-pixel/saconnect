import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { waBulkService, type WaBulkFilaItem } from "../services/waBulkService";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pendente: "outline",
  enviando: "secondary",
  enviado: "default",
  entregue: "default",
  lido: "default",
  erro: "destructive",
  cancelado: "outline",
};

export default function WaBulkFila() {
  const [items, setItems] = useState<WaBulkFilaItem[]>([]);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const [list, cont] = await Promise.all([
        waBulkService.listFila({ status: status || undefined, limit: 200 }),
        waBulkService.filaContagemPorStatus(),
      ]);
      setItems(list); setContagem(cont);
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [status]);

  const dispararWorker = async () => {
    try {
      const r = await waBulkService.dispararWorker();
      toast.success(`Worker: ${r?.processados ?? 0} processadas`);
      carregar();
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  const totais = ["pendente", "enviando", "enviado", "entregue", "lido", "erro"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Fila de envios</h2>
          <p className="text-sm text-muted-foreground">Mensagens aguardando processamento.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={carregar}><RefreshCw className="mr-2 h-4 w-4" /> Atualizar</Button>
          <Button onClick={dispararWorker}><Send className="mr-2 h-4 w-4" /> Disparar fila</Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {totais.map((s) => (
          <Card key={s} className="p-3">
            <p className="text-xs uppercase text-muted-foreground">{s}</p>
            <p className="text-xl font-semibold">{contagem[s] ?? 0}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm">Filtrar status:</span>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {totais.concat(["cancelado"]).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum item na fila.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Telefone</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Próximo envio</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs">{it.destinatario_telefone}</TableCell>
                  <TableCell>{it.destinatario_nome ?? "—"}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[it.status]}>{it.status}</Badge></TableCell>
                  <TableCell>{it.tentativas}/{it.max_tentativas}</TableCell>
                  <TableCell className="text-xs">{new Date(it.proximo_envio).toLocaleString()}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-destructive">{it.erro_mensagem ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}