import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Play, Save, Zap } from "lucide-react";
import type { Edge, Node } from "reactflow";
import { toast } from "sonner";
import AutomacaoBuilder from "../builder/AutomacaoBuilder";
import {
  automacaoService,
  type Automacao,
  type AutomacaoStatus,
  type TriggerTipo,
} from "../services/automacaoService";

const TRIGGER_OPTIONS: { value: TriggerTipo; label: string }[] = [
  { value: "novo_eleitor", label: "Novo eleitor cadastrado" },
  { value: "eleitor_respondeu_pesquisa", label: "Eleitor respondeu pesquisa" },
  { value: "eleitor_participou_evento", label: "Participou de evento" },
  { value: "aniversario_eleitor", label: "Aniversário do eleitor" },
  { value: "data_especifica", label: "Data específica" },
  { value: "manual", label: "Execução manual" },
];

export default function AutomacaoEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [auto, setAuto] = useState<Automacao | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    automacaoService
      .obter(id)
      .then((a) => {
        setAuto(a);
        setNodes(a.nodes as unknown as Node[]);
        setEdges(a.edges as unknown as Edge[]);
      })
      .catch((e) => toast.error(e?.message ?? "Erro ao carregar."));
  }, [id]);

  async function salvar(novoStatus?: AutomacaoStatus) {
    if (!auto || !id) return;
    setSaving(true);
    try {
      await automacaoService.salvar(id, {
        nome: auto.nome,
        descricao: auto.descricao,
        trigger_tipo: auto.trigger_tipo,
        trigger_config: auto.trigger_config,
        nodes: nodes as any,
        edges: edges as any,
        status: novoStatus ?? auto.status,
      });
      toast.success("Automação salva.");
      if (novoStatus) setAuto({ ...auto, status: novoStatus });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function executar() {
    if (!id) return;
    try {
      await automacaoService.executarManual(id);
      toast.success("Executado com sucesso.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao executar.");
    }
  }

  if (!auto) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando editor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/automacoes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
              <Zap className="h-6 w-6 text-primary" /> Editor de automação
            </h1>
            <p className="text-xs text-muted-foreground">{auto.status}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={executar} className="gap-2">
            <Play className="h-4 w-4" /> Testar
          </Button>
          {auto.status !== "Ativa" ? (
            <Button variant="outline" onClick={() => salvar("Ativa")} disabled={saving} className="gap-2">
              Ativar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => salvar("Pausada")} disabled={saving} className="gap-2">
              Pausar
            </Button>
          )}
          <Button onClick={() => salvar()} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label>Nome</Label>
            <Input value={auto.nome} onChange={(e) => setAuto({ ...auto, nome: e.target.value })} />
          </div>
          <div>
            <Label>Trigger principal</Label>
            <Select
              value={auto.trigger_tipo}
              onValueChange={(v) => setAuto({ ...auto, trigger_tipo: v as TriggerTipo })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label>Descrição (opcional)</Label>
            <Textarea
              rows={2}
              value={auto.descricao ?? ""}
              onChange={(e) => setAuto({ ...auto, descricao: e.target.value })}
              placeholder="Ex: Boas-vindas para novos eleitores cadastrados pelo formulário público."
            />
          </div>
        </CardContent>
      </Card>

      <AutomacaoBuilder
        nodes={nodes}
        edges={edges}
        onNodesChange={setNodes}
        onEdgesChange={setEdges}
      />

      <p className="text-[11px] text-muted-foreground">
        Dica: arraste um <span className="font-semibold text-sky-600">Trigger</span>, conecte com{" "}
        <span className="font-semibold text-amber-600">Condições</span> e termine com{" "}
        <span className="font-semibold text-primary">Ações</span>. Use Backspace para remover nós/conexões.
      </p>
    </div>
  );
}