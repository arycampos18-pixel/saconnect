import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, X, Loader2, Save, Wand2, RotateCcw, Users as UsersIcon, Download, GripVertical } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { MODULOS_CATALOGO, PRESETS_DEFAULT, TODOS_IDS } from "../data/modulosCatalogo";
import { permissoesService } from "../services/permissoesService";
import { cadastrosService, type AppRole } from "../services/cadastrosService";
import { auditoriaService } from "@/modules/auditoria/services/auditoriaService";
import { downloadCSV, toCSV } from "@/shared/utils/csv";

type PerfilKey = AppRole | "visualizador";

const PERFIS: { value: PerfilKey; label: string; descricao: string }[] = [
  { value: "admin", label: "Administrador", descricao: "Acesso total" },
  { value: "lideranca", label: "Coordenador / Liderança", descricao: "Acesso à maioria dos módulos" },
  { value: "operador", label: "Operador", descricao: "Acesso limitado ao operacional" },
  { value: "visualizador", label: "Visualizador", descricao: "Acesso somente leitura (preset local)" },
];

type Usuario = { user_id: string; nome: string | null; email: string | null; roles: string[] };

type ColunaId = "disponiveis" | "permitidos" | "selecionados";

function DraggableItem({
  id,
  coluna,
  children,
}: {
  id: string;
  coluna: ColunaId;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${coluna}:${id}`,
    data: { moduloId: id, coluna },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="touch-none"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-3 flex h-8 w-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function DroppableColumn({
  id,
  children,
  className = "",
}: {
  id: ColunaId;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className} rounded-md transition-colors ${isOver ? "ring-2 ring-primary ring-offset-2" : ""}`}
    >
      {children}
    </div>
  );
}

