import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Copy, QrCode, Link as LinkIcon, Power, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import VotersList from "@/modules/political/pages/VotersList";
import { liderancasCabosService } from "../services/liderancasCabosService";
import { hierarquiaDashboardService } from "../services/hierarquiaDashboardService";
import { metasGamificacaoService } from "../services/metasGamificacaoService";
import { Progress } from "@/components/ui/progress";
import { Award, Target } from "lucide-react";
import { publicAppOrigin } from "@/shared/utils/publicAppOrigin";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export default function MeusEleitores() {
  const { user } = useAuth();
  const { isAdmin, role, loading: roleLoading } = useUserRole();
  const qc = useQueryClient();

  const { data: cabo, isLoading: loadingCabo } = useQuery({
    queryKey: ["meu-cabo", user?.id],
    enabled: !!user && !roleLoading && !isAdmin,
    queryFn: () => liderancasCabosService.meuCabo(user!.id),
  });

  const { data: eleitores = [] } = useQuery({
    queryKey: ["meus-eleitores", cabo?.id],
    enabled: !!cabo,
    queryFn: () => liderancasCabosService.eleitoresDoCabo(cabo!.id),
  });

  const { data: links = [] } = useQuery({
    queryKey: ["meus-links", cabo?.id],
    enabled: !!cabo,
    queryFn: () => liderancasCabosService.listarLinks(cabo!.id),
  });

  const { data: serie7d = [] } = useQuery({
    queryKey: ["meu-cabo-serie", cabo?.id],
    enabled: !!cabo,
    queryFn: () => hierarquiaDashboardService.serieMeuCabo7d(cabo!.id),
  });

  const { data: metasProg = [] } = useQuery({
    queryKey: ["meu-cabo-metas", cabo?.id],
    enabled: !!cabo,
    queryFn: () => metasGamificacaoService.progressoMetasAtivas({ caboId: cabo!.id }),
  });

  const { data: minhasBadges = [] } = useQuery({
    queryKey: ["meu-cabo-badges", cabo?.id],
    enabled: !!cabo,
    queryFn: () => metasGamificacaoService.badgesDoCabo(cabo!.id),
  });

  const { data: ranking = [] } = useQuery({
    queryKey: ["ranking-do-cabo", cabo?.lideranca_id],
    enabled: !!cabo,
    queryFn: () => metasGamificacaoService.ranking({ liderancaId: cabo!.lideranca_id ?? undefined, limit: 50 }),
  });

  const [openManual, setOpenManual] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", bairro: "", cidade: "", uf: "" });
  const [openQR, setOpenQR] = useState<string | null>(null);

  if (roleLoading || (!isAdmin && loadingCabo)) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }
  // Admin e Liderança não-cabo veem a visão escopada (toda a base / da liderança)
  if (isAdmin || role === "lideranca" || !cabo) {
    return <VotersList />;
  }

  const baseUrl = publicAppOrigin();
  const linkUrl = (token: string) => `${baseUrl}/cabo/r/${token}`;

  async function cadastrarManual() {
    if (!form.nome || form.telefone.replace(/\D/g, "").length < 10) {
      return toast.error("Nome e telefone válidos são obrigatórios");
    }
    try {
      await liderancasCabosService.cadastrarEleitorManual(form);
      toast.success("Eleitor cadastrado");
      setOpenManual(false);
      setForm({ nome: "", telefone: "", bairro: "", cidade: "", uf: "" });
      qc.invalidateQueries({ queryKey: ["meus-eleitores"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function gerarLink(tipo: "link" | "qrcode") {
    try {
      await liderancasCabosService.criarLink({
        cabo_eleitoral_id: cabo.id,
        company_id: cabo.company_id,
        tipo,
        nome: tipo === "qrcode" ? "QR Code" : "Link",
      });
      qc.invalidateQueries({ queryKey: ["meus-links"] });
      toast.success(tipo === "qrcode" ? "QR Code gerado" : "Link gerado");
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggleLink(id: string, ativo: boolean) {
    await liderancasCabosService.toggleLink(id, ativo);
    qc.invalidateQueries({ queryKey: ["meus-links"] });
  }
  async function removerLink(id: string) {
    if (!confirm("Remover este link?")) return;
    await liderancasCabosService.removerLink(id);
    qc.invalidateQueries({ queryKey: ["meus-links"] });
  }

  const stats = useMemo(() => ({
    total: eleitores.length,
    ativos: eleitores.filter((e: any) => e.ativo).length,
    viaLink: eleitores.filter((e: any) => e.origem === "Link Cabo").length,
    manual: eleitores.filter((e: any) => e.origem === "Manual Cabo").length,
  }), [eleitores]);

  const origemData = useMemo(() => {
    const map: Record<string, number> = {};
    eleitores.forEach((e: any) => { map[e.origem || "—"] = (map[e.origem || "—"] ?? 0) + 1; });
    return Object.entries(map).map(([nome, qtd]) => ({ nome, qtd }));
  }, [eleitores]);

  const origemColors = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#6366f1"];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />Meus Eleitores</h1>
        <p className="text-sm text-muted-foreground">Cabo: <b>{cabo.nome}</b></p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Ativos" value={stats.ativos} />
        <Stat label="Via Link/QR" value={stats.viaLink} />
        <Stat label="Manual" value={stats.manual} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Cadastros (últimos 7 dias)</CardTitle></CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie7d}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cadastros" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Origem dos cadastros</CardTitle></CardHeader>
          <CardContent className="h-60">
            {origemData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={origemData} dataKey="qtd" nameKey="nome" outerRadius={80} label>
                    {origemData.map((_, i) => (
                      <Cell key={i} fill={origemColors[i % origemColors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />Minhas metas ativas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {metasProg.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma meta atribuída no momento.</p>}
            {metasProg.map(p => (
              <div key={p.meta.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.meta.titulo}</span>
                  <span>{p.realizado}/{p.meta.quantidade_alvo} ({p.percentual}%)</span>
                </div>
                <Progress value={p.percentual} />
                <div className="text-xs text-muted-foreground">{p.meta.tipo_periodo} · {p.meta.data_inicio} → {p.meta.data_fim}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />Minhas conquistas</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {minhasBadges.length === 0 && <p className="text-sm text-muted-foreground">Sem conquistas ainda.</p>}
            {minhasBadges.map(b => (
              <div key={b.id} title={b.badge?.descricao ?? ""} className="flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                style={{ borderColor: b.badge?.cor, color: b.badge?.cor }}>
                <Award className="h-3.5 w-3.5" />
                <span className="font-medium">{b.badge?.nome}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ranking da minha liderança</CardTitle></CardHeader>
        <CardContent className="p-0">
          {ranking.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Sem dados.</p> :
            <div className="divide-y">
              {ranking.slice(0, 10).map(r => (
                <div key={r.cabo_id} className={`flex items-center justify-between p-3 ${r.cabo_id === cabo.id ? "bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${r.posicao === 1 ? "bg-yellow-500 text-white" : r.posicao === 2 ? "bg-gray-400 text-white" : r.posicao === 3 ? "bg-amber-700 text-white" : "bg-muted"}`}>{r.posicao}</div>
                    <div className="text-sm font-medium">{r.cabo_nome} {r.cabo_id === cabo.id && <span className="text-xs text-primary">(você)</span>}</div>
                  </div>
                  <div className="font-bold">{r.total}</div>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="captacao">Captação (Link / QR)</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setOpenManual(true)}><Plus className="h-4 w-4 mr-2" />Cadastrar manual</Button>
          </div>
          <Card><CardContent className="p-0">
            {eleitores.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhum eleitor ainda.</p>
            ) : (
              <div className="divide-y">
                {eleitores.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-medium">{e.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.telefone} · {e.bairro || "—"} · {e.cidade || "—"}/{e.uf || "—"} · {e.origem}
                      </div>
                    </div>
                    <Badge variant={e.ativo ? "default" : "secondary"}>{e.ativo ? "ativo" : "inativo"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="captacao" className="space-y-3">
          <div className="flex gap-2">
            <Button onClick={() => gerarLink("link")}><LinkIcon className="h-4 w-4 mr-2" />Novo Link</Button>
            <Button variant="outline" onClick={() => gerarLink("qrcode")}><QrCode className="h-4 w-4 mr-2" />Novo QR Code</Button>
          </div>

          <Card><CardHeader><CardTitle>Meus links e QR Codes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {links.length === 0 && <p className="text-sm text-muted-foreground">Nenhum link gerado ainda.</p>}
            {links.map((l) => (
              <div key={l.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {l.tipo === "qrcode" ? <QrCode className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                      {l.nome || l.tipo}
                      <Badge variant={l.ativo ? "default" : "secondary"}>{l.ativo ? "ativo" : "inativo"}</Badge>
                      <span className="text-xs text-muted-foreground">{l.total_cadastros} cadastros</span>
                    </div>
                    <code className="text-xs text-muted-foreground break-all">{linkUrl(l.token)}</code>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(linkUrl(l.token)); toast.success("Link copiado"); }}><Copy className="h-4 w-4" /></Button>
                    {l.tipo === "qrcode" && <Button size="icon" variant="ghost" onClick={() => setOpenQR(l.token)}><QrCode className="h-4 w-4" /></Button>}
                    <Button size="icon" variant="ghost" onClick={() => toggleLink(l.id, !l.ativo)}><Power className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => removerLink(l.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openManual} onOpenChange={setOpenManual}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar eleitor manualmente</DialogTitle>
            <DialogDescription>O eleitor será atribuído automaticamente a você.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Telefone *</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Bairro</Label><Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
              <div><Label>UF</Label><Input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} maxLength={2} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenManual(false)}>Cancelar</Button>
            <Button onClick={cadastrarManual}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openQR} onOpenChange={(o) => !o && setOpenQR(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code de cadastro</DialogTitle>
            <DialogDescription>Aponte a câmera do celular para o QR Code.</DialogDescription>
          </DialogHeader>
          {openQR && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={linkUrl(openQR)} size={240} />
              </div>
              <code className="text-xs text-muted-foreground break-all text-center">{linkUrl(openQR)}</code>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent></Card>
  );
}