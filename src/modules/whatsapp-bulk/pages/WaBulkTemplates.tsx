import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, RefreshCw, Hash, Eye } from "lucide-react";
import { toast } from "sonner";
import { waBulkService, type WaBulkTemplate } from "../services/waBulkService";

function contarVariaveis(texto: string | null | undefined): number {
  if (!texto) return 0;
  const s = new Set<number>();
  for (const m of texto.matchAll(/\{\{(\d+)\}\}/g)) s.add(parseInt(m[1], 10));
  return s.size;
}

export default function WaBulkTemplates() {
  const [items, setItems] = useState<WaBulkTemplate[]>([]);
  const [apis, setApis] = useState<{ id: string; nome: string; waba_id: string | null }[]>([]);
  const [syncApiId, setSyncApiId] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<WaBulkTemplate | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    nome: "", categoria: "UTILITY", idioma: "pt_BR",
    header_content: "", body_text: "", footer_text: "",
  });

  const carregar = async () => {
    setLoading(true);
    try {
      const [tpl, ap] = await Promise.all([
        waBulkService.listTemplates(),
        waBulkService.listApis(),
      ]);
      setItems(tpl);
      setApis(ap.map((a) => ({ id: a.id, nome: a.nome, waba_id: a.waba_id })));
      if (!syncApiId && ap[0]) setSyncApiId(ap[0].id);
    }
    catch (e: any) { toast.error(e.message ?? "Erro"); }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); }, []);

  const sincronizar = async () => {
    if (!syncApiId) { toast.error("Selecione uma API"); return; }
    setSyncing(true);
    try {
      const r = await waBulkService.sincronizarTemplatesMeta(syncApiId);
      toast.success(`Sincronizado: ${r.inserted} novos, ${r.updated} atualizados`);
      carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao sincronizar");
    } finally { setSyncing(false); }
  };

  const salvar = async () => {
    if (!form.nome || !form.body_text) { toast.error("Nome e corpo são obrigatórios"); return; }
    if (!syncApiId) { toast.error("Selecione uma API/WABA para enviar o template"); return; }
    setSaving(true);
    try {
      const created = await waBulkService.createTemplate({
        nome: form.nome,
        categoria: form.categoria as any,
        idioma: form.idioma,
        header_type: form.header_content ? "TEXT" : null,
        header_content: form.header_content || null,
        body_text: form.body_text,
        footer_text: form.footer_text || null,
        status: "pendente",
        api_id: syncApiId,
      });
      toast.message("Enviando template para a Meta...");
      try {
        const r = await waBulkService.submeterTemplateMeta(created.id, syncApiId);
        if (r?.ok === false) {
          toast.error(r.error ?? "Falha ao enviar para a Meta", { duration: 8000 });
        } else {
          toast.success(`Template enviado à Meta (status: ${r?.status ?? "PENDING"})`);
        }
      } catch (err: any) {
        const m = typeof err?.message === "string" ? err.message : String(err);
        toast.error(`Salvo localmente, mas falhou na Meta: ${m}`, { duration: 8000 });
      }
      setOpen(false);
      setForm({ nome: "", categoria: "UTILITY", idioma: "pt_BR", header_content: "", body_text: "", footer_text: "" });
      carregar();
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const remover = async (t: WaBulkTemplate) => {
    if (!confirm(`Excluir template "${t.nome}"?`)) return;
    await waBulkService.deleteTemplate(t.id);
    toast.success("Removido");
    carregar();
  };

  const renderPreview = (text: string) =>
    text.replace(/\{\{(\d+)\}\}/g, (_, n) => `[var ${n}]`);

  const filtrados = items.filter((t) => {
    if (filtroStatus !== "todos" && t.status !== filtroStatus) return false;
    if (busca && !`${t.nome} ${t.body_text}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const contagens = {
    aprovado: items.filter((t) => t.status === "aprovado").length,
    pendente: items.filter((t) => t.status === "pendente").length,
    rejeitado: items.filter((t) => t.status === "rejeitado").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground">
            Modelos HSM aprovados pela Meta · {contagens.aprovado} aprovados · {contagens.pendente} pendentes · {contagens.rejeitado} rejeitados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={syncApiId} onValueChange={setSyncApiId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Selecione API" /></SelectTrigger>
            <SelectContent>
              {apis.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={sincronizar} disabled={syncing || !syncApiId}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar Meta
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo template</Button></DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Novo template</DialogTitle></DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label>Nome (sem espaços) *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value.replace(/\s/g, "_").toLowerCase() })} placeholder="boas_vindas_v1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Categoria</Label>
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTILITY">Utilidade</SelectItem>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Idioma</Label>
                    <Input value={form.idioma} onChange={(e) => setForm({ ...form, idioma: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Header (opcional)</Label>
                  <Input value={form.header_content} onChange={(e) => setForm({ ...form, header_content: e.target.value })} />
                </div>
                <div>
                  <Label>Corpo * (use {"{{1}}"}, {"{{2}}"} para variáveis)</Label>
                  <Textarea rows={5} value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} placeholder="Olá {{1}}, seu pedido {{2}} foi confirmado." />
                </div>
                <div>
                  <Label>Footer (opcional)</Label>
                  <Input value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Preview</Label>
                <div className="mt-2 rounded-xl border bg-muted/30 p-3">
                  <div className="mx-auto max-w-[260px] rounded-lg border bg-background p-3 shadow-sm">
                    {form.header_content && <p className="font-semibold text-sm">{form.header_content}</p>}
                    <p className="mt-1 whitespace-pre-wrap text-sm">{renderPreview(form.body_text || "Conteúdo...")}</p>
                    {form.footer_text && <p className="mt-2 text-xs text-muted-foreground">{form.footer_text}</p>}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Enviar para aprovação"}</Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome ou conteúdo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="rejeitado">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Carregando...</Card>
      ) : filtrados.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {items.length === 0 ? "Nenhum template criado ainda." : "Nenhum template corresponde aos filtros."}
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((t) => {
            const qtdVars = contarVariaveis(t.body_text);
            return (
            <Card key={t.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{t.nome}</h3>
                  <p className="text-xs text-muted-foreground">{t.categoria} · {t.idioma}</p>
                </div>
                <Badge variant={t.status === "aprovado" ? "default" : t.status === "pendente" ? "outline" : "destructive"}>
                  {t.status}
                </Badge>
              </div>
              {t.header_content && <p className="text-sm font-medium">{t.header_content}</p>}
              <p className="text-sm text-muted-foreground line-clamp-3">{renderPreview(t.body_text)}</p>
              {t.footer_text && <p className="text-xs text-muted-foreground">{t.footer_text}</p>}
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="secondary" className="text-xs">
                  <Hash className="mr-1 h-3 w-3" />
                  {qtdVars} {qtdVars === 1 ? "variável" : "variáveis"}
                </Badge>
                {t.rejected_reason && (
                  <span className="text-xs text-destructive line-clamp-1" title={t.rejected_reason}>
                    {t.rejected_reason}
                  </span>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setViewing(t)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remover(t)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing?.nome}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={viewing.status === "aprovado" ? "default" : viewing.status === "pendente" ? "outline" : "destructive"}>
                    {viewing.status}
                  </Badge>
                  <Badge variant="secondary">{viewing.categoria}</Badge>
                  <Badge variant="secondary">{viewing.idioma}</Badge>
                  <Badge variant="secondary">
                    <Hash className="mr-1 h-3 w-3" />
                    {contarVariaveis(viewing.body_text)} variáveis
                  </Badge>
                </div>
                {viewing.meta_template_id && (
                  <div>
                    <Label className="text-xs">Meta Template ID</Label>
                    <p className="font-mono text-xs break-all">{viewing.meta_template_id}</p>
                  </div>
                )}
                {viewing.header_content && (
                  <div>
                    <Label className="text-xs">Header</Label>
                    <p className="whitespace-pre-wrap">{viewing.header_content}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Corpo</Label>
                  <p className="whitespace-pre-wrap">{viewing.body_text}</p>
                </div>
                {viewing.footer_text && (
                  <div>
                    <Label className="text-xs">Footer</Label>
                    <p className="whitespace-pre-wrap text-muted-foreground">{viewing.footer_text}</p>
                  </div>
                )}
                {viewing.rejected_reason && (
                  <div>
                    <Label className="text-xs text-destructive">Motivo da rejeição</Label>
                    <p className="text-destructive whitespace-pre-wrap">{viewing.rejected_reason}</p>
                  </div>
                )}
              </div>
              <div>
                <Label>Preview</Label>
                <div className="mt-2 rounded-xl border bg-muted/30 p-3">
                  <div className="mx-auto max-w-[260px] rounded-lg border bg-background p-3 shadow-sm">
                    {viewing.header_content && <p className="font-semibold text-sm">{viewing.header_content}</p>}
                    <p className="mt-1 whitespace-pre-wrap text-sm">{renderPreview(viewing.body_text || "")}</p>
                    {viewing.footer_text && <p className="mt-2 text-xs text-muted-foreground">{viewing.footer_text}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}