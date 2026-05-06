import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Inbox, Clock, CheckCircle2, MessageCircle, User, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { atendimentoService, type Conversa, type ConversaStatus } from "../services/atendimentoService";
import { formatPhoneBR } from "@/shared/utils/phone";
import { toast } from "sonner";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDroppable,
  useDraggable, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";

const COLUNAS: Array<{ id: ConversaStatus; titulo: string; cor: string; icon: any }> = [
  { id: "Pendente", titulo: "Pendente", cor: "border-amber-500", icon: Inbox },
  { id: "Em atendimento", titulo: "Em atendimento", cor: "border-blue-500", icon: Clock },
  { id: "Atendido", titulo: "Atendido", cor: "border-green-500", icon: CheckCircle2 },
];

function tempoRel(iso?: string | null) {
  if (!iso) return "—";
  const m = (Date.now() - new Date(iso).getTime()) / 60000;
  if (m < 1) return "agora";
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Kanban() {
  const qc = useQueryClient();
  const { isAdmin } = useUserRole();
  const [busca, setBusca] = useState("");
  const [filtroDep, setFiltroDep] = useState<string>("todos");
  const [filtroAt, setFiltroAt] = useState<string>("todos");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const { data: departamentos = [] } = useQuery({
    queryKey: ["departamentos-ativos"],
    queryFn: () => atendimentoService.listarDepartamentos(),
  });
  const { data: atendentes = [] } = useQuery({
    queryKey: ["atendentes"],
    queryFn: () => atendimentoService.listarAtendentes(),
  });

  const { data: conversas = [] } = useQuery({
    queryKey: ["kanban-conversas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversas")
        .select("*")
        .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Conversa[];
    },
    refetchInterval: 15000,
  });

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conversas.filter((c) => {
      if (filtroDep !== "todos" && c.departamento_id !== filtroDep) return false;
      if (filtroAt === "sem" && c.atendente_id) return false;
      if (filtroAt !== "todos" && filtroAt !== "sem" && c.atendente_id !== filtroAt) return false;
      if (!q) return true;
      return (
        (c.contato_nome ?? "").toLowerCase().includes(q) ||
        c.telefone_digits.includes(q) ||
        (c.ultima_mensagem ?? "").toLowerCase().includes(q)
      );
    });
  }, [conversas, busca, filtroDep, filtroAt]);

  const porColuna = useMemo(() => {
    const map: Record<ConversaStatus, Conversa[]> = {
      "Pendente": [], "Em atendimento": [], "Atendido": [],
    };
    filtradas.forEach((c) => map[c.status as ConversaStatus]?.push(c));
    return map;
  }, [filtradas]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function moverStatus(conversaId: string, novo: ConversaStatus) {
    const conv = conversas.find((c) => c.id === conversaId);
    if (!conv || conv.status === novo) return;
    const update: any = { status: novo };
    if (novo === "Atendido" && !(conv as any).finalizada_em) update.finalizada_em = new Date().toISOString();
    if (novo === "Em atendimento" && !(conv as any).assumida_em) update.assumida_em = new Date().toISOString();
    qc.setQueryData<Conversa[]>(["kanban-conversas"], (old) =>
      (old ?? []).map((c) => (c.id === conversaId ? { ...c, status: novo } : c))
    );
    const { error } = await supabase.from("whatsapp_conversas").update(update).eq("id", conversaId);
    if (error) {
      toast.error("Falha ao atualizar status");
      qc.invalidateQueries({ queryKey: ["kanban-conversas"] });
    } else {
      qc.invalidateQueries({ queryKey: ["conversas"] });
      qc.invalidateQueries({ queryKey: ["conversas-pendentes-count"] });
    }
  }

  function onDragStart(e: DragStartEvent) { setDraggingId(String(e.active.id)); }
  function onDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    if (!e.over) return;
    const novo = String(e.over.id) as ConversaStatus;
    const id = String(e.active.id);
    if (!COLUNAS.some((c) => c.id === novo)) return;
    moverStatus(id, novo);
  }

  const dragging = draggingId ? conversas.find((c) => c.id === draggingId) ?? null : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b bg-card p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link to="/app/atendimento"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="mr-auto">
            <h1 className="text-lg font-bold">Kanban de Atendimento</h1>
            <p className="text-xs text-muted-foreground">Arraste os cards entre as colunas para mudar o status</p>
          </div>
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar contato…"
            className="h-9 w-56"
          />
          <Select value={filtroDep} onValueChange={setFiltroDep}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos departamentos</SelectItem>
              {departamentos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroAt} onValueChange={setFiltroAt}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos atendentes</SelectItem>
              <SelectItem value="sem">Sem atendente</SelectItem>
              {(atendentes as any[]).map((a) => (
                <SelectItem key={a.user_id} value={a.user_id}>{a.nome ?? a.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid flex-1 gap-3 overflow-hidden p-3 md:grid-cols-3">
          {COLUNAS.map((col) => (
            <Coluna
              key={col.id}
              col={col}
              cards={porColuna[col.id] ?? []}
              departamentos={departamentos}
              atendentes={atendentes as any[]}
            />
          ))}
        </div>
        <DragOverlay>
          {dragging && (
            <CardConversa c={dragging} departamentos={departamentos} atendentes={atendentes as any[]} dragging />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Coluna({
  col, cards, departamentos, atendentes,
}: {
  col: typeof COLUNAS[number];
  cards: Conversa[];
  departamentos: any[];
  atendentes: any[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const Icon = col.icon;
  return (
    <div ref={setNodeRef} className={`flex min-h-0 flex-col rounded-lg border-t-4 bg-muted/30 ${col.cor} ${isOver ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-semibold">{col.titulo}</span>
        </div>
        <Badge variant="secondary">{cards.length}</Badge>
      </div>
      <ScrollArea className="flex-1 px-2 pb-2">
        <div className="space-y-2">
          {cards.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhuma conversa</p>
          )}
          {cards.map((c) => (
            <CardConversa key={c.id} c={c} departamentos={departamentos} atendentes={atendentes} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function CardConversa({
  c, departamentos, atendentes, dragging,
}: {
  c: Conversa;
  departamentos: any[];
  atendentes: any[];
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: c.id });
  const dep = departamentos.find((d) => d.id === c.departamento_id);
  const at = atendentes.find((a) => a.user_id === c.atendente_id);
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab p-3 active:cursor-grabbing ${isDragging || dragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Link
          to={`/app/atendimento`}
          className="truncate text-sm font-semibold hover:underline"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {c.contato_nome ?? formatPhoneBR(c.telefone)}
        </Link>
        {(c.nao_lidas ?? 0) > 0 && (
          <Badge className="h-5 min-w-[20px] justify-center bg-amber-500 px-1.5 text-[10px] text-white hover:bg-amber-500">
            {c.nao_lidas}
          </Badge>
        )}
      </div>
      {c.contato_nome && (
        <p className="text-[11px] text-muted-foreground">{formatPhoneBR(c.telefone)}</p>
      )}
      {c.ultima_mensagem && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.ultima_mensagem}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {dep && (
          <Badge variant="outline" className="gap-1 text-[10px]" style={{ borderColor: dep.cor, color: dep.cor }}>
            <Building2 className="h-2.5 w-2.5" /> {dep.nome}
          </Badge>
        )}
        {at ? (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <User className="h-2.5 w-2.5" /> {at.nome ?? at.email}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">Sem atendente</Badge>
        )}
        {(c.tags ?? []).slice(0, 2).map((t) => (
          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          <MessageCircle className="mr-1 inline h-2.5 w-2.5" />
          {tempoRel(c.ultima_mensagem_em ?? c.created_at)}
        </span>
      </div>
    </Card>
  );
}