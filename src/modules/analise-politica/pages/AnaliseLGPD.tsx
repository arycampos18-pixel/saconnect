import { useEffect, useState } from "react";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { analiseService } from "../services/analiseService";
import { maskCPF } from "../utils/cpf";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, Trash2, FileDown, AlertTriangle } from "lucide-react";

export default function AnaliseLGPD() {
  const [cons, setCons] = useState<any[]>([]);
  const [sols, setSols] = useState<any[]>([]);
  const [verCpf, setVerCpf] = useState(false);
  const [podeVerCpf, setPodeVerCpf] = useState(false);
  const [podeExportar, setPodeExportar] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form de nova solicitação
  const [novoTipo, setNovoTipo] = useState<"exclusao" | "correcao" | "exportacao" | "revogacao">("exclusao");
  const [novoEleitor, setNovoEleitor] = useState("");
  const [novoMotivo, setNovoMotivo] = useState("");
  const [openNova, setOpenNova] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [c, s, podeCpf, podeExp] = await Promise.all([
        analiseService.lgpdListarConsentimentos(),
        analiseService.lgpdListarSolicitacoes(),
        analiseService.lgpdPodeVerCpf(),
        analiseService.lgpdPodeExportar(),
      ]);
      setCons(c);
      setSols(s);
      setPodeVerCpf(podeCpf);
      setPodeExportar(podeExp);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function revogar(id: string) {
    try {
      await analiseService.lgpdRevogarConsentimento(id, "Solicitação do titular");
      toast.success("Consentimento revogado");
      carregar();
    } catch (e: any) { toast.error(e.message); }
  }

  async function criarSolicitacao() {
    try {
      await analiseService.lgpdCriarSolicitacao({
        eleitor_id: novoEleitor || null,
        tipo: novoTipo,
        motivo: novoMotivo,
      });
      toast.success("Solicitação registrada");
      setOpenNova(false);
      setNovoEleitor(""); setNovoMotivo(""); setNovoTipo("exclusao");
      carregar();
    } catch (e: any) { toast.error(e.message); }
  }

  async function atender(id: string, status: any) {
    try {
      await analiseService.lgpdAtenderSolicitacao(id, status);
      toast.success("Solicitação atualizada");
      carregar();
    } catch (e: any) { toast.error(e.message); }
  }

  async function exportar() {
    if (!podeExportar) {
      toast.error("Você não tem permissão para exportar dados pessoais (LGPD).");
      return;
    }
    const linhas = [["id", "eleitor_id", "tipo", "status", "created_at"], ...sols.map((s) => [s.id, s.eleitor_id, s.tipo, s.status, s.created_at])];
    const csv = linhas.map((l) => l.map((x) => `"${(x ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lgpd-solicitacoes.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída");
  }

  return (
    <PageShell
      title="Segurança & LGPD"
      description="Consentimentos, solicitações de titulares, anonimização e controle de exportação."
      actions={
        <div className="flex gap-2">
          {podeVerCpf && (
            <Button variant="outline" size="sm" onClick={() => setVerCpf((v) => !v)}>
              {verCpf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {verCpf ? "Ocultar CPF" : "Mostrar CPF"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportar} disabled={!podeExportar} title={!podeExportar ? "Sem permissão LGPD" : ""}>
            <FileDown className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
          <Dialog open={openNova} onOpenChange={setOpenNova}>
            <DialogTrigger asChild>
              <Button size="sm"><ShieldCheck className="h-4 w-4 mr-1" /> Nova solicitação</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar solicitação LGPD</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusao">Exclusão</SelectItem>
                      <SelectItem value="correcao">Correção</SelectItem>
                      <SelectItem value="exportacao">Exportação</SelectItem>
                      <SelectItem value="revogacao">Revogação de consentimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ID do eleitor (opcional)</Label>
                  <Input value={novoEleitor} onChange={(e) => setNovoEleitor(e.target.value)} />
                </div>
                <div>
                  <Label>Motivo</Label>
                  <Textarea value={novoMotivo} onChange={(e) => setNovoMotivo(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNova(false)}>Cancelar</Button>
                <Button onClick={criarSolicitacao}>Registrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-2 text-xs">
          <Badge variant={podeVerCpf ? "default" : "outline"}>
            CPF completo: {podeVerCpf ? "permitido" : "mascarado"}
          </Badge>
          <Badge variant={podeExportar ? "default" : "outline"}>
            Exportação: {podeExportar ? "permitida" : "bloqueada"}
          </Badge>
          <Badge variant="secondary">Logs ativos</Badge>
          <Badge variant="secondary">Trilha imutável de consultas API</Badge>
        </CardContent>
      </Card>

      <Tabs defaultValue="solicitacoes">
        <TabsList>
          <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
          <TabsTrigger value="consentimentos">Consentimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes">
          <Card><CardContent className="pt-6">
            {sols.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {loading ? "Carregando…" : "Nenhuma solicitação registrada."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Eleitor</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sols.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><Badge variant="outline">{s.tipo}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{s.eleitor_id ?? "—"}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{s.motivo}</TableCell>
                      <TableCell><Badge>{s.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => atender(s.id, "em_analise")}>Análise</Button>
                        <Button size="sm" variant="ghost" onClick={() => atender(s.id, "aprovada")}>Aprovar</Button>
                        <Button size="sm" variant="ghost" onClick={() => atender(s.id, "concluida")}>Concluir</Button>
                        <Button size="sm" variant="ghost" onClick={() => atender(s.id, "rejeitada")}>Rejeitar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>

          <Card className="mt-4 border-rose-200 bg-rose-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-rose-700">
                <AlertTriangle className="h-4 w-4" /> Direito ao esquecimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Para anonimizar definitivamente um eleitor (apaga dados pessoais e mantém estatística), use a ação Anonimizar na lista de Eleitores ou execute via solicitação aprovada.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consentimentos">
          <Card><CardContent className="pt-6">
            {cons.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {loading ? "Carregando…" : "Nenhum consentimento registrado."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titular</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.titular_nome ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {verCpf && podeVerCpf ? c.titular_documento : maskCPF(c.titular_documento)}
                      </TableCell>
                      <TableCell>{c.finalidade}</TableCell>
                      <TableCell>{c.canal ?? "—"}</TableCell>
                      <TableCell>
                        {c.aceite
                          ? <Badge>aceito</Badge>
                          : <Badge variant="destructive">revogado</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.aceite && (
                          <Button size="sm" variant="ghost" onClick={() => revogar(c.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Revogar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}