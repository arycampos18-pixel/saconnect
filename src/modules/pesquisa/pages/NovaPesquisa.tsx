import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  pesquisaService, type PerguntaInput, type PerguntaTipo, type PesquisaStatus, type PesquisaTipo,
} from "../services/pesquisaService";

type Linha = { texto: string; tipo: PerguntaTipo; opcoes: string[] };

const TIPOS: PesquisaTipo[] = ["Intenção de Voto", "Satisfação", "Temas Prioritários"];

export default function NovaPesquisa() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<PesquisaTipo>("Satisfação");
  const [perguntas, setPerguntas] = useState<Linha[]>([
    { texto: "", tipo: "multipla", opcoes: ["", ""] },
  ]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusAtual, setStatusAtual] = useState<PesquisaStatus>("Rascunho");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const r = await pesquisaService.get(id);
        if (!r) { toast.error("Pesquisa não encontrada."); navigate("/app/pesquisas"); return; }
        setTitulo(r.pesquisa.titulo);
        setTipo(r.pesquisa.tipo);
        setStatusAtual(r.pesquisa.status);
        setPerguntas(
          r.perguntas.length > 0
            ? r.perguntas.map((p) => ({
                texto: p.texto,
                tipo: p.tipo,
                opcoes: (p.opcoes && p.opcoes.length >= 2) ? p.opcoes : ["", ""],
              }))
            : [{ texto: "", tipo: "multipla", opcoes: ["", ""] }]
        );
      } catch (e: any) { toast.error(e.message ?? "Erro"); }
      finally { setLoading(false); }
    })();
  }, [id, navigate]);

  function addPergunta() {
    if (perguntas.length >= 5) { toast.warning("Máximo de 5 perguntas."); return; }
    setPerguntas([...perguntas, { texto: "", tipo: "multipla", opcoes: ["", ""] }]);
  }
  function removePergunta(i: number) {
    if (perguntas.length === 1) return;
    setPerguntas(perguntas.filter((_, idx) => idx !== i));
  }
  function setLinha(i: number, patch: Partial<Linha>) {
    setPerguntas(perguntas.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function setOpcao(i: number, j: number, valor: string) {
    const linha = perguntas[i];
    const novas = linha.opcoes.map((o, idx) => (idx === j ? valor : o));
    setLinha(i, { opcoes: novas });
  }
  function addOpcao(i: number) { setLinha(i, { opcoes: [...perguntas[i].opcoes, ""] }); }
  function removeOpcao(i: number, j: number) {
    const linha = perguntas[i];
    if (linha.opcoes.length <= 2) return;
    setLinha(i, { opcoes: linha.opcoes.filter((_, idx) => idx !== j) });
  }

  async function salvar(status: PesquisaStatus) {
    if (!titulo.trim()) { toast.error("Informe o título."); return; }
    if (perguntas.length === 0) { toast.error("Adicione ao menos 1 pergunta."); return; }
    for (const [i, p] of perguntas.entries()) {
      if (!p.texto.trim()) { toast.error(`Pergunta ${i + 1} sem texto.`); return; }
      if (p.tipo === "multipla" || p.tipo === "multipla_varias") {
        const ops = p.opcoes.map((o) => o.trim()).filter(Boolean);
        if (ops.length < 2) { toast.error(`Pergunta ${i + 1}: mínimo 2 opções.`); return; }
      }
    }
    setSaving(true);
    try {
      const payload: PerguntaInput[] = perguntas.map((p, i) => ({
        texto: p.texto.trim(),
        tipo: p.tipo,
        opcoes: (p.tipo === "multipla" || p.tipo === "multipla_varias")
          ? p.opcoes.map((o) => o.trim()).filter(Boolean)
          : null,
        ordem: i,
      }));
      if (isEdit && id) {
        await pesquisaService.update(id, { titulo: titulo.trim(), tipo, status }, payload);
        toast.success("Pesquisa atualizada.");
      } else {
        await pesquisaService.create({ titulo: titulo.trim(), tipo, status }, payload);
        toast.success(status === "Ativa" ? "Pesquisa ativada." : "Rascunho salvo.");
      }
      navigate("/app/pesquisas");
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/pesquisas")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{isEdit ? "Editar pesquisa" : "Nova pesquisa"}</h1>
          <p className="text-sm text-muted-foreground">{isEdit ? "Altere os dados e perguntas da pesquisa." : "Crie uma pesquisa com até 5 perguntas."}</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      )}

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
        <div>
          <Label>Título *</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={150} />
        </div>
        <div>
          <Label>Tipo *</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as PesquisaTipo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {perguntas.map((p, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Pergunta {i + 1}</h3>
              <Button variant="ghost" size="sm" onClick={() => removePergunta(i)} disabled={perguntas.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Label>Texto da pergunta *</Label>
              <Input value={p.texto} onChange={(e) => setLinha(i, { texto: e.target.value })} maxLength={250} />
            </div>
            <div>
              <Label>Tipo de resposta</Label>
              <Select value={p.tipo} onValueChange={(v) => setLinha(i, { tipo: v as PerguntaTipo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multipla">Escolha única (uma opção)</SelectItem>
                  <SelectItem value="multipla_varias">Múltipla escolha (várias opções)</SelectItem>
                  <SelectItem value="sim_nao">Sim / Não</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(p.tipo === "multipla" || p.tipo === "multipla_varias") && (
              <div className="space-y-2">
                <Label>Opções de resposta</Label>
                {p.opcoes.map((op, j) => (
                  <div key={j} className="flex gap-2">
                    <Input value={op} onChange={(e) => setOpcao(i, j, e.target.value)} placeholder={`Opção ${j + 1}`} maxLength={120} />
                    <Button variant="ghost" size="icon" onClick={() => removeOpcao(i, j)} disabled={p.opcoes.length <= 2}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addOpcao(i)}><Plus className="mr-1 h-3 w-3" />Adicionar opção</Button>
              </div>
            )}
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={addPergunta} disabled={perguntas.length >= 5}>
          <Plus className="mr-2 h-4 w-4" />Adicionar pergunta ({perguntas.length}/5)
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        {isEdit ? (
          <>
            <Button variant="outline" onClick={() => navigate("/app/pesquisas")} disabled={saving}>Cancelar</Button>
            <Button onClick={() => salvar(statusAtual)} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => salvar("Rascunho")} disabled={saving}>Salvar como rascunho</Button>
            <Button onClick={() => salvar("Ativa")} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ativar pesquisa
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
