import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../contexts/CompanyContext";
import { settingsService } from "../services/settingsService";

export default function CompaniesManager() {
  const { isSuperAdmin, reload } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ razao_social: "", nome_fantasia: "", cnpj: "", plan: "basic", status: "active" as const });
  const [saving, setSaving] = useState(false);

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["settings_companies_list"],
    queryFn: () => settingsService.listarEmpresas(),
    enabled: isSuperAdmin,
  });

  if (!isSuperAdmin) {
    return <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">Apenas Super Admins podem gerenciar empresas.</div>;
  }

  async function criar() {
    setSaving(true);
    try {
      await settingsService.criarEmpresa(form);
      toast.success("Empresa criada");
      setOpen(false);
      setForm({ razao_social: "", nome_fantasia: "", cnpj: "", plan: "basic", status: "active" });
      qc.invalidateQueries({ queryKey: ["settings_companies_list"] });
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function alterarStatus(id: string, status: "active" | "inactive" | "suspended") {
    try {
      await settingsService.atualizarEmpresa(id, { status });
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["settings_companies_list"] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Empresas (tenants)</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nova empresa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova empresa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Razão social</Label><Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} /></div>
              <div><Label>Nome fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
              <div><Label>Plano</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={criar} disabled={saving || !form.razao_social || !form.nome_fantasia}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome fantasia</TableHead>
                <TableHead>Razão social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome_fantasia}</TableCell>
                  <TableCell>{c.razao_social}</TableCell>
                  <TableCell>{c.cnpj ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.plan}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select value={c.status} onValueChange={(v: any) => alterarStatus(c.id, v)}>
                      <SelectTrigger className="h-8 w-[140px] ml-auto"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}