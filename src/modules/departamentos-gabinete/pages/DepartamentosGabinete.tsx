import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, Eye, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { depStore, useDepStore } from "../store";
import { DepartamentoFormDialog } from "../components/DepartamentoFormDialog";
import type { DepartamentoGab } from "../data/mock";

export default function DepartamentosGabinete() {
  const departamentos = useDepStore((s) => s.departamentos);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"Todos" | "Ativo" | "Inativo">("Todos");
  const [openForm, setOpenForm] = useState(false);
  const [editando, setEditando] = useState<DepartamentoGab | null>(null);
  const [excluir, setExcluir] = useState<DepartamentoGab | null>(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return departamentos.filter((d) => {
      if (statusFiltro !== "Todos" && d.status !== statusFiltro) return false;
      if (!q) return true;
      return (
        d.nome.toLowerCase().includes(q) ||
        d.descricao.toLowerCase().includes(q) ||
        d.responsavel.toLowerCase().includes(q)
      );
    });
  }, [departamentos, busca, statusFiltro]);

  const totalAtivos = departamentos.filter((d) => d.status === "Ativo").length;
  const totalMembros = departamentos.reduce((acc, d) => acc + depStore.totalMembros(d.id), 0);

  return (
    <div className="container max-w-7xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departamentos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie departamentos do gabinete, membros e o histórico de interações.
          </p>
        </div>
        <Button onClick={() => { setEditando(null); setOpenForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Departamento
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Departamentos" value={departamentos.length} hint={`${totalAtivos} ativos`} />
        <StatCard title="Total de membros" value={totalMembros} hint="somados" />
        <StatCard title="Responsáveis distintos" value={new Set(departamentos.map((d) => d.responsavel)).size} hint="pessoas" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Lista de departamentos</CardTitle>
            <div className="flex flex-1 gap-2 sm:max-w-md">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, descrição, responsável…"
                  className="pl-9"
                />
              </div>
              <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Ativo">Ativos</SelectItem>
                  <SelectItem value="Inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Departamento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Membros</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{d.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-muted-foreground">{d.descricao}</TableCell>
                  <TableCell>{d.responsavel}</TableCell>
                  <TableCell className="text-right tabular-nums">{depStore.totalMembros(d.id)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        d.status === "Ativo"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-muted-foreground/20 bg-muted text-muted-foreground"
                      }
                    >
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost" title="Visualizar">
                        <Link to={`/app/departamentos-gabinete/${d.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button size="icon" variant="ghost" title="Editar"
                        onClick={() => { setEditando(d); setOpenForm(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Excluir"
                        onClick={() => setExcluir(d)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {lista.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum departamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DepartamentoFormDialog open={openForm} onOpenChange={setOpenForm} editing={editando} />

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar departamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar <strong>{excluir?.nome}</strong>?
              Todos os membros serão desvinculados e o histórico será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (excluir) {
                  depStore.remover(excluir.id);
                  toast.success("Departamento removido");
                  setExcluir(null);
                }
              }}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}