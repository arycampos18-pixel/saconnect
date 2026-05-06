import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, Download, ChevronDown, ChevronRight, RotateCcw, History } from "lucide-react";
import { auditoriaService, type AuditLog, type AuditAcao } from "@/modules/auditoria/services/auditoriaService";
import { downloadCSV, toCSV } from "@/shared/utils/csv";

const POR_PAGINA = 20;

function tipoMudancaLabel(acao: AuditAcao): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  switch (acao) {
    case "Criar": return { label: "Criação", variant: "default" };
    case "Editar": return { label: "Alteração de Permissão", variant: "secondary" };
    case "Excluir": return { label: "Exclusão", variant: "destructive" };
    default: return { label: acao, variant: "outline" };
  }
}

/** Tenta extrair "papel anterior" e "papel novo" da descrição registrada pelo PermissoesPanel.
 *  Formato esperado: "Permissão de {nome} alterada para {role}". */
function extrairPapelNovo(descricao: string | null): string | null {
  if (!descricao) return null;
  const m = descricao.match(/alterada para (\w+)/i);
  return m ? m[1] : null;
}

export function HistoricoPermissoes() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");
  const [filtroAdmin, setFiltroAdmin] = useState<string>("todos");
  const [filtroAfetado, setFiltroAfetado] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [pagina, setPagina] = useState(1);
  const [expandida, setExpandida] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      // Pega todos logs relativos à entidade user_role (registrados pelo PermissoesPanel)
      const all = await auditoriaService.listar({ entidade: "user_role", limit: 1000 });
      setLogs(all);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  // Listas únicas para filtros
  const admins = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((l) => {
      if (l.user_id) map.set(l.user_id, l.user_nome ?? l.user_email ?? l.user_id);
    });
    return Array.from(map.entries());
  }, [logs]);

  const afetados = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((l) => {
      if (l.entidade_id) {
        // tenta extrair nome da descrição: "Permissão de NOME alterada para ..."
        const m = l.descricao?.match(/Permissão de (.+?) alterada/i);
        const nome = m?.[1] ?? l.entidade_id.slice(0, 8);
        map.set(l.entidade_id, nome);
      }
    });
    return Array.from(map.entries());
  }, [logs]);

  const filtrados = useMemo(() => {
    return logs.filter((l) => {
      if (filtroTipo !== "todos" && l.acao !== filtroTipo) return false;
      if (filtroAdmin !== "todos" && l.user_id !== filtroAdmin) return false;
      if (filtroAfetado !== "todos" && l.entidade_id !== filtroAfetado) return false;
      if (desde && new Date(l.created_at) < new Date(desde)) return false;
      if (ate && new Date(l.created_at) > new Date(ate + "T23:59:59")) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const hay = `${l.descricao ?? ""} ${l.user_nome ?? ""} ${l.user_email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filtroTipo, filtroAdmin, filtroAfetado, desde, ate, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visiveis = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  function limparFiltros() {
    setBusca(""); setDesde(""); setAte("");
    setFiltroAdmin("todos"); setFiltroAfetado("todos"); setFiltroTipo("todos");
    setPagina(1);
  }

  function exportar() {
    const rows = filtrados.map((l) => ({
      "Data/Hora": new Date(l.created_at).toLocaleString("pt-BR"),
      "Usuário Afetado": afetados.find(([id]) => id === l.entidade_id)?.[1] ?? l.entidade_id ?? "—",
      "Tipo de Mudança": tipoMudancaLabel(l.acao).label,
      "Papel Novo": extrairPapelNovo(l.descricao) ?? "—",
      "Administrador": l.user_nome ?? l.user_email ?? "—",
      "Email Admin": l.user_email ?? "—",
      "Descrição": l.descricao ?? "",
      "User Agent": l.user_agent ?? "",
    }));
    downloadCSV(`auditoria-permissoes-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
        <History className="mt-0.5 h-4 w-4 text-primary" />
        <div>
          <strong>Histórico completo de alterações de permissões.</strong> Toda mudança feita
          em "Atribuir papel" é registrada aqui automaticamente, com data, administrador e
          detalhes do dispositivo.
        </div>
      </div>

      {/* Filtros */}
      <div className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">De</label>
          <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPagina(1); }} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Até</label>
          <Input type="date" value={ate} onChange={(e) => { setAte(e.target.value); setPagina(1); }} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Usuário afetado</label>
          <Select value={filtroAfetado} onValueChange={(v) => { setFiltroAfetado(v); setPagina(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {afetados.map(([id, nome]) => (
                <SelectItem key={id} value={id}>{nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Administrador</label>
          <Select value={filtroAdmin} onValueChange={(v) => { setFiltroAdmin(v); setPagina(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {admins.map(([id, nome]) => (
                <SelectItem key={id} value={id}>{nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Tipo de mudança</label>
          <Select value={filtroTipo} onValueChange={(v) => { setFiltroTipo(v); setPagina(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="Criar">Criação</SelectItem>
              <SelectItem value="Editar">Alteração de Permissão</SelectItem>
              <SelectItem value="Excluir">Exclusão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs text-muted-foreground">Busca global</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome de usuário, descrição..."
              value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" className="flex-1" onClick={limparFiltros}>
            <RotateCcw className="mr-2 h-4 w-4" /> Limpar
          </Button>
          <Button onClick={exportar} disabled={filtrados.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário Afetado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Papel Novo</TableHead>
              <TableHead>Administrador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando...
              </TableCell></TableRow>
            ) : visiveis.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                Nenhum registro encontrado.
              </TableCell></TableRow>
            ) : visiveis.map((l) => {
              const t = tipoMudancaLabel(l.acao);
              const aberto = expandida === l.id;
              const nomeAfetado = afetados.find(([id]) => id === l.entidade_id)?.[1] ?? "—";
              const novoPapel = extrairPapelNovo(l.descricao);
              return (
                <>
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => setExpandida(aberto ? null : l.id)}>
                    <TableCell>{aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                    <TableCell className="text-sm">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{nomeAfetado}</TableCell>
                    <TableCell><Badge variant={t.variant}>{t.label}</Badge></TableCell>
                    <TableCell>{novoPapel ? <Badge variant="outline" className="capitalize">{novoPapel}</Badge> : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.user_nome ?? l.user_email ?? "—"}</TableCell>
                  </TableRow>
                  {aberto && (
                    <TableRow key={l.id + "-det"} className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={6} className="p-4">
                        <div className="grid gap-3 text-sm md:grid-cols-2">
                          <div>
                            <div className="text-xs uppercase text-muted-foreground">Usuário afetado</div>
                            <div className="font-medium">{nomeAfetado}</div>
                            <div className="text-xs text-muted-foreground">ID: {l.entidade_id}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase text-muted-foreground">Administrador</div>
                            <div className="font-medium">{l.user_nome ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{l.user_email ?? "—"}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase text-muted-foreground">Timestamp exato</div>
                            <div className="font-mono text-xs">{new Date(l.created_at).toISOString()}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase text-muted-foreground">Papel atribuído</div>
                            <div>{novoPapel ? <Badge variant="outline" className="capitalize">{novoPapel}</Badge> : "—"}</div>
                          </div>
                          <div className="md:col-span-2">
                            <div className="text-xs uppercase text-muted-foreground">Descrição</div>
                            <div>{l.descricao ?? "—"}</div>
                          </div>
                          {l.user_agent && (
                            <div className="md:col-span-2">
                              <div className="text-xs uppercase text-muted-foreground">Dispositivo</div>
                              <div className="break-all font-mono text-xs text-muted-foreground">{l.user_agent}</div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtrados.length > POR_PAGINA && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {pagina} de {totalPaginas} — {filtrados.length} registros
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}