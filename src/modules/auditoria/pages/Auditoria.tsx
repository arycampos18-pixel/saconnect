import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, Download, Search, Shield, User2, Eye } from "lucide-react";
import { toast } from "sonner";
import { auditoriaService, AuditAcao, AuditLog } from "../services/auditoriaService";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";

const ACOES: AuditAcao[] = [
  "Criar",
  "Editar",
  "Excluir",
  "Login",
  "Logout",
  "Exportar",
  "Importar",
  "Aprovar",
  "Rejeitar",
  "Outro",
];

const corAcao: Record<AuditAcao, string> = {
  Criar: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Editar: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  Excluir: "bg-red-500/15 text-red-700 border-red-500/30",
  Login: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  Logout: "bg-zinc-500/15 text-zinc-700 border-zinc-500/30",
  Exportar: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Importar: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30",
  Aprovar: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Rejeitar: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  Outro: "bg-muted text-foreground border-border",
};

export default function Auditoria() {
  const { isAdmin, loading: loadingRole } = useUserRole();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [metricas, setMetricas] = useState<{
    total: number;
    hoje: number;
    usuarios: number;
    porAcao: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [acao, setAcao] = useState<AuditAcao | "todas">("todas");
  const [detalhe, setDetalhe] = useState<AuditLog | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [data, m] = await Promise.all([
        auditoriaService.listar({
          acao: acao === "todas" ? undefined : acao,
          busca: busca.trim() || undefined,
        }),
        auditoriaService.metricas(),
      ]);
      setLogs(data);
      setMetricas(m);
    } catch (e: any) {
      toast.error("Erro ao carregar logs", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingRole && isAdmin) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acao, isAdmin, loadingRole]);

  const exportar = async () => {
    const csv = await auditoriaService.exportarCSV(logs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    await auditoriaService.registrar({
      acao: "Exportar",
      entidade: "audit_logs",
      modulo: "Auditoria",
      descricao: `Exportou ${logs.length} registros de auditoria`,
    });
    toast.success("Logs exportados");
  };

  const topEntidades = useMemo(() => {
    if (!metricas) return [] as { nome: string; total: number }[];
    return Object.entries((metricas as any).porEntidade ?? {})
      .map(([nome, total]) => ({ nome, total: total as number }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [metricas]);

  if (loadingRole) {
    return <div className="p-8 text-muted-foreground">Carregando…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso restrito</h2>
        <p className="text-muted-foreground max-w-md">
          Apenas administradores podem visualizar os logs de auditoria do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            Auditoria & Logs
          </h1>
          <p className="text-muted-foreground">
            Rastreabilidade completa das ações realizadas no sistema.
          </p>
        </div>
        <Button onClick={exportar} variant="outline" disabled={!logs.length}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metricas?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{metricas?.hoje ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuários ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <User2 className="h-6 w-6 text-muted-foreground" />
              {metricas?.usuarios ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top entidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs">
              {topEntidades.length === 0 && (
                <span className="text-muted-foreground">Nenhum registro</span>
              )}
              {topEntidades.map((e) => (
                <div key={e.nome} className="flex justify-between">
                  <span className="truncate">{e.nome}</span>
                  <span className="font-semibold">{e.total}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, email ou descrição…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregar()}
                className="pl-9"
              />
            </div>
            <Select value={acao} onValueChange={(v) => setAcao(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as ações</SelectItem>
                {ACOES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={carregar} variant="secondary">
              Filtrar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{l.user_nome ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">
                            {l.user_email ?? ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={corAcao[l.acao]}>
                          {l.acao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{l.modulo ?? "—"}</TableCell>
                      <TableCell className="text-sm font-mono text-xs">{l.entidade}</TableCell>
                      <TableCell className="text-sm max-w-[320px] truncate">
                        {l.descricao ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDetalhe(l)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do log</DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Data</div>
                  <div>{new Date(detalhe.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Usuário</div>
                  <div>
                    {detalhe.user_nome} <span className="text-muted-foreground">({detalhe.user_email})</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ação</div>
                  <Badge variant="outline" className={corAcao[detalhe.acao]}>
                    {detalhe.acao}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Entidade</div>
                  <div className="font-mono text-xs">{detalhe.entidade}</div>
                </div>
              </div>
              {detalhe.descricao && (
                <div>
                  <div className="text-xs text-muted-foreground">Descrição</div>
                  <div>{detalhe.descricao}</div>
                </div>
              )}
              {(detalhe.dados_anteriores || detalhe.dados_novos) && (
                <div className="grid gap-3 md:grid-cols-2">
                  {detalhe.dados_anteriores && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Antes</div>
                      <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-60">
                        {JSON.stringify(detalhe.dados_anteriores, null, 2)}
                      </pre>
                    </div>
                  )}
                  {detalhe.dados_novos && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Depois</div>
                      <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-60">
                        {JSON.stringify(detalhe.dados_novos, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              <div className="text-xs text-muted-foreground border-t pt-2">
                User-Agent: {detalhe.user_agent ?? "—"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}