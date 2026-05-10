import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Formulario = {
  id: string;
  name: string;
  description: string | null;
  link_token: string;
  status: string;
  created_at: string;
};

export default function FormulariosPublicosPanel() {
  const [items, setItems] = useState<Formulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("formularios_publicos")
      .select("id,name,description,link_token,status,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Formulario[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (name.trim().length < 3) { toast.error("Informe um nome com pelo menos 3 caracteres"); return; }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("formularios_publicos")
      .insert({ name: name.trim(), description: description.trim() || null, fields: [], customization: {} });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setName(""); setDescription(""); setOpen(false);
    toast.success("Formulário criado");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este formulário e todas as respostas?")) return;
    const { error } = await (supabase as any).from("formularios_publicos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Formulário removido");
    load();
  };

  const publicUrl = (token: string) =>
    `${window.location.origin}/formulario/${token}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Formulários Públicos</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie formulários customizados e compartilhe um link público para captação.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo Formulário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo formulário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cadastro Apoiadores" />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={create} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum formulário criado. Clique em <strong>+ Novo Formulário</strong> para começar.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((f) => {
              const url = publicUrl(f.link_token);
              return (
                <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{f.name}</p>
                      <Badge variant={f.status === "active" ? "default" : "secondary"}>{f.status}</Badge>
                    </div>
                    {f.description && <p className="truncate text-xs text-muted-foreground">{f.description}</p>}
                    <p className="truncate text-xs text-muted-foreground">{url}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" title="Copiar link" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Abrir" onClick={() => window.open(url, "_blank")}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => remove(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}