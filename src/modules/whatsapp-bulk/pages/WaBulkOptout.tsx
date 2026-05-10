import { useEffect, useState } from "react";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { waBulkService, downloadCsv } from "../services/waBulkService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, Upload, Download, ShieldOff, Search } from "lucide-react";

export default function WaBulkOptout() {
  const { currentCompany } = useCompany();
  const [items, setItems] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openImp, setOpenImp] = useState(false);
  const [novo, setNovo] = useState({ telefone: "", motivo: "" });
  const [imp, setImp] = useState({ texto: "", motivo: "" });

  async function carregar() {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const data = await waBulkService.listarOptout(currentCompany.id, busca);
      setItems(data);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar opt-out");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [currentCompany?.id]);

  async function adicionar() {
    if (!currentCompany || !novo.telefone.trim()) return;
    try {
      await waBulkService.adicionarOptout(currentCompany.id, novo.telefone, novo.motivo || undefined);
      toast.success("Adicionado à lista de opt-out");
      setNovo({ telefone: "", motivo: "" });
      setOpenAdd(false);
      carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  }

  async function remover(id: string) {
    if (!confirm("Remover este número da lista de opt-out?")) return;
    try {
      await waBulkService.removerOptout(id);
      toast.success("Removido");
      carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  }

  async function importar() {
    if (!currentCompany || !imp.texto.trim()) return;
    const linhas = imp.texto.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!linhas.length) return;
    try {
      const r = await waBulkService.importarOptout(currentCompany.id, linhas, imp.motivo || undefined);
      toast.success(`Importados: ${r.ok} • Erros: ${r.erros}`);
      setImp({ texto: "", motivo: "" });
      setOpenImp(false);
      carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  }

  async function exportar() {
    if (!currentCompany) return;
    const csv = await waBulkService.exportOptoutCsv(currentCompany.id);
    downloadCsv(`optout-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  function badgeOrigem(o: string) {
    const map: Record<string, string> = {
      manual: "secondary",
      palavra_chave: "default",
      webhook: "outline",
      import: "outline",
    };
    return <Badge variant={(map[o] ?? "outline") as any}>{o}</Badge>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5" />
            Lista de opt-out (DNC / LGPD)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Números nesta lista são automaticamente bloqueados em todas as campanhas.
            Cumpre a Lei Geral de Proteção de Dados (LGPD) e políticas da Meta.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por telefone ou motivo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregar()}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={carregar} disabled={loading}>
              Buscar
            </Button>

            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar à lista de opt-out</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      placeholder="+55 11 99999-9999"
                      value={novo.telefone}
                      onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Motivo (opcional)</Label>
                    <Input
                      placeholder="Ex: Solicitou descadastro"
                      value={novo.motivo}
                      onChange={(e) => setNovo({ ...novo, motivo: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancelar</Button>
                  <Button onClick={adicionar}>Adicionar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={openImp} onOpenChange={setOpenImp}>
              <DialogTrigger asChild>
                <Button variant="outline"><Upload className="h-4 w-4 mr-1" /> Importar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Importar lista de opt-out</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Telefones (um por linha, ou separados por vírgula)</Label>
                    <Textarea
                      rows={8}
                      placeholder="+5511999999999&#10;+5511888888888"
                      value={imp.texto}
                      onChange={(e) => setImp({ ...imp, texto: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Motivo (aplicado a todos)</Label>
                    <Input
                      placeholder="Ex: Importação CRM"
                      value={imp.motivo}
                      onChange={(e) => setImp({ ...imp, motivo: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenImp(false)}>Cancelar</Button>
                  <Button onClick={importar}>Importar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={exportar}>
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
          </div>

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="p-2">Telefone</th>
                  <th className="p-2">Motivo</th>
                  <th className="p-2">Origem</th>
                  <th className="p-2">Adicionado</th>
                  <th className="p-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">
                    {loading ? "Carregando..." : "Nenhum número na lista de opt-out"}
                  </td></tr>
                )}
                {items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2 font-mono">{it.telefone}</td>
                    <td className="p-2">{it.motivo ?? "—"}</td>
                    <td className="p-2">{badgeOrigem(it.origem)}</td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(it.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-2">
                      <Button size="icon" variant="ghost" onClick={() => remover(it.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Total: <strong>{items.length}</strong> número(s) bloqueado(s).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
