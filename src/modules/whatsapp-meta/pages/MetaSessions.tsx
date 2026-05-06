import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { metaService, MetaSession } from "@/modules/whatsapp-meta/services/whatsappMetaService";
import { toast } from "sonner";
import { Copy, ExternalLink, Plus, Trash2, RefreshCw } from "lucide-react";

const statusVariant = (s: string) => {
  if (s === "verified" || s === "active") return "default";
  if (s === "error") return "destructive";
  return "secondary";
};

export default function MetaSessions() {
  const qc = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["meta-sessions"],
    queryFn: () => metaService.listSessions(),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MetaSession | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone_number_id: "",
    waba_id: "",
    app_id: "",
    app_secret: "",
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        phone_number_id: editing.phone_number_id,
        waba_id: editing.waba_id,
        app_id: editing.app_id ?? "",
        app_secret: editing.app_secret ?? "",
      });
    } else {
      setForm({ name: "", phone_number_id: "", waba_id: "", app_id: "", app_secret: "" });
    }
  }, [editing, open]);

  const save = async () => {
    try {
      if (!form.name || !form.phone_number_id || !form.waba_id) {
        toast.error("Preencha nome, phone_number_id e waba_id");
        return;
      }
      if (editing) {
        await metaService.updateSession(editing.id, form);
        toast.success("Sessão atualizada");
      } else {
        await metaService.createSession(form);
        toast.success("Sessão criada");
      }
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["meta-sessions"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Deletar esta sessão?")) return;
    await metaService.deleteSession(id);
    qc.invalidateQueries({ queryKey: ["meta-sessions"] });
  };

  const startOAuth = (session: MetaSession) => {
    if (!session.app_id) {
      toast.error("Defina o App ID antes de iniciar o OAuth");
      return;
    }
    const redirect = `${window.location.origin}/app/wa-meta/oauth-callback`;
    sessionStorage.setItem("meta_oauth_session_id", session.id);
    sessionStorage.setItem("meta_oauth_redirect", redirect);
    window.location.href = metaService.buildOAuthUrl(session.app_id, redirect, session.id);
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copiado");
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sessões Meta</h2>
          <p className="text-sm text-muted-foreground">Conexões com a Cloud API por número.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova sessão
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Phone Number ID</TableHead>
            <TableHead>WABA ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Webhook</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={6}>Carregando…</TableCell></TableRow>}
          {!isLoading && sessions.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhuma sessão.</TableCell></TableRow>
          )}
          {sessions.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell className="font-mono text-xs">{s.phone_number_id}</TableCell>
              <TableCell className="font-mono text-xs">{s.waba_id}</TableCell>
              <TableCell><Badge variant={statusVariant(s.status) as any}>{s.status}</Badge></TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px]">{s.verify_token.slice(0, 12)}…</span>
                  <Button size="icon" variant="ghost" onClick={() => copy(metaService.webhookUrl(s.verify_token))}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" variant="outline" onClick={() => startOAuth(s)}>
                  <ExternalLink className="h-3 w-3 mr-1" /> OAuth
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(s); setOpen(true); }}>Editar</Button>
                <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar sessão Meta" : "Nova sessão Meta"}</DialogTitle>
            <DialogDescription>
              Informe os dados do seu WhatsApp Business Account. Após salvar, use o botão "OAuth" para autenticar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone Number ID</Label><Input value={form.phone_number_id} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} /></div>
            <div><Label>WABA ID</Label><Input value={form.waba_id} onChange={(e) => setForm({ ...form, waba_id: e.target.value })} /></div>
            <div><Label>App ID (Meta)</Label><Input value={form.app_id} onChange={(e) => setForm({ ...form, app_id: e.target.value })} /></div>
            <div><Label>App Secret</Label><Input type="password" value={form.app_secret} onChange={(e) => setForm({ ...form, app_secret: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}