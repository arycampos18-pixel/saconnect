import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Megaphone, Star, Download, Search, Loader2, Building2, MoreHorizontal, Eye, Pencil, Ban, RotateCcw, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import { cadastrosService } from "../services/cadastrosService";
import { NovoUsuarioForm } from "../components/NovoUsuarioForm";
import { NovoCaboForm } from "../components/NovoCaboForm";
import { NovaLiderancaForm } from "../components/NovaLiderancaForm";
import { NovaOrganizacaoForm } from "../components/NovaOrganizacaoForm";
import { PermissoesPanel } from "../components/PermissoesPanel";
import { ModulosManager } from "../components/ModulosManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCSV, toCSV } from "@/shared/utils/csv";
import { CadastroAcoesDialog, type CadastroAcao, type CadastroTipo } from "../components/CadastroAcoesDialog";
import { cn } from "@/lib/utils";

type Resumo = { usuarios: number; cabos: number; liderancas: number; organizacoes: number };
type LinhaTabela = {
  id: string;
  nome: string;
  tipo: "Usuário" | "Cabo" | "Liderança" | "Organização";
  status: "Ativo" | "Inativo";
  created_at: string;
};

export default function Cadastros() {
  const { isAdmin, loading: loadingRole } = useUserRole();
  const [resumo, setResumo] = useState<Resumo>({ usuarios: 0, cabos: 0, liderancas: 0, organizacoes: 0 });
  const [linhas, setLinhas] = useState<LinhaTabela[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const porPagina = 10;

  const [dialog, setDialog] = useState<{
    open: boolean;
    tipo: CadastroTipo | null;
    id: string | null;
    acao: CadastroAcao | null;
    statusAtual: "Ativo" | "Inativo";
  }>({ open: false, tipo: null, id: null, acao: null, statusAtual: "Ativo" });

  function abrirAcao(linha: LinhaTabela, acao: CadastroAcao) {
    if ((acao === "editar" || acao === "inativar") && !isAdmin) return;
    setDialog({ open: true, tipo: linha.tipo, id: linha.id, acao, statusAtual: linha.status });
  }

  async function carregar() {
    setCarregando(true);
    try {
      const [r, usuarios, cabos, lids, orgs] = await Promise.all([
        cadastrosService.metricasResumo(),
        cadastrosService.listarUsuarios(),
        cadastrosService.listarCabos(),
        cadastrosService.listarLiderancas(),
        cadastrosService.listarOrganizacoes(),
      ]);
      setResumo(r);
      const t: LinhaTabela[] = [
        ...usuarios.map((u: any) => ({
          id: u.id, nome: u.nome ?? u.email ?? "—",
          tipo: "Usuário" as const, status: u.ativo === false ? "Inativo" as const : "Ativo" as const, created_at: u.created_at,
        })),
        ...cabos.map((c) => ({
          id: c.id, nome: c.nome,
          tipo: "Cabo" as const, status: c.ativo ? "Ativo" as const : "Inativo" as const,
          created_at: c.created_at,
        })),
        ...lids.map((l) => ({
          id: l.id, nome: l.nome,
          tipo: "Liderança" as const, status: l.ativo ? "Ativo" as const : "Inativo" as const,
          created_at: l.created_at,
        })),
        ...orgs.map((o) => ({
          id: o.id, nome: o.nome,
          tipo: "Organização" as const, status: o.ativo ? "Ativo" as const : "Inativo" as const,
          created_at: o.created_at,
        })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setLinhas(t);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    return linhas.filter((l) => {
      if (filtroTipo !== "todos" && l.tipo !== filtroTipo) return false;
      if (busca && !l.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [linhas, busca, filtroTipo]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const visiveis = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  function exportar() {
    const csv = toCSV(
      filtradas.map((l) => ({
        Nome: l.nome,
        Tipo: l.tipo,
        Status: l.status,
        "Cadastrado em": new Date(l.created_at).toLocaleString("pt-BR"),
      })),
    );
    downloadCSV(`cadastros-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando permissões...
      </div>
    );
  }
  // Não-admins podem visualizar a página, mas não alterar nada

  const cards = [
    { label: "Usuários", value: resumo.usuarios, icon: Users, tipo: "Usuário" as const },
    { label: "Lideranças", value: resumo.liderancas, icon: Star, tipo: "Liderança" as const },
    { label: "Cabos Eleitorais", value: resumo.cabos, icon: Megaphone, tipo: "Cabo" as const },
    { label: "Organizações", value: resumo.organizacoes, icon: Building2, tipo: "Organização" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cadastros</h1>
        <p className="text-sm text-muted-foreground">
          Painel administrativo para gerenciar usuários, lideranças e cabos eleitorais.
        </p>
      </div>

      {!isAdmin && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Modo <strong>somente leitura</strong>. Apenas administradores podem criar, editar ou inativar cadastros.
          </span>
        </div>
      )}

      <Accordion type="multiple" defaultValue={["overview"]} className="space-y-3">
        {/* 1. VISÃO GERAL */}
        <AccordionItem value="overview" className="rounded-xl border bg-card px-4">
          <AccordionTrigger className="text-base font-semibold">Cadastros (Visão Geral)</AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {cards.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => { setFiltroTipo(c.tipo); setPagina(1); }}
                  className={cn(
                    "rounded-xl border bg-card text-left transition-all hover:border-primary/40 hover:shadow-elegant-md",
                    filtroTipo === c.tipo && "border-primary/60 ring-2 ring-primary/15",
                  )}
                  aria-pressed={filtroTipo === c.tipo}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <c.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total de {c.label}</div>
                      <div className="text-xl font-semibold">{c.value}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nome..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filtroTipo} onValueChange={(v) => { setFiltroTipo(v); setPagina(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="Usuário">Usuários</SelectItem>
                    <SelectItem value="Liderança">Lideranças</SelectItem>
                    <SelectItem value="Cabo">Cabos</SelectItem>
                    <SelectItem value="Organização">Organizações</SelectItem>
                  </SelectContent>
                </Select>
                {filtroTipo !== "todos" && (
                  <Button variant="ghost" size="sm" onClick={() => { setFiltroTipo("todos"); setPagina(1); }}>
                    Limpar filtro
                  </Button>
                )}
                <Button variant="outline" onClick={exportar}>
                  <Download className="mr-2 h-4 w-4" /> Exportar
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="w-[80px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carregando ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : visiveis.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum cadastro encontrado.</TableCell></TableRow>
                  ) : visiveis.map((l) => (
                    <TableRow key={`${l.tipo}-${l.id}`}>
                      <TableCell className="font-medium">{l.nome}</TableCell>
                      <TableCell><Badge variant="outline">{l.tipo}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={l.status === "Ativo" ? "default" : "secondary"}>{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(l.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => abrirAcao(l, "ver")}>
                              <Eye className="mr-2 h-4 w-4" /> Visualizar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => abrirAcao(l, "editar")}
                                >
                                  <Pencil className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => abrirAcao(l, "inativar")}
                                  className={l.status === "Ativo" ? "text-destructive focus:text-destructive" : ""}
                                >
                                  {l.status === "Ativo" ? (
                                    <><Ban className="mr-2 h-4 w-4" /> Inativar</>
                                  ) : (
                                    <><RotateCcw className="mr-2 h-4 w-4" /> Reativar</>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filtradas.length > porPagina && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Página {pagina} de {totalPaginas} — {filtradas.length} registros
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}>
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {isAdmin && (
          <>
            {/* 2. NOVO USUÁRIO */}
            <AccordionItem value="usuario" className="rounded-xl border bg-card px-4">
              <AccordionTrigger className="text-base font-semibold">Novo Usuário do Sistema</AccordionTrigger>
              <AccordionContent className="pt-2">
                <NovoUsuarioForm onCreated={carregar} />
              </AccordionContent>
            </AccordionItem>

            {/* 3. LIDERANÇA */}
            <AccordionItem value="lideranca" className="rounded-xl border bg-card px-4">
              <AccordionTrigger className="text-base font-semibold">Nova Liderança</AccordionTrigger>
              <AccordionContent className="pt-2">
                <NovaLiderancaForm onCreated={carregar} />
              </AccordionContent>
            </AccordionItem>

            {/* 4. CABO ELEITORAL */}
            <AccordionItem value="cabo" className="rounded-xl border bg-card px-4">
              <AccordionTrigger className="text-base font-semibold">Novo Cabo Eleitoral</AccordionTrigger>
              <AccordionContent className="pt-2">
                <NovoCaboForm onCreated={carregar} />
              </AccordionContent>
            </AccordionItem>

            {/* 5. ORGANIZAÇÃO / GABINETE */}
            <AccordionItem value="organizacao" className="rounded-xl border bg-card px-4">
              <AccordionTrigger className="text-base font-semibold">Nova Organização / Gabinete</AccordionTrigger>
              <AccordionContent className="pt-2">
                <NovaOrganizacaoForm onCreated={carregar} />
              </AccordionContent>
            </AccordionItem>

            {/* 6. PERMISSÕES */}
            <AccordionItem value="permissoes" className="rounded-xl border bg-card px-4">
              <AccordionTrigger className="text-base font-semibold">Gerenciar Permissões</AccordionTrigger>
              <AccordionContent className="pt-2">
                <Tabs defaultValue="atribuir" className="w-full">
                  <TabsList>
                    <TabsTrigger value="atribuir">Atribuir papel</TabsTrigger>
                    <TabsTrigger value="modulos">Gerenciar Módulos por Perfil</TabsTrigger>
                  </TabsList>
                  <TabsContent value="atribuir" className="mt-4">
                    <PermissoesPanel />
                  </TabsContent>
                  <TabsContent value="modulos" className="mt-4">
                    <ModulosManager />
                  </TabsContent>
                </Tabs>
              </AccordionContent>
            </AccordionItem>
          </>
        )}

      </Accordion>

      <CadastroAcoesDialog
        open={dialog.open}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        tipo={dialog.tipo}
        id={dialog.id}
        acao={dialog.acao}
        statusAtual={dialog.statusAtual}
        onChanged={carregar}
      />
    </div>
  );
}