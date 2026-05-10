import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, X } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { analiseService } from "../services/analiseService";

const TIPO_LABEL: Record<string, string> = {
  cpf: "CPF",
  telefone: "Telefone",
  nome_nascimento: "Nome + Nascimento",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "possível duplicidade": "secondary",
  "duplicidade confirmada": "destructive",
  descartada: "outline",
};

export default function AnaliseDuplicidades() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState<{ status: string | null; tipo: string | null }>({
    status: "possível duplicidade", tipo: null,
  });
  const [revisao, setRevisao] = useState<{ open: boolean; id?: string; decisao?: "confirmada" | "descartada" }>({ open: false });
  const [motivo, setMotivo] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["dup-list", filtros],
    queryFn: () => analiseService.listarDuplicidades(filtros),
  });

  const revisar = useMutation({
    mutationFn: ({ id, decisao, motivo }: { id: string; decisao: "confirmada" | "descartada"; motivo: string }) =>
      analiseService.revisarDuplicidade(id, decisao, motivo),
    onSuccess: () => {
      toast.success("Revisão registrada");
      setRevisao({ open: false });
      setMotivo("");
      qc.invalidateQueries({ queryKey: ["dup-list"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const total = (rows as any[]).length;
  const possiveis = (rows as any[]).filter((r) => r.status === "possível duplicidade").length;
  const confirmadas = (rows as any[]).filter((r) => r.status === "duplicidade confirmada").length;

  return (
    <PageShell
      title="Detecção de Duplicidades"
      description="Eleitores com possíveis ou confirmados registros duplicados (CPF, telefone, nome + nascimento)."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Registros</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Possíveis</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{possiveis}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Confirmadas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{confirmadas}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filtros.status ?? "__all"} onValueChange={(v) => setFiltros((p) => ({ ...p, status: v === "__all" ? null : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                <SelectItem value="possível duplicidade">Possível duplicidade</SelectItem>
                <SelectItem value="duplicidade confirmada">Duplicidade confirmada</SelectItem>
                <SelectItem value="descartada">Descartada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={filtros.tipo ?? "__all"} onValueChange={(v) => setFiltros((p) => ({ ...p, tipo: v === "__all" ? null : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="nome_nascimento">Nome + Nascimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Eleitor novo</TableHead>
                <TableHead>Eleitor existente</TableHead>
                <TableHead>Detalhe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows as any[]).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Sem duplicidades nesse filtro.
                </TableCell></TableRow>
              ) : (rows as any[]).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> {TIPO_LABEL[r.tipo] ?? r.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{r.eleitor?.nome ?? "—"}</div>
                    <div className="text-muted-foreground">{r.eleitor?.cpf ?? r.eleitor?.telefone ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{r.duplicado?.nome ?? "—"}</div>
                    <div className="text-muted-foreground">{r.duplicado?.cpf ?? r.duplicado?.telefone ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.detalhes?.valor ?? r.detalhes?.nome ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {r.status === "possível duplicidade" ? (
                      <>
                        <Button size="sm" variant="destructive"
                          onClick={() => setRevisao({ open: true, id: r.id, decisao: "confirmada" })}>
                          <Check className="h-3 w-3 mr-1" /> Confirmar
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => setRevisao({ open: true, id: r.id, decisao: "descartada" })}>
                          <X className="h-3 w-3 mr-1" /> Descartar
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Revisado</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={revisao.open} onOpenChange={(o) => { if (!o) { setRevisao({ open: false }); setMotivo(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{revisao.decisao === "confirmada" ? "Confirmar duplicidade" : "Descartar duplicidade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Motivo</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)}
              placeholder="Justificativa da decisão" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisao({ open: false })}>Cancelar</Button>
            <Button
              variant={revisao.decisao === "confirmada" ? "destructive" : "default"}
              disabled={revisar.isPending}
              onClick={() => revisao.id && revisao.decisao &&
                revisar.mutate({ id: revisao.id, decisao: revisao.decisao, motivo })}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
