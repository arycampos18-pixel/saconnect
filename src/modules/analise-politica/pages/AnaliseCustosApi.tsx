import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { analiseService } from "../services/analiseService";

const fmtBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Cfg = {
  id?: string;
  nome: string;
  provedor: string | null;
  custo_centavos: number;
  status: "ativo" | "inativo";
  vigencia_inicio: string;
  vigencia_fim: string | null;
  observacoes: string | null;
};

const emptyCfg: Cfg = {
  nome: "", provedor: "", custo_centavos: 0, status: "ativo",
  vigencia_inicio: new Date().toISOString().slice(0, 10),
  vigencia_fim: null, observacoes: "",
};

function ConfigDialog({ initial, onClose }: { initial?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Cfg>(initial ? {
    ...emptyCfg, ...initial,
    custo_centavos: initial.custo_centavos ?? 0,
  } : emptyCfg);
  const [reais, setReais] = useState<string>(((initial?.custo_centavos ?? 0) / 100).toFixed(2));

  const save = useMutation({
    mutationFn: () => {
      const cents = Math.round(parseFloat(reais.replace(",", ".") || "0") * 100);
      return analiseService.salvarConfiguracaoCusto({ ...form, custo_centavos: cents });
    },
    onSuccess: () => {
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["api-cfg-custo"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial ? "Editar API" : "Nova API"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label>Nome</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div>
          <Label>Provedor</Label>
          <Input value={form.provedor ?? ""} onChange={(e) => setForm({ ...form, provedor: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Custo por consulta (R$)</Label>
            <Input type="number" step="0.01" value={reais} onChange={(e) => setReais(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Vigência início</Label>
            <Input type="date" value={form.vigencia_inicio}
              onChange={(e) => setForm({ ...form, vigencia_inicio: e.target.value })} />
          </div>
          <div>
            <Label>Vigência fim</Label>
            <Input type="date" value={form.vigencia_fim ?? ""}
              onChange={(e) => setForm({ ...form, vigencia_fim: e.target.value || null })} />
          </div>
        </div>
        <div>
          <Label>Observações</Label>
          <Input value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.nome}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function AnaliseCustosApi() {
  const qc = useQueryClient();
  const [openCfg, setOpenCfg] = useState<{ open: boolean; data?: any }>({ open: false });
  const [filtros, setFiltros] = useState<{ api_nome: string | null; status: string | null }>({
    api_nome: null, status: null,
  });

  const { data: cfgs = [] } = useQuery({
    queryKey: ["api-cfg-custo"],
    queryFn: () => analiseService.listarConfiguracoesCusto(),
  });

  const { data: consultas = [] } = useQuery({
    queryKey: ["api-consultas-custos", filtros],
    queryFn: () => analiseService.listarConsultasCustos(filtros),
  });

  const totais = useMemo(() => {
    const t = (consultas as any[]).reduce(
      (acc, c) => ({
        consultas: acc.consultas + 1,
        total: acc.total + (c.custo_total_centavos ?? 0),
        erros: acc.erros + (c.status === "erro" ? 1 : 0),
      }),
      { consultas: 0, total: 0, erros: 0 },
    );
    return t;
  }, [consultas]);

  const excluir = useMutation({
    mutationFn: (id: string) => analiseService.excluirConfiguracaoCusto(id),
    onSuccess: () => {
      toast.success("Removida");
      qc.invalidateQueries({ queryKey: ["api-cfg-custo"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <PageShell title="Custos de API" description="Configuração de custos e histórico de consultas.">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Consultas no período</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{totais.consultas}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Custo total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{fmtBRL(totais.total)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Erros</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{totais.erros}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="historico">Histórico de consultas</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">APIs cadastradas</CardTitle>
              <Dialog open={openCfg.open} onOpenChange={(o) => setOpenCfg({ open: o, data: o ? openCfg.data : undefined })}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setOpenCfg({ open: true })}>
                    <Plus className="mr-1 h-4 w-4" /> Nova API
                  </Button>
                </DialogTrigger>
                {openCfg.open && (
                  <ConfigDialog initial={openCfg.data} onClose={() => setOpenCfg({ open: false })} />
                )}
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(cfgs as any[]).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Nenhuma API cadastrada.
                    </TableCell></TableRow>
                  ) : (cfgs as any[]).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.provedor ?? "—"}</TableCell>
                      <TableCell>{fmtBRL(c.custo_centavos)}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.vigencia_inicio} {c.vigencia_fim ? `→ ${c.vigencia_fim}` : "→ —"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => setOpenCfg({ open: true, data: c })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => {
                          if (confirm(`Remover ${c.nome}?`)) excluir.mutate(c.id);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs">API</Label>
                <Select value={filtros.api_nome ?? "__all"} onValueChange={(v) =>
                  setFiltros((p) => ({ ...p, api_nome: v === "__all" ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todas</SelectItem>
                    {(cfgs as any[]).map((c) => (
                      <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={filtros.status ?? "__all"} onValueChange={(v) =>
                  setFiltros((p) => ({ ...p, status: v === "__all" ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todos</SelectItem>
                    <SelectItem value="sucesso">Sucesso</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                    <SelectItem value="ignorado">Ignorado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>API</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Eleitor</TableHead>
                    <TableHead>Liderança</TableHead>
                    <TableHead>Unitário</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(consultas as any[]).length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                      Sem consultas no período.
                    </TableCell></TableRow>
                  ) : (consultas as any[]).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{new Date(c.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{c.api_nome}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "sucesso" ? "default" : c.status === "erro" ? "destructive" : "secondary"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{c.eleitor_id?.slice(0, 8) ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.lideranca_id?.slice(0, 8) ?? "—"}</TableCell>
                      <TableCell>{fmtBRL(c.custo_unitario_centavos)}</TableCell>
                      <TableCell>{c.quantidade}</TableCell>
                      <TableCell className="font-medium">{fmtBRL(c.custo_total_centavos)}</TableCell>
                      <TableCell className="text-xs text-destructive">{c.erro ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
