import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { metaService } from "@/modules/whatsapp-meta/services/whatsappMetaService";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2 } from "lucide-react";

const statusColor = (s: string) => s === "APPROVED" ? "default" : s === "REJECTED" ? "destructive" : "secondary";

export default function MetaTemplates() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string>("");
  const { data: sessions = [] } = useQuery({ queryKey: ["meta-sessions"], queryFn: () => metaService.listSessions() });
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["meta-templates", sessionId],
    queryFn: () => metaService.listTemplates(sessionId || undefined),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "MARKETING", language: "pt_BR",
    header_text: "", body_text: "", footer_text: "",
  });

  const save = async () => {
    if (!sessionId) return toast.error("Selecione uma sessão");
    if (!form.name || !form.body_text) return toast.error("Nome e corpo obrigatórios");
    try {
      await metaService.createTemplate({ ...form, session_id: sessionId, status: "PENDING" });
      toast.success("Template criado (aguardando aprovação Meta)");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["meta-templates"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sync = async () => {
    if (!sessionId) return toast.error("Selecione uma sessão");
    try {
      const r = await metaService.syncTemplates(sessionId);
      toast.success(`${r.synced_count} templates sincronizados`);
      qc.invalidateQueries({ queryKey: ["meta-templates"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px]">
          <Label>Sessão</Label>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              {sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={sync} disabled={!sessionId}>
            <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar
          </Button>
          <Button onClick={() => setOpen(true)} disabled={!sessionId}>
            <Plus className="mr-2 h-4 w-4" /> Novo template
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Idioma</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={5}>Carregando…</TableCell></TableRow>}
          {!isLoading && templates.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum template.</TableCell></TableRow>
          )}
          {templates.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
              <TableCell>{t.language}</TableCell>
              <TableCell><Badge variant={statusColor(t.status) as any}>{t.status}</Badge></TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={async () => {
                  if (!confirm("Deletar?")) return;
                  await metaService.deleteTemplate(t.id);
                  qc.invalidateQueries({ queryKey: ["meta-templates"] });
                }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome (sem espaços)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Idioma</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt_BR">Português (BR)</SelectItem>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="es_ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Cabeçalho (opcional)</Label><Input value={form.header_text} onChange={(e) => setForm({ ...form, header_text: e.target.value })} /></div>
            <div><Label>Corpo</Label><Textarea rows={5} value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} /></div>
            <div><Label>Rodapé (opcional)</Label><Input value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}