import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Trash2, MessageSquare, ListTree, KeyRound, ArrowRightLeft, Power, Loader2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { chatbotService, type ChatbotNo, type FluxoNoTipo, type OpcaoMenu } from "../services/chatbotService";
import { departamentoService } from "@/modules/atendimento/services/departamentoService";

const TIPO_LABEL: Record<FluxoNoTipo, string> = {
  mensagem: "Mensagem", menu: "Menu de opções", coleta: "Coletar dado",
  encaminhar: "Encaminhar p/ atendente", encerrar: "Encerrar conversa",
};
const TIPO_ICON: Record<FluxoNoTipo, any> = {
  mensagem: MessageSquare, menu: ListTree, coleta: KeyRound,
  encaminhar: ArrowRightLeft, encerrar: Power,
};

export default function ChatbotEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selecionado, setSelecionado] = useState<ChatbotNo | null>(null);

  const { data: fluxo } = useQuery({
    queryKey: ["chatbot-fluxo", id], queryFn: () => chatbotService.obterFluxo(id!), enabled: !!id,
  });
  const { data: nos, isLoading } = useQuery({
    queryKey: ["chatbot-nos", id], queryFn: () => chatbotService.listarNos(id!), enabled: !!id,
  });
  const { data: deps } = useQuery({
    queryKey: ["departamentos"], queryFn: () => departamentoService.listarTodos(),
  });

  useEffect(() => {
    if (!selecionado && nos && nos.length > 0) setSelecionado(nos[0]);
  }, [nos, selecionado]);

  const adicionar = async (tipo: FluxoNoTipo) => {
    const novo = await chatbotService.criarNo({
      fluxo_id: id!, nome: TIPO_LABEL[tipo], tipo, ordem: (nos?.length ?? 0),
      mensagem: tipo === "menu"
        ? "Olá! Como podemos ajudar?\n\n1 - Opção A\n2 - Opção B"
        : tipo === "coleta" ? "Por favor, me informe seu CPF:"
        : tipo === "encaminhar" ? "Você será atendido em instantes."
        : tipo === "encerrar" ? "Obrigado! Tenha um bom dia." : "Mensagem...",
      opcoes: tipo === "menu" ? [{ tecla: "1", label: "Opção A" }, { tecla: "2", label: "Opção B" }] : [],
    });
    qc.invalidateQueries({ queryKey: ["chatbot-nos", id] });
    setSelecionado(novo);
  };

  const remover = async (n: ChatbotNo) => {
    if (!confirm("Remover este nó?")) return;
    await chatbotService.removerNo(n.id);
    if (selecionado?.id === n.id) setSelecionado(null);
    qc.invalidateQueries({ queryKey: ["chatbot-nos", id] });
  };

  const definirComoInicial = async (n: ChatbotNo) => {
    await chatbotService.atualizarFluxo(id!, { no_inicial_id: n.id });
    qc.invalidateQueries({ queryKey: ["chatbot-fluxo", id] });
    toast.success(`"${n.nome}" definido como nó inicial`);
  };

  if (isLoading || !fluxo) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/chatbot")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold">{fluxo.nome}</h1>
            <p className="text-xs text-muted-foreground">
              {fluxo.no_inicial_id
                ? "Nó inicial definido"
                : "Defina um nó inicial (estrela) para o bot começar."}
            </p>
          </div>
        </div>
        <Badge variant={fluxo.ativo ? "default" : "secondary"}>{fluxo.ativo ? "Ativo" : "Inativo"}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Lista de nós */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nós do fluxo</CardTitle>
            <div className="flex flex-wrap gap-1 pt-2">
              {(["menu","mensagem","coleta","encaminhar","encerrar"] as FluxoNoTipo[]).map((t) => {
                const Icon = TIPO_ICON[t];
                return (
                  <Button key={t} size="sm" variant="outline" className="h-7 text-xs" onClick={() => adicionar(t)}>
                    <Plus className="mr-1 h-3 w-3" /><Icon className="mr-1 h-3 w-3" />{TIPO_LABEL[t]}
                  </Button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {(nos ?? []).map((n) => {
              const Icon = TIPO_ICON[n.tipo];
              const isInicial = fluxo.no_inicial_id === n.id;
              const ativo = selecionado?.id === n.id;
              return (
                <div key={n.id}
                  className={`group flex items-center gap-2 rounded border p-2 cursor-pointer text-sm transition ${
                    ativo ? "bg-primary/10 border-primary" : "hover:bg-muted"
                  }`}
                  onClick={() => setSelecionado(n)}>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 truncate">
                    <div className="truncate font-medium">{n.nome}</div>
                    <div className="truncate text-xs text-muted-foreground">{TIPO_LABEL[n.tipo]}</div>
                  </div>
                  {isInicial && <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />}
                </div>
              );
            })}
            {(nos ?? []).length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">Adicione um nó para começar</p>
            )}
          </CardContent>
        </Card>

        {/* Editor do nó selecionado */}
        {selecionado ? (
          <EditorNo
            no={selecionado}
            nos={nos ?? []}
            departamentos={deps ?? []}
            isInicial={fluxo.no_inicial_id === selecionado.id}
            onDefinirInicial={() => definirComoInicial(selecionado)}
            onRemover={() => remover(selecionado)}
            onSaved={() => qc.invalidateQueries({ queryKey: ["chatbot-nos", id] })}
          />
        ) : (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
            Selecione um nó à esquerda para editar.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

function EditorNo({
  no, nos, departamentos, isInicial, onDefinirInicial, onRemover, onSaved,
}: {
  no: ChatbotNo; nos: ChatbotNo[]; departamentos: any[];
  isInicial: boolean;
  onDefinirInicial: () => void; onRemover: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<ChatbotNo>(no);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setForm(no), [no.id]);

  const outros = useMemo(() => nos.filter((n) => n.id !== no.id), [nos, no.id]);

  const salvar = async () => {
    setSalvando(true);
    try {
      const { id, fluxo_id, ...patch } = form;
      await chatbotService.atualizarNo(no.id, patch);
      toast.success("Nó salvo");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSalvando(false); }
  };

  const updateOpcao = (i: number, patch: Partial<OpcaoMenu>) => {
    const arr = [...(form.opcoes ?? [])]; arr[i] = { ...arr[i], ...patch };
    setForm({ ...form, opcoes: arr });
  };
  const addOpcao = () => setForm({ ...form, opcoes: [...(form.opcoes ?? []),
    { tecla: String((form.opcoes?.length ?? 0) + 1), label: "Nova opção" }] });
  const delOpcao = (i: number) => setForm({ ...form, opcoes: (form.opcoes ?? []).filter((_, idx) => idx !== i) });

  const Icon = TIPO_ICON[form.tipo];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4" /> {TIPO_LABEL[form.tipo]}
          </CardTitle>
          <div className="flex gap-2">
            {!isInicial && (
              <Button size="sm" variant="outline" onClick={onDefinirInicial}>
                <Star className="mr-1 h-3 w-3" /> Definir como inicial
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onRemover}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Button size="sm" onClick={salvar} disabled={salvando}>
              {salvando ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Nome interno</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>

        {form.tipo !== "encerrar" && (
          <div>
            <Label>Mensagem enviada ao contato</Label>
            <Textarea rows={5} value={form.mensagem ?? ""}
              onChange={(e) => setForm({ ...form, mensagem: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">
              Variáveis: <code>{"{nome}"}</code>, <code>{"{primeiro_nome}"}</code>
            </p>
          </div>
        )}

        {form.tipo === "menu" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Opções do menu</Label>
              <Button size="sm" variant="outline" onClick={addOpcao}>
                <Plus className="mr-1 h-3 w-3" /> Opção
              </Button>
            </div>
            {(form.opcoes ?? []).map((op, i) => (
              <div key={i} className="grid gap-2 rounded border p-3 md:grid-cols-[80px_1fr_1fr_auto]">
                <Input placeholder="Tecla" value={op.tecla}
                  onChange={(e) => updateOpcao(i, { tecla: e.target.value })} />
                <Input placeholder="Rótulo" value={op.label}
                  onChange={(e) => updateOpcao(i, { label: e.target.value })} />
                <Select value={op.proximo_no_id ?? "__none__"} onValueChange={(v) => updateOpcao(i, { proximo_no_id: v === "__none__" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Próximo nó" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— sem destino —</SelectItem>
                    {outros.map((n) => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => delOpcao(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {form.tipo === "coleta" && (
          <div>
            <Label>Nome da variável (ex: cpf, email, motivo)</Label>
            <Input value={form.variavel ?? ""} onChange={(e) => setForm({ ...form, variavel: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">
              A próxima resposta do contato será salva nesta variável.
            </p>
          </div>
        )}

        {(form.tipo === "encaminhar" || form.tipo === "menu" || form.tipo === "coleta" || form.tipo === "mensagem") && (
          <>
            {form.tipo === "encaminhar" && (
              <div>
                <Label>Departamento</Label>
                <Select value={form.departamento_id ?? "__none__"}
                  onValueChange={(v) => setForm({ ...form, departamento_id: v === "__none__" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— qualquer atendente —</SelectItem>
                    {departamentos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.tipo !== "encaminhar" && form.tipo !== "menu" && (
              <div>
                <Label>Próximo nó (opcional)</Label>
                <Select value={form.proximo_no_id ?? "__none__"}
                  onValueChange={(v) => setForm({ ...form, proximo_no_id: v === "__none__" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— encerrar fluxo —</SelectItem>
                    {outros.map((n) => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}