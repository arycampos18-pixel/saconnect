import { useCallback, useMemo, useRef } from "react";
import { generateUUID } from "@/shared/utils/uuid";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, Sparkles, Zap } from "lucide-react";
import {
  ACAO_PRESETS,
  CONDICAO_PRESETS,
  NODE_TYPES,
  TRIGGER_PRESETS,
} from "./nodeTypes";

type Props = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (n: Node[]) => void;
  onEdgesChange: (e: Edge[]) => void;
};

export default function AutomacaoBuilder({ nodes, edges, onNodesChange, onEdgesChange }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => onNodesChange(applyNodeChanges(changes, nodes)),
    [nodes, onNodesChange],
  );
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => onEdgesChange(applyEdgeChanges(changes, edges)),
    [edges, onEdgesChange],
  );
  const handleConnect = useCallback(
    (conn: Connection) => onEdgesChange(addEdge({ ...conn, animated: true }, edges)),
    [edges, onEdgesChange],
  );

  const onDragStart = (e: React.DragEvent, payload: any) => {
    e.dataTransfer.setData("application/sa-node", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!wrapperRef.current || !rfInstance.current) return;
    const raw = e.dataTransfer.getData("application/sa-node");
    if (!raw) return;
    const payload = JSON.parse(raw);
    const bounds = wrapperRef.current.getBoundingClientRect();
    const position = rfInstance.current.project({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });
    const newNode: Node = {
      id: `${payload.kind}-${generateUUID().slice(0, 6)}`,
      type: payload.kind,
      position,
      data: payload.data,
    };
    // Apenas um trigger permitido
    const next =
      payload.kind === "trigger"
        ? [...nodes.filter((n) => n.type !== "trigger"), newNode]
        : [...nodes, newNode];
    onNodesChange(next);
  };

  const palette = useMemo(
    () => [
      {
        title: "Triggers",
        icon: Zap,
        color: "text-sky-600",
        items: TRIGGER_PRESETS.map((t) => ({
          kind: "trigger" as const,
          data: { label: t.label, descricao: t.descricao, triggerTipo: t.tipo },
        })),
      },
      {
        title: "Condições",
        icon: GitBranch,
        color: "text-amber-600",
        items: CONDICAO_PRESETS.map((c) => ({
          kind: "condicao" as const,
          data: { label: c.label, descricao: c.descricao, condicaoTipo: c.key },
        })),
      },
      {
        title: "Ações",
        icon: Sparkles,
        color: "text-primary",
        items: ACAO_PRESETS.map((a) => ({
          kind: "acao" as const,
          data: { label: a.label, descricao: a.descricao, acaoTipo: a.acaoTipo, params: {} },
        })),
      },
    ],
    [],
  );

  return (
    <div className="grid h-[640px] grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
      <Card className="overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-3">
            {palette.map((group) => (
              <div key={group.title}>
                <div className={`mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${group.color}`}>
                  <group.icon className="h-3.5 w-3.5" />
                  {group.title}
                </div>
                <div className="space-y-1.5">
                  {group.items.map((it, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => onDragStart(e, it)}
                      className="cursor-grab rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:border-primary hover:bg-accent active:cursor-grabbing"
                    >
                      <div className="font-semibold">{it.data.label}</div>
                      <div className="text-[11px] text-muted-foreground">{it.data.descricao}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">
              Arraste itens para o canvas. Conecte os pontos para criar o fluxo.
            </p>
          </div>
        </ScrollArea>
      </Card>

      <div ref={wrapperRef} className="overflow-hidden rounded-lg border border-border bg-muted/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onInit={(inst) => (rfInstance.current = inst)}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background gap={16} color="#DBEAFE" />
          <MiniMap pannable zoomable className="!bg-white" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}