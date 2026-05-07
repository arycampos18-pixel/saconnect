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
import { liderancasCabosService } from "../services/liderancasCabosService";

export default function MeusEleitores() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: cabo, isLoading: loadingCabo } = useQuery({
    queryKey: ["meu-cabo", user?.id],
    enabled: !!user,
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

  const [openManual, setOpenManual] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", bairro: "", cidade: "", uf: "" });
  const [openQR, setOpenQR] = useState<string | null>(null);

  if (loadingCabo) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!cabo) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm">Você ainda não está vinculado a nenhum cabo eleitoral. Peça ao administrador para criar seu cadastro em <b>Cabos Eleitorais</b>.</p>
        </CardContent>
      </Card>
    );
  }

  const baseUrl = window.location.origin;
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