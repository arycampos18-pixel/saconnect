import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, Check, QrCode, Trash2, ToggleLeft, ToggleRight, Link2, MessageCircle, FileText, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { encurtarUrl } from "@/shared/utils/urlShortener";

const sb: any = supabase;

type LinkCurto = {
  id: string;
  codigo: string;
  tipo: "url" | "whatsapp" | "formulario" | "download";
  titulo: string | null;
  destino: string | null;
  telefone: string | null;
  mensagem: string | null;
  token_ref: string | null;
  cliques: number;
  ativo: boolean;
  created_at: string;
};

const tipoIcon = (tipo: string) => {
  switch (tipo) {
    case "whatsapp": return <MessageCircle className="h-4 w-4 text-[#25D366]" />;
    case "formulario": return <FileText className="h-4 w-4 text-blue-500" />;
    case "download": return <ExternalLink className="h-4 w-4 text-purple-500" />;
    default: return <Link2 className="h-4 w-4 text-primary" />;
  }
};

const tipoLabel = (tipo: string) => {
  switch (tipo) {
    case "whatsapp": return "WhatsApp";
    case "formulario": return "Formulário";
    case "download": return "Download";
    default: return "URL";
  }
};

function gerarCodigo(titulo?: string) {
  const base = titulo ? titulo.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 15) : "";
  const rand = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${rand}` : rand;
}

export default function GerenciadorLinks() {
  const qc = useQueryClient();
  const { currentCompany } = useCompany();
  const cid = currentCompany?.id ?? null;

  const { data: links = [], isLoading } = useQuery<LinkCurto[]>({
    queryKey: ["links-curtos", cid],
    queryFn: async () => {
      const { data, error } = await sb.from("links_curtos").select("*").eq("company_id", cid).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!cid,
  });

  const [open, setOpen] = useState(false);
  const [qrLink, setQrLink] = useState<LinkCurto | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: "", codigo: "", tipo: "url" as LinkCurto["tipo"],
    destino: "", telefone: "", mensagem: "", token_ref: "",
  });

  const urlBase = `${window.location.origin}`;

  const urlDoLink = (link: LinkCurto) => {
    const prefix = link.tipo === "whatsapp" ? "/w/" : "/l/";
    return `${urlBase}${prefix}${link.codigo}`;
  };

  const copiar = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const el = document.createElement("textarea");
      el.value = text; el.style.cssText = "position:fixed;top:-9999px";
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopiedId(id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const abrirNovo = () => {
    setForm({ titulo: "", codigo: gerarCodigo(), tipo: "url", destino: "", telefone: "", mensagem: "", token_ref: "" });
    setOpen(true);
  };

  const onTipoChange = (t: LinkCurto["tipo"]) => {
    setForm((f) => ({ ...f, tipo: t, codigo: gerarCodigo(f.titulo) }));
  };

  const salvar = async () => {
    if (!form.codigo.trim()) return toast.error("Informe o código do link");
    if (form.tipo === "whatsapp" && !form.telefone.replace(/\D/g, "")) return toast.error("Informe o telefone do WhatsApp");
    if (form.tipo !== "whatsapp" && form.tipo !== "formulario" && !form.destino.trim()) return toast.error("Informe a URL de destino");
    setSaving(true);
    try {
      const payload: any = {
        codigo: form.codigo.toLowerCase().trim(),
        tipo: form.tipo,
        titulo: form.titulo || null,
        destino: form.destino || null,
        telefone: form.telefone.replace(/\D/g, "") || null,
        mensagem: form.mensagem || null,
        token_ref: form.token_ref || null,
        company_id: cid,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      };
      const { error } = await sb.from("links_curtos").insert(payload);
      if (error) throw error;
      toast.success("Link criado com sucesso!");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["links-curtos", cid] });
    } catch (e: any) {
      toast.error(e.message?.includes("unique") ? "Este código já está em uso. Escolha outro." : e.message ?? "Erro ao criar link");
    } finally { setSaving(false); }
  };

  const toggleAtivo = async (link: LinkCurto) => {
    await sb.from("links_curtos").update({ ativo: !link.ativo }).eq("id", link.id);
    qc.invalidateQueries({ queryKey: ["links-curtos", cid] });
  };

  const remover = async (id: string) => {
    if (!confirm("Remover este link?")) return;
    await sb.from("links_curtos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["links-curtos", cid] });
    toast.success("Link removido");
  };

  const compartilharWA = async (link: LinkCurto) => {
    const url = urlDoLink(link);
    const curto = await encurtarUrl(url);
    const msg = encodeURIComponent(`Acesse pelo link:\n${curto}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" /> Gerenciador de Links
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie links curtos para WhatsApp, formulários, URLs e QR Codes.
          </p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" /> Novo Link</Button>
      </div>

      {/* Exemplos de prefixos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { prefix: "/l/", desc: "Link genérico / redirect", icon: <Link2 className="h-4 w-4" />, color: "text-primary" },
          { prefix: "/w/", desc: "WhatsApp direto", icon: <MessageCircle className="h-4 w-4" />, color: "text-[#25D366]" },
          { prefix: "/go/", desc: "Alias alternativo", icon: <ExternalLink className="h-4 w-4" />, color: "text-purple-500" },
          { prefix: "/form/", desc: "Formulário público", icon: <FileText className="h-4 w-4" />, color: "text-blue-500" },
        ].map((p) => (
          <Card key={p.prefix} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <span className={p.color}>{p.icon}</span>
              <div>
                <p className="text-xs font-mono font-semibold">{window.location.hostname}{p.prefix}<span className="text-muted-foreground">codigo</span></p>
                <p className="text-[10px] text-muted-foreground">{p.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela de links */}
      <Card>
        <CardHeader><CardTitle className="text-base">Links criados ({links.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando…</div>
          ) : links.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhum link criado ainda. Clique em <strong>Novo Link</strong> para começar.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Código / Título</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-center">Cliques</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => {
                  const url = urlDoLink(link);
                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {tipoIcon(link.tipo)}
                          <span className="text-xs text-muted-foreground">{tipoLabel(link.tipo)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium">{link.titulo ?? link.codigo}</p>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-blue-600 hover:underline">
                            {url.replace(window.location.origin, "")}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {link.tipo === "whatsapp"
                          ? `wa.me/${link.telefone}`
                          : link.destino ?? "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs font-medium">{link.cliques}</TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => toggleAtivo(link)} title={link.ativo ? "Desativar" : "Ativar"}>
                          {link.ativo
                            ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                            : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" title="Copiar link" onClick={() => copiar(url, link.id)}>
                            {copiedId === link.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" title="QR Code" onClick={() => setQrLink(link)}>
                            <QrCode className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Compartilhar WhatsApp" onClick={() => compartilharWA(link)}>
                            <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Remover" className="hover:text-destructive" onClick={() => remover(link.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog novo link */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo link curto</DialogTitle>
            <DialogDescription>Configure o redirecionamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo de link</Label>
              <Select value={form.tipo} onValueChange={onTipoChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">🔗 URL / Redirect</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp direto</SelectItem>
                  <SelectItem value="formulario">📋 Formulário público</SelectItem>
                  <SelectItem value="download">⬇️ Download / arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título (opcional)</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: WhatsApp Suporte" />
            </div>
            <div>
              <Label>Código do link</Label>
              <div className="flex gap-2">
                <span className="flex items-center text-xs text-muted-foreground bg-muted rounded-l-md px-2 border border-r-0 shrink-0">
                  {form.tipo === "whatsapp" ? "/w/" : "/l/"}
                </span>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "") })}
                  className="rounded-l-none"
                  placeholder="vendas"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                URL final: <span className="font-mono">{urlBase}/{form.tipo === "whatsapp" ? "w" : "l"}/{form.codigo || "codigo"}</span>
              </p>
            </div>

            {form.tipo === "whatsapp" && (
              <>
                <div>
                  <Label>Telefone (com código do país)</Label>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value.replace(/\D/g, "") })} placeholder="5567999998080" inputMode="numeric" />
                </div>
                <div>
                  <Label>Mensagem pré-preenchida (opcional)</Label>
                  <Textarea value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} placeholder="Olá! Vim pelo link..." rows={2} />
                </div>
              </>
            )}

            {(form.tipo === "url" || form.tipo === "download") && (
              <div>
                <Label>URL de destino</Label>
                <Input value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} placeholder="https://exemplo.com" type="url" />
              </div>
            )}

            {form.tipo === "formulario" && (
              <div>
                <Label>Token do formulário</Label>
                <Input value={form.token_ref} onChange={(e) => setForm({ ...form, token_ref: e.target.value })} placeholder="Cole o token do link de cadastro" />
                <p className="text-xs text-muted-foreground mt-1">Gere um token em Eleitores → Novo Eleitor → Compartilhar link</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Criar link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog QR Code */}
      <Dialog open={!!qrLink} onOpenChange={() => setQrLink(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>{qrLink?.titulo ?? qrLink?.codigo}</DialogDescription>
          </DialogHeader>
          {qrLink && (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl border-2 border-border bg-white p-4">
                <QRCodeCanvas value={urlDoLink(qrLink)} size={200} fgColor="#1E3A8A" bgColor="#FFFFFF" includeMargin level="M" />
              </div>
              <a href={urlDoLink(qrLink)} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-blue-600 underline break-all text-center">
                {urlDoLink(qrLink)}
              </a>
              <Button className="w-full" variant="outline" onClick={() => {
                const canvas = document.querySelector<HTMLCanvasElement>(".rounded-xl canvas");
                if (!canvas) return;
                const a = document.createElement("a");
                a.href = canvas.toDataURL("image/png");
                a.download = `qr-${qrLink.codigo}.png`;
                a.click();
              }}>
                ⬇️ Baixar PNG
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
