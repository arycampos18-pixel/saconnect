import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Eye, Download, Activity, History } from "lucide-react";
import { analiseService } from "../services/analiseService";
import { supabase } from "@/integrations/supabase/client";

function tipoBadge(acao: string) {
  if (acao.includes("criado")) return "default";
  if (acao.includes("validado")) return "secondary";
  if (acao.includes("removido") || acao.includes("rejeit")) return "destructive";
  return "outline";
}

function fmtUser(id: string | null, mapa: Record<string, string>) {
  if (!id) return "Sistema";
  return mapa[id] || id.slice(0, 8);
}

export default function AnaliseLogs() {
  const [busca, setBusca] = useState("");
  const [acaoF, setAcaoF] = useState("");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");
  const [eleitorId, setEleitorId] = useState("");
  const [historicoEl, setHistoricoEl] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["analise-logs", acaoF, desde, ate, eleitorId],
    queryFn: () => analiseService.listarLogsFiltrados({
      acao: acaoF || undefined,
      desde: desde ? new Date(desde).toISOString() : undefined,
      ate: ate ? new Date(ate + "T23:59:59").toISOString() : undefined,
      eleitor_id: eleitorId || undefined,
      limit: 1000,
    }),
  });

  const userIds = useMemo(() => Array.from(new Set(logs.map((l: any) => l.user_id).filter(Boolean))), [logs]);
  const { data: usuarios = {} } = useQuery({
    queryKey: ["audit-users", userIds.sort().join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("settings_users").select("id,nome,email").in("id", userIds as string[]);
      const m: Record<string, string> = {};
      (data ?? []).forEach((u: any) => { m[u.id] = u.nome || u.email; });
      return m;
    },
  });

  const filtrados = useMemo(() => {
    if (!busca) return logs;
    const t = busca.toLowerCase();
    return logs.filter((l: any) =>
      l.acao?.toLowerCase().includes(t) ||
      l.entidade?.toLowerCase().includes(t) ||
      JSON.stringify(l.detalhes || {}).toLowerCase().includes(t)
    );
  }, [logs, busca]);

  const stats = useMemo(() => {
    const por: Record<string, number> = {};
    logs.forEach((l: any) => { por[l.acao] = (por[l.acao] || 0) + 1; });
    return { total: logs.length, acoes: Object.keys(por).length, por };
  }, [logs]);

  function exportarCSV() {
    const linhas = [["Data", "Ação", "Usuário", "Entidade", "Eleitor", "IP", "Detalhes"]];
    filtrados.forEach((l: any) => linhas.push([
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.acao,
      fmtUser(l.user_id, usuarios as any),
      l.entidade || "",
      l.eleitor_id || "",
      l.ip || "",
      JSON.stringify(l.detalhes || {}).replace(/"/g, "'"),
    ]));
    const csv = linhas.map(l => l.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `auditoria-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell
      title="Logs e Auditoria"
      description="Trilha completa de ações: quem criou, editou, validou, consultou APIs e quando."
      actions={<Button variant="outline" onClick={exportarCSV}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>}
    >
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4" />Total de eventos</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Ações distintas</div>
          <div className="text-2xl font-bold mt-1">{stats.acoes}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Usuários ativos</div>
          <div className="text-2xl font-bold mt-1">{userIds.length}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="trilha">
        <TabsList>
          <TabsTrigger value="trilha">Trilha de Auditoria</TabsTrigger>
          <TabsTrigger value="historico">Histórico do Eleitor</TabsTrigger>
        </TabsList>

        <TabsContent value="trilha" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <div>
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Texto..." value={busca} onChange={e => setBusca(e.target.value)} />
                </div>
              </div>
              <div><Label className="text-xs">Ação contém</Label><Input value={acaoF} onChange={e => setAcaoF(e.target.value)} placeholder="eleitor.editado" /></div>
              <div><Label className="text-xs">De</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></div>
              <div><Label className="text-xs">Até</Label><Input type="date" value={ate} onChange={e => setAte(e.target.value)} /></div>
              <div><Label className="text-xs">Eleitor ID</Label><Input value={eleitorId} onChange={e => setEleitorId(e.target.value)} placeholder="UUID" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : filtrados.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhum registro.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Data/Hora</th>
                        <th className="px-3 py-2 text-left">Ação</th>
                        <th className="px-3 py-2 text-left">Usuário</th>
                        <th className="px-3 py-2 text-left">Entidade</th>
                        <th className="px-3 py-2 text-left">IP</th>
                        <th className="px-3 py-2 text-right">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((l: any) => (
                        <tr key={l.id} className="border-t hover:bg-muted/30">
                          <td className="px-3 py-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                          <td className="px-3 py-2"><Badge variant={tipoBadge(l.acao) as any}>{l.acao}</Badge></td>
                          <td className="px-3 py-2">{fmtUser(l.user_id, usuarios as any)}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {l.entidade}
                            {l.eleitor_id && <button className="ml-2 underline" onClick={() => setHistoricoEl(l.eleitor_id)}>ver eleitor</button>}
                          </td>
                          <td className="px-3 py-2 text-xs">{l.ip || "—"}</td>
                          <td className="px-3 py-2 text-right">
                            <Button size="sm" variant="ghost" onClick={() => alert(JSON.stringify(l.detalhes, null, 2))}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader><CardTitle className="text-base">Consultar histórico de um eleitor</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input placeholder="UUID do eleitor" value={eleitorId} onChange={e => setEleitorId(e.target.value)} />
              <Button onClick={() => eleitorId && setHistoricoEl(eleitorId)}><History className="mr-2 h-4 w-4" />Abrir</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <HistoricoDialog eleitorId={historicoEl} onClose={() => setHistoricoEl(null)} usuarios={usuarios as any} />
    </PageShell>
  );
}

function HistoricoDialog({ eleitorId, onClose, usuarios }: { eleitorId: string | null; onClose: () => void; usuarios: Record<string, string>; }) {
  const { data: hist = [], isLoading } = useQuery({
    queryKey: ["hist-eleitor", eleitorId],
    enabled: !!eleitorId,
    queryFn: () => analiseService.historicoEleitor(eleitorId!),
  });
  const { data: eleitor } = useQuery({
    queryKey: ["hist-eleitor-info", eleitorId],
    enabled: !!eleitorId,
    queryFn: async () => {
      const { data } = await supabase.from("eleitores").select("nome,cpf,telefone").eq("id", eleitorId!).maybeSingle();
      return data;
    },
  });

  return (
    <Dialog open={!!eleitorId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Histórico Completo do Eleitor</DialogTitle>
          {eleitor && <p className="text-sm text-muted-foreground">{eleitor.nome} · {eleitor.cpf || "sem CPF"}</p>}
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? <div className="py-8 text-center text-sm">Carregando...</div> : hist.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Sem registros.</div>
          ) : (
            <ol className="relative border-l ml-3 space-y-4 py-2">
              {hist.map((h: any, i: number) => (
                <li key={i} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{h.tipo}</Badge>
                      <span className="font-medium text-sm">{h.titulo}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(h.ocorrido_em).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Por: {fmtUser(h.user_id, usuarios)} {h.ip && `· IP ${h.ip}`}
                  </div>
                  {h.detalhes && Object.keys(h.detalhes).length > 0 && (
                    <pre className="mt-2 bg-muted rounded p-2 text-xs overflow-x-auto">{JSON.stringify(h.detalhes, null, 2)}</pre>
                  )}
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