export function ModulosManager() {
  const [perfil, setPerfil] = useState<PerfilKey>("lideranca");
  const [permitidos, setPermitidos] = useState<string[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [openAplicar, setOpenAplicar] = useState(false);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  async function carregar(p: PerfilKey) {
    setLoading(true);
    try {
      let lista: string[];
      if (p === "visualizador") {
        // visualizador é um preset local — não persistido como app_role
        lista = PRESETS_DEFAULT.visualizador;
      } else {
        lista = await permissoesService.getModulosPorRole(p);
      }
      setPermitidos(lista);
      setSelecionados([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(perfil); }, [perfil]);
  useEffect(() => {
    cadastrosService.listarUsuarios().then((u) => setUsuarios(u as any));
  }, []);

  const disponiveis = useMemo(
    () => MODULOS_CATALOGO.filter((m) => !permitidos.includes(m.id) && !selecionados.includes(m.id)),
    [permitidos, selecionados]
  );

  function moverPara(moduloId: string, origem: ColunaId, destino: ColunaId) {
    if (origem === destino) return;
    // Remover da origem
    if (origem === "permitidos") setPermitidos((p) => p.filter((x) => x !== moduloId));
    if (origem === "selecionados") setSelecionados((s) => s.filter((x) => x !== moduloId));
    // Adicionar no destino
    if (destino === "permitidos") setPermitidos((p) => (p.includes(moduloId) ? p : [...p, moduloId]));
    if (destino === "selecionados") setSelecionados((s) => (s.includes(moduloId) ? s : [...s, moduloId]));
    // disponiveis é derivado — nada a fazer
  }

  function adicionar(id: string) { moverPara(id, "disponiveis", "selecionados"); }
  function removerSelecionado(id: string) { setSelecionados((s) => s.filter((x) => x !== id)); }
  function removerPermitido(id: string) { setPermitidos((p) => p.filter((x) => x !== id)); }

  function handleDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id));
  }
  function handleDragEnd(e: DragEndEvent) {
    setDragId(null);
    const { active, over } = e;
    if (!over) return;
    const data = active.data.current as { moduloId: string; coluna: ColunaId } | undefined;
    if (!data) return;
    const destino = over.id as ColunaId;
    if (!["disponiveis", "permitidos", "selecionados"].includes(destino)) return;
    moverPara(data.moduloId, data.coluna, destino);
  }

  const dragModulo = dragId
    ? MODULOS_CATALOGO.find((m) => m.id === dragId.split(":")[1])
    : null;

  function aplicarPreset(p: PerfilKey) {
    setPermitidos(PRESETS_DEFAULT[p] ?? []);
    setSelecionados([]);
    toast.success(`Preset "${PERFIS.find((x) => x.value === p)?.label}" carregado`);
  }

  const final = useMemo(
    () => Array.from(new Set([...permitidos, ...selecionados])),
    [permitidos, selecionados]
  );

  async function salvar() {
    if (final.length === 0) {
      toast.error("Selecione ao menos 1 módulo antes de salvar.");
      return;
    }
    if (perfil === "visualizador") {
      toast.info('"Visualizador" é um preset de UI — aplique a usuários específicos via "Aplicar a usuários".');
      return;
    }
    setSalvando(true);
    try {
      const anterior = await permissoesService.getModulosPorRole(perfil);
      await permissoesService.salvarRoleModulos(perfil, final);
      const adicionados = final.filter((m) => !anterior.includes(m));
      const removidos = anterior.filter((m) => !final.includes(m));
      await auditoriaService.registrar({
        acao: "Editar",
        entidade: "role_modulos",
        entidade_id: perfil,
        descricao: `Permissões do perfil ${perfil} atualizadas (+${adicionados.length} / -${removidos.length})`,
        modulo: "Cadastros",
        dados_anteriores: { modulos: anterior },
        dados_novos: { modulos: final, adicionados, removidos },
      });
      toast.success(`Permissões do perfil ${perfil} atualizadas`);
      await carregar(perfil);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  function resetar() {
    setPermitidos(PRESETS_DEFAULT[perfil] ?? []);
    setSelecionados([]);
    toast.info("Restaurado para o padrão (não salvo)");
  }

  async function aplicarAUsuarios() {
    if (usuariosSelecionados.length === 0) {
      toast.error("Selecione ao menos um usuário.");
      return;
    }
    if (final.length === 0) {
      toast.error("Selecione ao menos um módulo.");
      return;
    }
    try {
      for (const uid of usuariosSelecionados) {
        await permissoesService.salvarOverride(uid, final);
        await auditoriaService.registrar({
          acao: "Editar",
          entidade: "user_modulos_override",
          entidade_id: uid,
          descricao: `Override de módulos aplicado (${final.length} módulos do preset ${perfil})`,
          modulo: "Cadastros",
          dados_novos: { modulos: final, perfil_origem: perfil },
        });
      }
      toast.success(`Aplicado a ${usuariosSelecionados.length} usuário(s)`);
      setOpenAplicar(false);
      setUsuariosSelecionados([]);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao aplicar");
    }
  }

  function exportarRelatorio() {
    const rows = MODULOS_CATALOGO.map((m) => ({
      "ID": m.id,
      "Módulo": m.nome,
      "Descrição": m.descricao,
      "No perfil atual": final.includes(m.id) ? "Sim" : "Não",
    }));
    downloadCSV(`permissoes-${perfil}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  }

  return (
    <div className="space-y-5">
      {/* Seção 1: seleção de perfil + presets */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Perfil</label>
            <Select value={perfil} onValueChange={(v) => setPerfil(v as PerfilKey)}>
              <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERFIS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex flex-col items-start">
                      <span>{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.descricao}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERFIS.map((p) => (
              <Button key={p.value} size="sm" variant="outline"
                onClick={() => aplicarPreset(p.value)}>
                <Wand2 className="mr-1 h-3.5 w-3.5" /> {p.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando módulos...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragId(null)}
        >
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5" /> Arraste pelo ícone para mover entre as colunas.
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {/* Coluna 1: disponíveis */}
          <DroppableColumn id="disponiveis">
          <Card className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Disponíveis</h4>
              <Badge variant="outline">{disponiveis.length}</Badge>
            </div>
            <ScrollArea className="h-[460px] pr-2">
              <div className="space-y-2">
                {disponiveis.map((m) => (
                  <DraggableItem key={m.id} id={m.id} coluna="disponiveis">
                    <div className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-shadow hover:shadow-elegant-sm">
                      <m.icon className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{m.nome}</div>
                        <div className="truncate text-xs text-muted-foreground">{m.descricao}</div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => adicionar(m.id)} aria-label={`Adicionar ${m.nome}`}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </DraggableItem>
                ))}
                {disponiveis.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Todos os módulos já estão permitidos.</p>
                )}
              </div>
            </ScrollArea>
          </Card>
          </DroppableColumn>

          {/* Coluna 2: permitidos */}
          <DroppableColumn id="permitidos">
          <Card className="border-success/40 bg-success/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Permitidos</h4>
              <Badge>{permitidos.length}</Badge>
            </div>
            <ScrollArea className="h-[460px] pr-2">
              <div className="space-y-2">
                {permitidos.map((id) => {
                  const m = MODULOS_CATALOGO.find((x) => x.id === id);
                  if (!m) return null;
                  return (
                    <DraggableItem key={id} id={id} coluna="permitidos">
                      <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
                        <m.icon className="mt-0.5 h-5 w-5 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{m.nome}</div>
                          <div className="truncate text-xs text-muted-foreground">{m.descricao}</div>
                        </div>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={`Remover ${m.nome}`}>
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover módulo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Usuários com o perfil <strong>{perfil}</strong> perderão acesso ao módulo
                              <strong> {m.nome}</strong> ao salvar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removerPermitido(id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </DraggableItem>
                  );
                })}
                {permitidos.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum módulo permitido.</p>
                )}
              </div>
            </ScrollArea>
          </Card>
          </DroppableColumn>

          {/* Coluna 3: selecionados nesta sessão */}
          <DroppableColumn id="selecionados">
          <Card className="border-primary/40 bg-primary/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Adicionando agora</h4>
              <Badge variant="default">{selecionados.length}</Badge>
            </div>
            <ScrollArea className="h-[460px] pr-2">
              <div className="space-y-2">
                {selecionados.map((id) => {
                  const m = MODULOS_CATALOGO.find((x) => x.id === id);
                  if (!m) return null;
                  return (
                    <DraggableItem key={id} id={id} coluna="selecionados">
                      <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
                        <m.icon className="mt-0.5 h-5 w-5 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{m.nome}</div>
                          <div className="truncate text-xs text-muted-foreground">{m.descricao}</div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removerSelecionado(id)} aria-label={`Cancelar ${m.nome}`}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </DraggableItem>
                  );
                })}
                {selecionados.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Adicione módulos da coluna "Disponíveis".
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>
          </DroppableColumn>
        </div>
        <DragOverlay>
          {dragModulo ? (
            <div className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-lg">
              <dragModulo.icon className="mt-0.5 h-5 w-5 text-primary" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{dragModulo.nome}</div>
                <div className="truncate text-xs text-muted-foreground">{dragModulo.descricao}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      )}

      {/* Ações */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
        <div className="text-sm text-muted-foreground">
          Resultado final: <strong className="text-foreground">{final.length}</strong> de {TODOS_IDS.length} módulos
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportarRelatorio}>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <Button variant="outline" onClick={resetar}>
            <RotateCcw className="mr-2 h-4 w-4" /> Resetar para padrão
          </Button>

          <Dialog open={openAplicar} onOpenChange={setOpenAplicar}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <UsersIcon className="mr-2 h-4 w-4" /> Aplicar a usuários
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Aplicar permissões a usuários</DialogTitle>
                <DialogDescription>
                  Cria um override de módulos para cada usuário selecionado, com a lista atual ({final.length} módulos).
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[320px] rounded border p-2">
                <div className="space-y-1">
                  {usuarios.map((u) => (
                    <label key={u.user_id} className="flex items-center gap-2 rounded p-2 hover:bg-muted/40">
                      <Checkbox
                        checked={usuariosSelecionados.includes(u.user_id)}
                        onCheckedChange={(v) => {
                          setUsuariosSelecionados((arr) =>
                            v ? [...arr, u.user_id] : arr.filter((x) => x !== u.user_id)
                          );
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{u.nome ?? "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      {u.roles[0] && <Badge variant="outline" className="capitalize">{u.roles[0]}</Badge>}
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenAplicar(false)}>Cancelar</Button>
                <Button onClick={aplicarAUsuarios}>Aplicar a {usuariosSelecionados.length} usuário(s)</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}