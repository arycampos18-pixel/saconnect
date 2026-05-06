import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Loader2, Pencil, Trash2, Settings2, Tag as TagIcon, StickyNote,
  Clock, CalendarDays, MessageCircle, Cable, Zap, MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { departamentoService } from "../services/departamentoService";
import {
  slaService, tagService, notaService, horarioService, feriadoService,
  type SLA, type TagWA, type NotaInterna, type Horario, type Feriado,
} from "../services/configAvancadaService";
import WhatsAppPage from "@/modules/whatsapp/pages/WhatsApp";
import ConfiguracoesWhatsApp from "./Configuracoes";
import Templates from "./Templates";

const CORES = ["#EF4444","#F97316","#F59E0B","#EAB308","#84CC16","#22C55E","#10B981","#06B6D4","#3B82F6","#6366F1","#8B5CF6","#EC4899"];
const DIAS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

export default function ConfiguracoesAvancadas() {
  const [secao, setSecao] = useState("whatsapp");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Settings2 className="h-6 w-6" /> Configurações Avançadas
        </h1>
        <p className="text-sm text-muted-foreground">
          Centralize aqui todas as configurações do sistema.
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-56 shrink-0">
          <div className="rounded-lg border bg-card p-2">
            <button
              onClick={() => setSecao("whatsapp")}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                secao === "whatsapp" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          {secao === "whatsapp" && <WhatsAppSecao />}
        </div>
      </div>
    </div>
  );
}

function WhatsAppSecao() {
  return (
    <Tabs defaultValue="sla">
      <TabsList className="flex-wrap">
        <TabsTrigger value="sla"><Settings2 className="mr-1 h-3 w-3" />SLA</TabsTrigger>
        <TabsTrigger value="tags"><TagIcon className="mr-1 h-3 w-3" />Tags & Notas</TabsTrigger>
        <TabsTrigger value="horario"><Clock className="mr-1 h-3 w-3" />Horário</TabsTrigger>
        <TabsTrigger value="feriados"><CalendarDays className="mr-1 h-3 w-3" />Feriados</TabsTrigger>
        <TabsTrigger value="integracao"><Cable className="mr-1 h-3 w-3" />Integração</TabsTrigger>
        <TabsTrigger value="mensagens"><MessageSquare className="mr-1 h-3 w-3" />Mensagens Automáticas</TabsTrigger>
        <TabsTrigger value="respostas"><Zap className="mr-1 h-3 w-3" />Respostas Rápidas</TabsTrigger>
      </TabsList>
      <TabsContent value="sla" className="mt-4"><SLATab /></TabsContent>
      <TabsContent value="tags" className="mt-4 space-y-6"><TagsTab /><NotasTab /></TabsContent>
      <TabsContent value="horario" className="mt-4"><HorarioTab /></TabsContent>
      <TabsContent value="feriados" className="mt-4"><FeriadosTab /></TabsContent>
      <TabsContent value="integracao" className="mt-4"><WhatsAppPage /></TabsContent>
      <TabsContent value="mensagens" className="mt-4"><ConfiguracoesWhatsApp /></TabsContent>
      <TabsContent value="respostas" className="mt-4"><Templates /></TabsContent>
    </Tabs>
  );
}

function useDepartamentos() {
  return useQuery({ queryKey: ["departamentos"], queryFn: () => departamentoService.listarTodos() });
}

