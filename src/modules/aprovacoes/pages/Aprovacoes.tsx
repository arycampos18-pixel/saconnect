import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Check, X, Ban, Clock, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { aprovacoesService, type Aprovacao, type AprovacaoStatus } from "../services/aprovacoesService";
import { SolicitarAprovacaoDialog } from "../components/SolicitarAprovacaoDialog";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COR: Record<AprovacaoStatus, string> = {
  Pendente: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Aprovado: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Rejeitado: "bg-destructive/10 text-destructive border-destructive/20",
  Cancelado: "bg-muted text-muted-foreground border-border",
};

export default function Aprovacoes() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [items, setItems] = useState<Aprovacao[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [tab, setTab] = useState<AprovacaoStatus | "Todos">("Pendente");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const filtros = tab === "Todos" ? {} : { status: tab };
      const [list, r] = await Promise.all([
        aprovacoesService.listar(filtros as any),
        aprovacoesService.resumo(),
      ]);
      setItems(list);
      setResumo(r);
    } catch (e: any) {
      toast.error("Erro ao carregar", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [tab]);

  const aprovar = async (a: Aprovacao) => {
    const motivo = prompt("Comentário (opcional):") ?? undefined;
    await aprovacoesService.aprovar(a.id, motivo || undefined);
    toast.success("Solicitação aprovada");
    carregar();
  };

  const rejeitar = async (a: Aprovacao) => {
    const motivo = prompt("Motivo da rejeição:");
    if (!motivo) return;
    await aprovacoesService.rejeitar(a.id, motivo);
    toast.success("Solicitação rejeitada");
    carregar();
  };

  const cancelar = async (a: Aprovacao) => {
    if (!confirm("Cancelar esta solicitação?")) return;
    await aprovacoesService.cancelar(a.id);
    toast.success("Cancelada");
    carregar();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows de Aprovação</h1>
          <p className="text-sm text-muted-foreground">
            Solicitações que aguardam revisão de um administrador.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova solicitação</Button>
      </div>

      {resumo && (
        <div className="grid gap-3 md:grid-cols-4">
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold text-amber-600">{resumo.pendentes}</p></div><Clock className="h-5 w-5 text-amber-600" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Aprovadas</p><p className="text-2xl font-bold text-emerald-600">{resumo.aprovadas}</p></div><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Rejeitadas</p><p className="text-2xl font-bold text-destructive">{resumo.rejeitadas}</p></div><XCircle className="h-5 w-5 text-destructive" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{resumo.total}</p></div><ShieldAlert className="h-5 w-5 text-primary" /></div></CardContent></Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="Pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="Aprovado">Aprovadas</TabsTrigger>
          <TabsTrigger value="Rejeitado">Rejeitadas</TabsTrigger>
          <TabsTrigger value="Cancelado">Canceladas</TabsTrigger>
          <TabsTrigger value="Todos">Todas</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{tab === "Todos" ? "Todas" : `Status: ${tab}`}</CardTitle>
              <CardDescription>{items.length} solicitação(ões)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nada por aqui.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((a) => {
                    const ehMinha = a.solicitado_por === user?.id;
                    return (
                      <div key={a.id} className="rounded-lg border bg-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{a.tipo}</Badge>
                              <Badge className={STATUS_COR[a.status]}>{a.status}</Badge>
                              {a.executado && <Badge variant="secondary">Executado</Badge>}
                            </div>
                            <p className="mt-2 font-medium">{a.titulo}</p>
                            {a.descricao && <p className="mt-1 text-sm text-muted-foreground">{a.descricao}</p>}
                            <p className="mt-2 text-xs text-muted-foreground">
                              Solicitado por <strong>{a.solicitante?.nome ?? "—"}</strong> em {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                            {a.decidido_em && (
                              <p className="text-xs text-muted-foreground">
                                Decidido por <strong>{a.decisor?.nome ?? "—"}</strong> em {format(new Date(a.decidido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                {a.motivo_decisao && <> — "{a.motivo_decisao}"</>}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {a.status === "Pendente" && isAdmin && (
                              <>
                                <Button size="sm" onClick={() => aprovar(a)}><Check className="mr-1 h-3 w-3" /> Aprovar</Button>
                                <Button size="sm" variant="destructive" onClick={() => rejeitar(a)}><X className="mr-1 h-3 w-3" /> Rejeitar</Button>
                              </>
                            )}
                            {a.status === "Pendente" && ehMinha && (
                              <Button size="sm" variant="outline" onClick={() => cancelar(a)}><Ban className="mr-1 h-3 w-3" /> Cancelar</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SolicitarAprovacaoDialog open={open} onOpenChange={setOpen} onSaved={carregar} />
    </div>
  );
}