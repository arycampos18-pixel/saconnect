import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowLeft, MessageSquare, Search, Copy, Hash } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import { templateService, type Template, VARIAVEIS_DISPONIVEIS, CATEGORIAS_PADRAO } from "../services/templateService";
import { atendimentoService } from "../services/atendimentoService";

export default function Templates() {
  const { isAdmin, loading } = useUserRole();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Template | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [filtroDep, setFiltroDep] = useState<string>("todos");

  const { data: templates = [] } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => templateService.listar(),
  });

  const { data: deptos = [] } = useQuery({
    queryKey: ["departamentos-ativos"],
    queryFn: () => atendimentoService.listarDepartamentos(),
  });

  const categorias = useMemo(() => {
    const set = new Set<string>(CATEGORIAS_PADRAO);
    templates.forEach((t) => t.categoria && set.add(t.categoria));
    return Array.from(set);
  }, [templates]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return templates.filter((t) => {
      if (filtroCat !== "todas" && (t.categoria ?? "") !== filtroCat) return false;
      if (filtroDep === "global" && t.departamento_id) return false;
      if (filtroDep !== "todos" && filtroDep !== "global" && t.departamento_id !== filtroDep) return false;
      if (!q) return true;
      return (
        t.nome.toLowerCase().includes(q) ||
        (t.atalho ?? "").toLowerCase().includes(q) ||
        (t.descricao ?? "").toLowerCase().includes(q) ||
        t.conteudo.toLowerCase().includes(q)
      );
    });
  }, [templates, busca, filtroCat, filtroDep]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/app/atendimento" replace />;

  const onSaved = () => {
    qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    setOpenForm(false);
    setEditing(null);
  };

  const remover = async (t: Template) => {
    if (!confirm(`Remover template "${t.nome}"?`)) return;
    try {
      await templateService.remover(t.id);
      toast.success("Template removido");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
  };

  const totalUsos = templates.reduce((s, t) => s + (t.usos ?? 0), 0);

  return (
    <div className="container max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link to="/app/atendimento"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Respostas rápidas</h1>
            <p className="text-sm text-muted-foreground">
              {templates.length} templates · {totalUsos} usos · variáveis: {VARIAVEIS_DISPONIVEIS.map((v) => v.token).join(" ")}
            </p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo template
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, atalho ou texto…" className="pl-9" />
          </div>
          <Select value={filtroCat} onValueChange={setFiltroCat}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroDep} onValueChange={setFiltroDep}>
            <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos departamentos</SelectItem>
              <SelectItem value="global">Apenas globais</SelectItem>
              {deptos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtrados.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t.nome}</span>
                  {t.atalho && <Badge variant="outline" className="gap-1 text-xs"><Hash className="h-3 w-3" />{t.atalho}</Badge>}
                  {t.categoria && <Badge variant="secondary" className="text-xs">{t.categoria}</Badge>}
                  {t.departamento_id ? (
                    <Badge variant="outline" className="text-xs">{deptos.find((d) => d.id === t.departamento_id)?.nome ?? "—"}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Global</Badge>
                  )}
                  {!t.ativo && <Badge variant="outline">Inativo</Badge>}
                  <Badge variant="secondary" className="ml-auto text-[10px]">{t.usos ?? 0} usos</Badge>
                </div>
                {t.descricao && <p className="mt-1 text-xs italic text-muted-foreground">{t.descricao}</p>}
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.conteudo}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="ghost" title="Copiar conteúdo" onClick={() => { navigator.clipboard.writeText(t.conteudo); toast.success("Copiado"); }}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setOpenForm(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remover(t)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum template encontrado</Card>
        )}
      </div>

      {openForm && (
        <FormDialog
          open={openForm}
          onOpenChange={setOpenForm}
          editing={editing}
          deptos={deptos}
          categorias={categorias}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function FormDialog({
  open, onOpenChange, editing, deptos, categorias, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Template | null;
  deptos: Array<{ id: string; nome: string }>;
  categorias: string[];
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [atalho, setAtalho] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<string>("");
  const [depId, setDepId] = useState<string>("global");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNome(editing?.nome ?? "");
    setConteudo(editing?.conteudo ?? "");
    setAtalho(editing?.atalho ?? "");
    setDescricao(editing?.descricao ?? "");
    setCategoria(editing?.categoria ?? "");
    setDepId(editing?.departamento_id ?? "global");
    setAtivo(editing?.ativo ?? true);
  }, [editing, open]);

  const inserirVar = (token: string) => {
    setConteudo((prev) => `${prev}${token}`);
  };

  const previewConteudo = useMemo(() => {
    return templateService.aplicarVariaveis(conteudo, "Maria Silva", { atendenteNome: "Atendente" });
  }, [conteudo]);

  const salvar = async () => {
    if (!nome.trim() || !conteudo.trim()) { toast.error("Preencha nome e conteúdo"); return; }
    let atalhoNorm = atalho.trim();
    if (atalhoNorm && !atalhoNorm.startsWith("/")) atalhoNorm = "/" + atalhoNorm;
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        conteudo,
        atalho: atalhoNorm || null,
        descricao: descricao.trim() || null,
        categoria: categoria.trim() || null,
        departamento_id: depId === "global" ? null : depId,
        ativo,
        usos: editing?.usos ?? 0,
        ultimo_uso_em: editing?.ultimo_uso_em ?? null,
      };
      if (editing) {
        await templateService.atualizar(editing.id, payload);
        toast.success("Template atualizado");
      } else {
        await templateService.criar(payload);
        toast.success("Template criado");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Editar template" : "Novo template"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Saudação inicial" />
            </div>
            <div>
              <Label>Atalho (ex.: /oi)</Label>
              <Input value={atalho} onChange={(e) => setAtalho(e.target.value)} placeholder="/oi" />
            </div>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Quando usar este template" />
          </div>
          <div>
            <Label>Conteúdo</Label>
            <Textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={5}
              placeholder="{saudacao} {primeiro_nome}, em que posso ajudar?"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {VARIAVEIS_DISPONIVEIS.map((v) => (
                <Button key={v.token} size="sm" variant="outline" type="button" className="h-6 text-xs" onClick={() => inserirVar(v.token)} title={v.desc}>
                  {v.token}
                </Button>
              ))}
            </div>
            {conteudo && (
              <div className="mt-2 rounded border bg-muted/30 p-2 text-xs">
                <span className="font-semibold text-muted-foreground">Pré-visualização:</span>
                <p className="mt-1 whitespace-pre-wrap">{previewConteudo}</p>
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Categoria</Label>
              <Select value={categoria || "_none"} onValueChange={(v) => setCategoria(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem categoria</SelectItem>
                  {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Departamento</Label>
              <Select value={depId} onValueChange={setDepId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (todos)</SelectItem>
                  {deptos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <Label>Ativo</Label>
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
