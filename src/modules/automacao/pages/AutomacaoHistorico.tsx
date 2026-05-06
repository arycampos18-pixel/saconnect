import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, History, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { automacaoService, type Automacao, type Execucao } from "../services/automacaoService";

export default function AutomacaoHistorico() {
  const [execs, setExecs] = useState<Execucao[]>([]);
  const [autos, setAutos] = useState<Automacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([automacaoService.listarExecucoes(undefined, 100), automacaoService.listar()])
      .then(([e, a]) => {
        setExecs(e);
        setAutos(a);
      })
      .catch((e) => toast.error(e?.message ?? "Erro ao carregar histórico."))
      .finally(() => setLoading(false));
  }, []);

  const nomeDe = (id: string) => autos.find((a) => a.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/automacoes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
            <History className="h-6 w-6 text-primary" /> Histórico de execuções
          </h1>
          <p className="text-xs text-muted-foreground">Últimas 100 execuções de automações.</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : execs.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma execução registrada ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/hora</TableHead>
                <TableHead>Automação</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações executadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {execs.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{nomeDe(e.automacao_id)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.trigger_origem ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        e.status === "Sucesso"
                          ? "bg-sky-500 hover:bg-sky-500"
                          : e.status === "Erro"
                          ? "bg-destructive hover:bg-destructive"
                          : ""
                      }
                    >
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {Array.isArray(e.acoes_executadas) && e.acoes_executadas.length > 0 ? (
                      <ul className="space-y-0.5">
                        {e.acoes_executadas.map((a: any, i: number) => (
                          <li key={i} className="text-muted-foreground">
                            • {a.descricao || a.tipo}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">{e.erro ?? "—"}</span>
                    )}
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