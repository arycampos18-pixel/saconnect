import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Target, Award, Trophy, Sparkles, Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { metasGamificacaoService, type Meta, type Badge } from "../services/metasGamificacaoService";
import { liderancasCabosService } from "../services/liderancasCabosService";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";

export default function MetasGamificacao() {
  const qc = useQueryClient();
  const { currentCompany } = useCompany();

  const { data: liderancas = [] } = useQuery({ queryKey: ["liderancas"], queryFn: () => liderancasCabosService.listarLiderancas() });
  const { data: cabos = [] } = useQuery({ queryKey: ["cabos"], queryFn: () => liderancasCabosService.listarCabos() });
  const { data: metas = [] } = useQuery({ queryKey: ["metas"], queryFn: () => metasGamificacaoService.listarMetas() });
  const { data: badges = [] } = useQuery({ queryKey: ["badges"], queryFn: () => metasGamificacaoService.listarBadges() });
  const { data: ranking = [] } = useQuery({ queryKey: ["ranking-geral"], queryFn: () => metasGamificacaoService.ranking({ limit: 20 }) });
  const { data: progressos = [] } = useQuery({ queryKey: ["progresso-metas"], queryFn: () => metasGamificacaoService.progressoMetasAtivas() });

  // ----- Meta dialog -----
  const [openMeta, setOpenMeta] = useState(false);
  const [editMeta, setEditMeta] = useState<Meta | null>(null);
  const [formMeta, setFormMeta] = useState<Partial<Meta>>({});

  function newMeta() {
    setEditMeta(null);
    const hoje = new Date().toISOString().split("T")[0];
    const fim = new Date(); fim.setDate(fim.getDate() + 30);
    setFormMeta({ titulo: "", tipo_periodo: "mensal", data_inicio: hoje, data_fim: fim.toISOString().split("T")[0], quantidade_alvo: 50, ativo: true });
    setOpenMeta(true);
  }
  function editMetaOpen(m: Meta) { setEditMeta(m); setFormMeta(m); setOpenMeta(true); }

  async function saveMeta() {
    if (!formMeta.titulo || !formMeta.quantidade_alvo) return toast.error("Título e quantidade são obrigatórios");
    if (!formMeta.lideranca_id && !formMeta.cabo_eleitoral_id) return toast.error("Atribua a meta a uma Liderança ou Cabo");
    try {
      if (editMeta) await metasGamificacaoService.atualizarMeta(editMeta.id, formMeta);
      else await metasGamificacaoService.criarMeta({ ...formMeta, company_id: currentCompany?.id });
      toast.success("Meta salva");
      setOpenMeta(false);
      qc.invalidateQueries({ queryKey: ["metas"] });
      qc.invalidateQueries({ queryKey: ["progresso-metas"] });
    } catch (e: any) { toast.error(e.message); }
  }
  async function removeMeta(id: string) {
    if (!confirm("Remover esta meta?")) return;
    await metasGamificacaoService.removerMeta(id);
    qc.invalidateQueries({ queryKey: ["metas"] });
    qc.invalidateQueries({ queryKey: ["progresso-metas"] });
  }

  // ----- Badge dialog -----
  const [openBadge, setOpenBadge] = useState(false);
  const [editBadge, setEditBadge] = useState<Badge | null>(null);
  const [formBadge, setFormBadge] = useState<Partial<Badge>>({});

  function newBadge() {
    setEditBadge(null);
    setFormBadge({ nome: "", icone: "Award", cor: "#f59e0b", criterio_tipo: "total_eleitores", criterio_valor: 10, ativo: true });
    setOpenBadge(true);
  }
  function editBadgeOpen(b: Badge) { setEditBadge(b); setFormBadge(b); setOpenBadge(true); }

  async function saveBadge() {
    if (!formBadge.nome) return toast.error("Nome obrigatório");
    try {
      if (editBadge) await metasGamificacaoService.atualizarBadge(editBadge.id, formBadge);
      else await metasGamificacaoService.criarBadge({ ...formBadge, company_id: currentCompany?.id });
      toast.success("Badge salvo");
      setOpenBadge(false);
      qc.invalidateQueries({ queryKey: ["badges"] });
    } catch (e: any) { toast.error(e.message); }
  }
  async function removeBadge(id: string) {
    if (!confirm("Remover este badge?")) return;
    await metasGamificacaoService.removerBadge(id);
    qc.invalidateQueries({ queryKey: ["badges"] });
  }

  async function avaliarTodos() {
    if (!currentCompany) return;
    let total = 0;
    for (const c of cabos) {
      total += await metasGamificacaoService.avaliarBadgesDoCabo(c.id, currentCompany.id);
    }
    toast.success(`Avaliação concluída — ${total} novos badges concedidos`);
    qc.invalidateQueries({ queryKey: ["badges"] });
  }

  async function verificarMetas() {
    try {
      const r = await metasGamificacaoService.verificarMetasAgora();
      const totalNotif = r.reduce((s, x) => s + x.notificados, 0);
      toast.success(`Verificação concluída — ${r.length} meta(s) avaliadas, ${totalNotif} notificações enviadas`);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-primary" />Metas & Gamificação</h1>
        <p className="text-sm text-muted-foreground">Defina metas de captação, conquistas e veja o ranking dos cabos.</p>
      </div>

      <Tabs defaultValue="metas">
        <TabsList>
          <TabsTrigger value="metas"><Target className="h-4 w-4 mr-1" />Metas</TabsTrigger>
          <TabsTrigger value="ranking"><Trophy className="h-4 w-4 mr-1" />Ranking</TabsTrigger>
          <TabsTrigger value="badges"><Award className="h-4 w-4 mr-1" />Badges</TabsTrigger>
        </TabsList>

        {/* METAS */}
        <TabsContent value="metas" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={verificarMetas}><Bell className="h-4 w-4 mr-2" />Verificar metas agora</Button>
            <Button onClick={newMeta}><Plus className="h-4 w-4 mr-2" />Nova meta</Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Progresso das metas ativas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {progressos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma meta ativa.</p>}
              {progressos.map((p) => {
                const alvo = liderancas.find(l => l.id === p.meta.lideranca_id)?.nome
                  || cabos.find(c => c.id === p.meta.cabo_eleitoral_id)?.nome || "—";
                return (
                  <div key={p.meta.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{p.meta.titulo}</div>
                        <div className="text-xs text-muted-foreground">{alvo} · {p.meta.tipo_periodo} · {p.meta.data_inicio} → {p.meta.data_fim}</div>
                      </div>
                      <div className="text-sm font-semibold">{p.realizado} / {p.meta.quantidade_alvo}</div>
                    </div>
                    <Progress value={p.percentual} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle className="text-base">Todas as metas</CardTitle></CardHeader>
          <CardContent className="p-0">
            {metas.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhuma meta cadastrada.</p> :
              <div className="divide-y">
                {metas.map(m => {
                  const alvo = liderancas.find(l => l.id === m.lideranca_id)?.nome
                    || cabos.find(c => c.id === m.cabo_eleitoral_id)?.nome || "—";
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3">
                      <div>
                        <div className="font-medium text-sm">{m.titulo} <UiBadge variant={m.ativo ? "default" : "secondary"} className="ml-1">{m.ativo ? "ativa" : "inativa"}</UiBadge></div>
                        <div className="text-xs text-muted-foreground">{alvo} · alvo {m.quantidade_alvo} · {m.data_inicio} → {m.data_fim}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => editMetaOpen(m)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removeMeta(m.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          </CardContent></Card>
        </TabsContent>

        {/* RANKING */}
        <TabsContent value="ranking">
          <Card><CardHeader><CardTitle className="text-base">Top Cabos por cadastros</CardTitle></CardHeader>
          <CardContent className="p-0">
            {ranking.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Sem dados.</p> :
              <div className="divide-y">
                {ranking.map(r => (
                  <div key={r.cabo_id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${r.posicao === 1 ? "bg-yellow-500 text-white" : r.posicao === 2 ? "bg-gray-400 text-white" : r.posicao === 3 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"}`}>
                        {r.posicao}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{r.cabo_nome}</div>
                        <div className="text-xs text-muted-foreground">{r.lideranca_nome ?? "Sem liderança"}</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold">{r.total}</div>
                  </div>
                ))}
              </div>
            }
          </CardContent></Card>
        </TabsContent>

        {/* BADGES */}
        <TabsContent value="badges" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={avaliarTodos}><Sparkles className="h-4 w-4 mr-2" />Avaliar e conceder</Button>
            <Button onClick={newBadge}><Plus className="h-4 w-4 mr-2" />Novo badge</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.length === 0 && <p className="text-sm text-muted-foreground">Nenhum badge cadastrado.</p>}
            {badges.map(b => (
              <Card key={b.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: b.cor + "22", color: b.cor }}>
                    <Award className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{b.nome} {!b.ativo && <UiBadge variant="secondary" className="ml-1">inativo</UiBadge>}</div>
                    <div className="text-xs text-muted-foreground">{b.descricao || "—"}</div>
                    <div className="text-xs mt-1">Critério: <b>{b.criterio_tipo}</b> ≥ <b>{b.criterio_valor}</b></div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => editBadgeOpen(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => removeBadge(b.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Meta */}
      <Dialog open={openMeta} onOpenChange={setOpenMeta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMeta ? "Editar meta" : "Nova meta"}</DialogTitle>
            <DialogDescription>Atribua a uma Liderança OU a um Cabo Eleitoral.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={formMeta.titulo ?? ""} onChange={e => setFormMeta({ ...formMeta, titulo: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={formMeta.descricao ?? ""} onChange={e => setFormMeta({ ...formMeta, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Período</Label>
                <Select value={formMeta.tipo_periodo} onValueChange={(v) => setFormMeta({ ...formMeta, tipo_periodo: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="campanha">Campanha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Quantidade alvo *</Label><Input type="number" min={1} value={formMeta.quantidade_alvo ?? 0} onChange={e => setFormMeta({ ...formMeta, quantidade_alvo: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Início *</Label><Input type="date" value={formMeta.data_inicio ?? ""} onChange={e => setFormMeta({ ...formMeta, data_inicio: e.target.value })} /></div>
              <div><Label>Fim *</Label><Input type="date" value={formMeta.data_fim ?? ""} onChange={e => setFormMeta({ ...formMeta, data_fim: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Liderança</Label>
                <Select value={formMeta.lideranca_id ?? "none"} onValueChange={(v) => setFormMeta({ ...formMeta, lideranca_id: v === "none" ? null : v, cabo_eleitoral_id: v === "none" ? formMeta.cabo_eleitoral_id : null })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {liderancas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cabo Eleitoral</Label>
                <Select value={formMeta.cabo_eleitoral_id ?? "none"} onValueChange={(v) => setFormMeta({ ...formMeta, cabo_eleitoral_id: v === "none" ? null : v, lideranca_id: v === "none" ? formMeta.lideranca_id : null })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {cabos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenMeta(false)}>Cancelar</Button>
            <Button onClick={saveMeta}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Badge */}
      <Dialog open={openBadge} onOpenChange={setOpenBadge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBadge ? "Editar badge" : "Novo badge"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={formBadge.nome ?? ""} onChange={e => setFormBadge({ ...formBadge, nome: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={formBadge.descricao ?? ""} onChange={e => setFormBadge({ ...formBadge, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Cor</Label><Input type="color" value={formBadge.cor ?? "#f59e0b"} onChange={e => setFormBadge({ ...formBadge, cor: e.target.value })} /></div>
              <div><Label>Ícone (lucide)</Label><Input value={formBadge.icone ?? "Award"} onChange={e => setFormBadge({ ...formBadge, icone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Critério</Label>
                <Select value={formBadge.criterio_tipo} onValueChange={(v) => setFormBadge({ ...formBadge, criterio_tipo: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_eleitores">Total de eleitores</SelectItem>
                    <SelectItem value="meta_batida">Meta batida</SelectItem>
                    <SelectItem value="primeiros_n">Primeiros N a atingir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor alvo</Label><Input type="number" min={0} value={formBadge.criterio_valor ?? 0} onChange={e => setFormBadge({ ...formBadge, criterio_valor: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenBadge(false)}>Cancelar</Button>
            <Button onClick={saveBadge}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}