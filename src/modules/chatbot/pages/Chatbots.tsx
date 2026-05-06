import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Bot, Edit, Trash2, Power, ListChecks, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { chatbotService, type ChatbotFluxo } from "../services/chatbotService";

export default function Chatbots() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ChatbotFluxo | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", ativo: true });

  const { data: fluxos, isLoading } = useQuery({
    queryKey: ["chatbot-fluxos"], queryFn: () => chatbotService.listarFluxos(),
  });

  const abrir = (f?: ChatbotFluxo) => {
    setEdit(f ?? null);
    setForm({ nome: f?.nome ?? "", descricao: f?.descricao ?? "", ativo: f?.ativo ?? true });
    setOpen(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    try {
      if (edit) await chatbotService.atualizarFluxo(edit.id, form);
      else {
        const novo = await chatbotService.criarFluxo(form);
        setOpen(false);
        qc.invalidateQueries({ queryKey: ["chatbot-fluxos"] });
        navigate(`/app/chatbot/${novo.id}`);
        return;
      }
      toast.success("Salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["chatbot-fluxos"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const remover = async (id: string) => {
    if (!confirm("Remover este fluxo? Todos os nós e sessões serão apagados.")) return;
    try {
      await chatbotService.removerFluxo(id);
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["chatbot-fluxos"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const toggle = async (f: ChatbotFluxo) => {
    await chatbotService.atualizarFluxo(f.id, { ativo: !f.ativo });
    qc.invalidateQueries({ queryKey: ["chatbot-fluxos"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-6 w-6" /> Chatbot / Menu URA
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie fluxos automatizados que recebem o contato antes do atendimento humano.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/app/chatbot/sessoes")}>
            <ListChecks className="mr-2 h-4 w-4" /> Sessões ativas
          </Button>
          <Button onClick={() => abrir()}>
            <Plus className="mr-2 h-4 w-4" /> Novo fluxo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (fluxos ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum fluxo criado. Clique em "Novo fluxo" para começar.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(fluxos ?? []).map((f) => (
            <Card key={f.id} className="transition hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{f.nome}</CardTitle>
                  <Badge variant={f.ativo ? "default" : "secondary"}>{f.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                {f.descricao && <p className="text-xs text-muted-foreground">{f.descricao}</p>}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/app/chatbot/${f.id}`)}>
                  <Edit className="mr-1 h-3 w-3" /> Editar fluxo
                </Button>
                <Button size="sm" variant="outline" onClick={() => abrir(f)}>Renomear</Button>
                <Button size="sm" variant="outline" onClick={() => toggle(f)}>
                  <Power className="mr-1 h-3 w-3" /> {f.ativo ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remover(f.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? "Editar fluxo" : "Novo fluxo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Descrição</Label>
              <Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="flex items-center justify-between rounded border p-3">
              <Label>Ativo</Label>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}