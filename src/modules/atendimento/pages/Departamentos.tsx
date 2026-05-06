import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Users, ArrowLeft, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { departamentoService } from "../services/departamentoService";
import { atendimentoService, type Departamento } from "../services/atendimentoService";

export default function Departamentos() {
  const { isAdmin, loading } = useUserRole();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Departamento | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openMembros, setOpenMembros] = useState<Departamento | null>(null);

  const { data: deptos = [] } = useQuery({
    queryKey: ["departamentos-todos"],
    queryFn: () => departamentoService.listarTodos(),
  });

  if (loading) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/app/atendimento" replace />;

  const onSaved = () => {
    qc.invalidateQueries({ queryKey: ["departamentos-todos"] });
    qc.invalidateQueries({ queryKey: ["departamentos-ativos"] });
    setOpenForm(false);
    setEditing(null);
  };

  const remover = async (d: Departamento) => {
    if (!confirm(`Remover departamento "${d.nome}"?`)) return;
    try {
      await departamentoService.remover(d.id);
      toast.success("Departamento removido");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao remover");
    }
  };

  return (
    <div className="container max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link to="/app/atendimento"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Departamentos</h1>
            <p className="text-sm text-muted-foreground">Gerencie departamentos e atendentes</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo departamento
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deptos.map((d) => (
          <Card key={d.id} className="overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: d.cor }} />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-md text-white"
                    style={{ backgroundColor: d.cor }}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{d.nome}</CardTitle>
                    {!d.ativo && <Badge variant="outline" className="mt-1">Inativo</Badge>}
                  </div>
                </div>
              </div>
              {d.descricao && <CardDescription className="mt-2">{d.descricao}</CardDescription>}
            </CardHeader>
            <CardContent className="flex justify-end gap-1 pt-0">
              <Button size="sm" variant="ghost" onClick={() => setOpenMembros(d)}>
                <Users className="mr-1 h-3 w-3" /> Membros
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(d); setOpenForm(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remover(d)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {deptos.length === 0 && (
          <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">
            Nenhum departamento cadastrado
          </Card>
        )}
      </div>

      <FormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
        onSaved={onSaved}
      />

      {openMembros && (
        <MembrosDialog
          departamento={openMembros}
          open={!!openMembros}
          onOpenChange={(v) => !v && setOpenMembros(null)}
        />
      )}
    </div>
  );
}

function FormDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Departamento | null;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(editing?.nome ?? "");
  const [descricao, setDescricao] = useState(editing?.descricao ?? "");
  const [cor, setCor] = useState(editing?.cor ?? "#2563EB");
  const [ativo, setAtivo] = useState(editing?.ativo ?? true);
  const [saving, setSaving] = useState(false);

  // sync quando muda editing
  useState(() => {
    setNome(editing?.nome ?? "");
    setDescricao(editing?.descricao ?? "");
    setCor(editing?.cor ?? "#2563EB");
    setAtivo(editing?.ativo ?? true);
  });

  const salvar = async () => {
    if (!nome.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    try {
      if (editing) {
        await departamentoService.atualizar(editing.id, { nome, descricao, cor, ativo });
        toast.success("Departamento atualizado");
      } else {
        await departamentoService.criar({ nome, descricao, cor, ativo });
        toast.success("Departamento criado");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar departamento" : "Novo departamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Saúde" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao ?? ""} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cor</Label>
              <Input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10" />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={ativo} onCheckedChange={setAtivo} />
                <Label>Ativo</Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembrosDialog({
  departamento, open, onOpenChange,
}: {
  departamento: Departamento;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [novoUser, setNovoUser] = useState("");

  const { data: membros = [] } = useQuery({
    queryKey: ["dep-membros", departamento.id],
    queryFn: () => departamentoService.listarMembros(departamento.id),
  });
  const { data: atendentes = [] } = useQuery({
    queryKey: ["atendentes"],
    queryFn: () => atendimentoService.listarAtendentes(),
  });

  const adicionar = async () => {
    if (!novoUser) return;
    try {
      await departamentoService.adicionarMembro(departamento.id, novoUser);
      toast.success("Membro adicionado");
      setNovoUser("");
      qc.invalidateQueries({ queryKey: ["dep-membros", departamento.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha");
    }
  };

  const remover = async (id: string) => {
    try {
      await departamentoService.removerMembro(id);
      toast.success("Membro removido");
      qc.invalidateQueries({ queryKey: ["dep-membros", departamento.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha");
    }
  };

  const nomeDe = (uid: string) =>
    (atendentes as any[]).find((a) => a.user_id === uid)?.nome
    ?? (atendentes as any[]).find((a) => a.user_id === uid)?.email
    ?? uid;

  const naoAdicionados = (atendentes as any[]).filter(
    (a) => !membros.some((m) => m.user_id === a.user_id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Membros — {departamento.nome}</DialogTitle>
          <DialogDescription>Atendentes vinculados ao departamento</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={novoUser} onValueChange={setNovoUser}>
              <SelectTrigger><SelectValue placeholder="Selecione um atendente" /></SelectTrigger>
              <SelectContent>
                {naoAdicionados.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>{a.nome || a.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={adicionar} disabled={!novoUser}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-md border">
            {membros.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Sem membros</div>
            ) : (
              <ul className="divide-y">
                {membros.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">{nomeDe(m.user_id)}</span>
                    <Button size="sm" variant="ghost" onClick={() => remover(m.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}