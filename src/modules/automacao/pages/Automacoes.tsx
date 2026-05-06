import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  Copy,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { automacaoService, type Automacao } from "../services/automacaoService";

export default function Automacoes() {
  const navigate = useNavigate();
  const [lista, setLista] = useState<Automacao[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      setLista(await automacaoService.listar());
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar automações.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function nova() {
    try {
      const a = await automacaoService.criar({ nome: "Nova automação" });
      navigate(`/app/automacoes/${a.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar automação.");
    }
  }

  async function toggleStatus(a: Automacao) {
    const novo = a.status === "Ativa" ? "Pausada" : "Ativa";
    await automacaoService.atualizarStatus(a.id, novo);
    toast.success(`Automação ${novo === "Ativa" ? "ativada" : "pausada"}.`);
    carregar();
  }

  async function executar(a: Automacao) {
    try {
      await automacaoService.executarManual(a.id);
      toast.success("Automação executada.");
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao executar.");
    }
  }

  async function duplicar(a: Automacao) {
    await automacaoService.duplicar(a.id);
    toast.success("Automação duplicada.");
    carregar();
  }

  async function remover(a: Automacao) {
    if (!confirm(`Remover "${a.nome}"?`)) return;
    await automacaoService.remover(a.id);
    toast.success("Removida.");
    carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <Zap className="h-7 w-7 text-primary" /> Automação Inteligente
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie fluxos visuais que disparam ações a partir de eventos da sua base.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/app/automacoes/historico">Histórico</Link>
          </Button>
          <Button onClick={nova} className="gap-2">
            <Plus className="h-4 w-4" /> Nova automação
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma automação criada. Comece criando a primeira.
            </p>
            <Button onClick={nova} className="gap-2">
              <Plus className="h-4 w-4" /> Criar primeira automação
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Execuções</TableHead>
                <TableHead>Última execução</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.trigger_tipo}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={a.status === "Ativa" ? "default" : "secondary"}
                      className={
                        a.status === "Ativa"
                          ? "bg-sky-500 hover:bg-sky-500"
                          : a.status === "Pausada"
                          ? "bg-amber-500 hover:bg-amber-500 text-white"
                          : ""
                      }
                    >
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{a.total_execucoes}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.ultima_execucao_em
                      ? new Date(a.ultima_execucao_em).toLocaleString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Executar agora" onClick={() => executar(a)}>
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title={a.status === "Ativa" ? "Pausar" : "Ativar"} onClick={() => toggleStatus(a)}>
                        {a.status === "Ativa" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" title="Editar" asChild>
                        <Link to={`/app/automacoes/${a.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="icon" variant="ghost" title="Duplicar" onClick={() => duplicar(a)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Remover" onClick={() => remover(a)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}