/* ───────── SLA ───────── */
function SLATab() {
  const qc = useQueryClient();
  const { data: list, isLoading } = useQuery({ queryKey: ["wa-slas"], queryFn: () => slaService.list() });
  const { data: deps } = useDepartamentos();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<SLA> | null>(null);

  const novo = () => { setEdit({ nome: "", tempo_resposta_min: 30, tempo_resolucao_horas: 4, prioridade: "Média", ativo: true, departamento_id: null }); setOpen(true); };
  const salvar = async () => {
    if (!edit?.nome) return toast.error("Nome obrigatório");
    try {
      if (edit.id) await slaService.update(edit.id, edit);
      else await slaService.create(edit);
      toast.success("Salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["wa-slas"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const remover = async (id: string) => {
    if (!confirm("Excluir SLA?")) return;
    await slaService.remove(id);
    qc.invalidateQueries({ queryKey: ["wa-slas"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>SLAs</CardTitle>
          <CardDescription>Prazos de resposta e resolução por departamento.</CardDescription>
        </div>
        <Button onClick={novo}><Plus className="mr-1 h-4 w-4" />Novo SLA</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Departamento</TableHead>
              <TableHead>Resposta</TableHead><TableHead>Resolução</TableHead>
              <TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(list ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell>{deps?.find((d) => d.id === s.departamento_id)?.nome ?? "—"}</TableCell>
                  <TableCell>{s.tempo_resposta_min} min</TableCell>
                  <TableCell>{s.tempo_resolucao_horas}h</TableCell>
                  <TableCell><Badge variant="secondary">{s.prioridade}</Badge></TableCell>
                  <TableCell>{s.ativo ? <Badge>Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEdit(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remover(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!list?.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum SLA cadastrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Novo"} SLA</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={edit.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div>
                <Label>Departamento</Label>
                <Select value={edit.departamento_id ?? "__none__"} onValueChange={(v) => setEdit({ ...edit, departamento_id: v === "__none__" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— todos —</SelectItem>
                    {(deps ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Resposta (min)</Label><Input type="number" value={edit.tempo_resposta_min ?? 30} onChange={(e) => setEdit({ ...edit, tempo_resposta_min: Number(e.target.value) })} /></div>
                <div><Label>Resolução (h)</Label><Input type="number" value={edit.tempo_resolucao_horas ?? 4} onChange={(e) => setEdit({ ...edit, tempo_resolucao_horas: Number(e.target.value) })} /></div>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={edit.prioridade ?? "Média"} onValueChange={(v) => setEdit({ ...edit, prioridade: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Baixa","Média","Alta","Crítica"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={!!edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ───────── Tags ───────── */
function TagsTab() {
  const qc = useQueryClient();
  const { data: list, isLoading } = useQuery({ queryKey: ["wa-tags"], queryFn: () => tagService.list() });
  const { data: deps } = useDepartamentos();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<TagWA> | null>(null);

  const novo = () => { setEdit({ nome: "", cor: CORES[0], descricao: "", ativo: true, departamento_id: null }); setOpen(true); };
  const salvar = async () => {
    if (!edit?.nome) return toast.error("Nome obrigatório");
    try {
      if (edit.id) await tagService.update(edit.id, edit);
      else await tagService.create(edit);
      toast.success("Salvo"); setOpen(false);
      qc.invalidateQueries({ queryKey: ["wa-tags"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const remover = async (id: string) => {
    if (!confirm("Excluir tag?")) return;
    await tagService.remove(id);
    qc.invalidateQueries({ queryKey: ["wa-tags"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Tags</CardTitle><CardDescription>Etiquetas coloridas para categorizar conversas.</CardDescription></div>
        <Button onClick={novo}><Plus className="mr-1 h-4 w-4" />Nova Tag</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Cor</TableHead><TableHead>Nome</TableHead><TableHead>Descrição</TableHead>
              <TableHead>Departamento</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(list ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell><span className="inline-block h-4 w-4 rounded-full" style={{ background: t.cor }} /></TableCell>
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{t.descricao ?? "—"}</TableCell>
                  <TableCell>{deps?.find((d) => d.id === t.departamento_id)?.nome ?? "—"}</TableCell>
                  <TableCell>{t.ativo ? <Badge>Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEdit(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remover(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!list?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma tag cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Nova"} Tag</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={edit.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div>
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {CORES.map((c) => (
                    <button key={c} onClick={() => setEdit({ ...edit, cor: c })}
                      className={`h-7 w-7 rounded-full border-2 transition ${edit.cor === c ? "border-foreground" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div><Label>Descrição</Label><Textarea rows={2} value={edit.descricao ?? ""} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></div>
              <div>
                <Label>Departamento</Label>
                <Select value={edit.departamento_id ?? "__none__"} onValueChange={(v) => setEdit({ ...edit, departamento_id: v === "__none__" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— geral —</SelectItem>
                    {(deps ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between"><Label>Ativa</Label><Switch checked={!!edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ───────── Notas Internas ───────── */
function NotasTab() {
  const qc = useQueryClient();
  const { data: list, isLoading } = useQuery({ queryKey: ["wa-notas"], queryFn: () => notaService.list() });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<NotaInterna> | null>(null);

  const novo = () => { setEdit({ tipo: "Padrão", titulo: "", descricao: "", visibilidade: "Todos", ativo: true }); setOpen(true); };
  const salvar = async () => {
    if (!edit?.titulo) return toast.error("Título obrigatório");
    try {
      if (edit.id) await notaService.update(edit.id, edit);
      else await notaService.create(edit);
      toast.success("Salvo"); setOpen(false);
      qc.invalidateQueries({ queryKey: ["wa-notas"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const remover = async (id: string) => {
    if (!confirm("Excluir nota?")) return;
    await notaService.remove(id);
    qc.invalidateQueries({ queryKey: ["wa-notas"] });
  };

  const corTipo: Record<string, string> = { "Padrão": "secondary", "Alerta": "destructive", "Importante": "default", "Seguimento": "outline" };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5" />Notas Internas</CardTitle><CardDescription>Avisos visíveis apenas para a equipe.</CardDescription></div>
        <Button onClick={novo}><Plus className="mr-1 h-4 w-4" />Nova Nota</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tipo</TableHead><TableHead>Título</TableHead><TableHead>Descrição</TableHead>
              <TableHead>Visibilidade</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(list ?? []).map((n) => (
                <TableRow key={n.id}>
                  <TableCell><Badge variant={corTipo[n.tipo] as any}>{n.tipo}</Badge></TableCell>
                  <TableCell className="font-medium">{n.titulo}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{n.descricao ?? "—"}</TableCell>
                  <TableCell>{n.visibilidade}</TableCell>
                  <TableCell>{n.ativo ? <Badge>Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEdit(n); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remover(n.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!list?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma nota cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Nova"} Nota Interna</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div>
                <Label>Tipo</Label>
                <Select value={edit.tipo ?? "Padrão"} onValueChange={(v) => setEdit({ ...edit, tipo: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Padrão","Alerta","Importante","Seguimento"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Título</Label><Input value={edit.titulo ?? ""} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea rows={3} value={edit.descricao ?? ""} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></div>
              <div>
                <Label>Visibilidade</Label>
                <Select value={edit.visibilidade ?? "Todos"} onValueChange={(v) => setEdit({ ...edit, visibilidade: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Todos","Apenas Meu Departamento","Apenas Eu"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between"><Label>Ativa</Label><Switch checked={!!edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ───────── Horário ───────── */
function HorarioTab() {
  const qc = useQueryClient();
  const { data: list, isLoading } = useQuery({ queryKey: ["wa-horarios"], queryFn: () => horarioService.list() });
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<Record<string, Horario>>({});

  const items = (list ?? []).map((h) => draft[h.id] ?? h);
  const change = (h: Horario, patch: Partial<Horario>) => setDraft({ ...draft, [h.id]: { ...h, ...patch } });

  const salvar = async () => {
    setSalvando(true);
    try {
      for (const h of Object.values(draft)) {
        await horarioService.update(h.id, { hora_inicio: h.hora_inicio, hora_fim: h.hora_fim, aberto: h.aberto });
      }
      toast.success("Horários salvos");
      setDraft({});
      qc.invalidateQueries({ queryKey: ["wa-horarios"] });
    } catch (e: any) { toast.error(e.message); } finally { setSalvando(false); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Horário de Trabalho</CardTitle><CardDescription>Janelas de atendimento por dia da semana.</CardDescription></div>
        <Button onClick={salvar} disabled={salvando || !Object.keys(draft).length}>
          {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Salvar Horários
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Dia</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Aberto</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{DIAS[h.dia_semana]}</TableCell>
                  <TableCell><Input type="time" value={h.hora_inicio ?? ""} onChange={(e) => change(h, { hora_inicio: e.target.value || null })} disabled={!h.aberto} className="w-32" /></TableCell>
                  <TableCell><Input type="time" value={h.hora_fim ?? ""} onChange={(e) => change(h, { hora_fim: e.target.value || null })} disabled={!h.aberto} className="w-32" /></TableCell>
                  <TableCell><Switch checked={h.aberto} onCheckedChange={(v) => change(h, { aberto: v })} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────── Feriados ───────── */
function FeriadosTab() {
  const qc = useQueryClient();
  const { data: list, isLoading } = useQuery({ queryKey: ["wa-feriados"], queryFn: () => feriadoService.list() });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Feriado> | null>(null);

  const novo = () => { setEdit({ data: new Date().toISOString().slice(0, 10), nome: "", tipo: "Feriado Nacional", mensagem: "", ativo: true }); setOpen(true); };
  const salvar = async () => {
    if (!edit?.nome || !edit.data) return toast.error("Data e nome obrigatórios");
    try {
      if (edit.id) await feriadoService.update(edit.id, edit);
      else await feriadoService.create(edit);
      toast.success("Salvo"); setOpen(false);
      qc.invalidateQueries({ queryKey: ["wa-feriados"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const remover = async (id: string) => {
    if (!confirm("Excluir feriado?")) return;
    await feriadoService.remove(id);
    qc.invalidateQueries({ queryKey: ["wa-feriados"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Feriados</CardTitle><CardDescription>Datas em que o atendimento não funciona.</CardDescription></div>
        <Button onClick={novo}><Plus className="mr-1 h-4 w-4" />Novo Feriado</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Nome</TableHead><TableHead>Tipo</TableHead>
              <TableHead>Mensagem</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(list ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{new Date(f.data + "T12:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell><Badge variant="secondary">{f.tipo}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{f.mensagem ?? "—"}</TableCell>
                  <TableCell>{f.ativo ? <Badge>Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEdit(f); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remover(f.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!list?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum feriado cadastrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Novo"} Feriado</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={edit.data ?? ""} onChange={(e) => setEdit({ ...edit, data: e.target.value })} /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={edit.tipo ?? "Feriado Nacional"} onValueChange={(v) => setEdit({ ...edit, tipo: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Feriado Nacional","Feriado Estadual","Feriado Municipal","Ponto Facultativo"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Nome</Label><Input value={edit.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div><Label>Mensagem especial</Label><Textarea rows={3} value={edit.mensagem ?? ""} onChange={(e) => setEdit({ ...edit, mensagem: e.target.value })} /></div>
              <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={!!edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}