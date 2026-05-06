import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, History, Eye, Download, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { atendimentoService, type Conversa } from "../services/atendimentoService";
import { formatPhoneBR } from "@/shared/utils/phone";

export default function Historico() {
  const [busca, setBusca] = useState("");
  const [filtroDep, setFiltroDep] = useState<string>("todos");
  const [verConversa, setVerConversa] = useState<Conversa | null>(null);

  const { data: departamentos = [] } = useQuery({
    queryKey: ["departamentos-ativos"],
    queryFn: () => atendimentoService.listarDepartamentos(),
  });

  const { data: conversas = [] } = useQuery({
    queryKey: ["historico-conversas", filtroDep],
    queryFn: () => atendimentoService.listarConversas({
      status: "Atendido",
      departamentoId: filtroDep === "todos" ? null : filtroDep,
    }),
  });

  const filtradas = conversas.filter((c) => {
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return (c.contato_nome ?? "").toLowerCase().includes(t) || (c.telefone ?? "").includes(t);
  });

  const { data: mensagens = [] } = useQuery({
    queryKey: ["historico-msgs", verConversa?.id],
    queryFn: () => verConversa ? atendimentoService.listarMensagens(verConversa.id) : Promise.resolve([]),
    enabled: !!verConversa,
  });

  const exportar = () => {
    if (!verConversa) return;
    const linhas = mensagens.map((m) =>
      `[${new Date(m.created_at).toLocaleString("pt-BR")}] ${m.direcao === "entrada" ? "Cliente" : "Atendente"}: ${m.conteudo ?? "[" + m.tipo + "]"}`
    );
    const blob = new Blob([linhas.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversa-${verConversa.telefone}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarPDF = () => {
    if (!verConversa) return;
    const titulo = `Conversa - ${verConversa.contato_nome ?? formatPhoneBR(verConversa.telefone)}`;
    const linhas = mensagens.map((m) => {
      const quem = m.direcao === "entrada" ? "Cliente" : "Atendente";
      const data = new Date(m.created_at).toLocaleString("pt-BR");
      const cor = m.direcao === "entrada" ? "#f3f4f6" : "#dbeafe";
      const align = m.direcao === "entrada" ? "left" : "right";
      const conteudo = (m.conteudo ?? `[${m.tipo}]`).replace(/</g, "&lt;").replace(/\n/g, "<br/>");
      return `<div style="text-align:${align};margin:6px 0;"><div style="display:inline-block;max-width:75%;background:${cor};padding:8px 12px;border-radius:8px;text-align:left;"><div style="font-size:11px;color:#6b7280;margin-bottom:2px;"><b>${quem}</b> · ${data}</div><div>${conteudo}</div></div></div>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
      <style>body{font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:24px auto;padding:0 20px;color:#111;}h1{font-size:18px;border-bottom:2px solid #2563eb;padding-bottom:8px;}.meta{color:#6b7280;font-size:12px;margin-bottom:20px;}@media print{body{margin:0;}}</style>
      </head><body><h1>${titulo}</h1>
      <div class="meta">Telefone: ${formatPhoneBR(verConversa.telefone)} · Status: ${verConversa.status} · Total de mensagens: ${mensagens.length}</div>
      ${linhas}
      <script>window.onload=()=>window.print();</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" /> Histórico de Conversas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou telefone…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={filtroDep} onValueChange={setFiltroDep}>
            <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos departamentos</SelectItem>
              {departamentos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Última mensagem</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 && (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhuma conversa encontrada.</TableCell></TableRow>
              )}
              {filtradas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.contato_nome ?? "Sem nome"}</TableCell>
                  <TableCell>{formatPhoneBR(c.telefone)}</TableCell>
                  <TableCell className="max-w-xs truncate">{c.ultima_mensagem ?? "—"}</TableCell>
                  <TableCell>{c.ultima_mensagem_em ? new Date(c.ultima_mensagem_em).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setVerConversa(c)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!verConversa} onOpenChange={(o) => !o && setVerConversa(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{verConversa?.contato_nome ?? formatPhoneBR(verConversa?.telefone ?? "")}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportar}>
                    <Download className="mr-2 h-4 w-4" /> TXT
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportarPDF}>
                    <Printer className="mr-2 h-4 w-4" /> PDF
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] rounded-md border p-3">
              <div className="space-y-2">
                {mensagens.map((m) => (
                  <div key={m.id} className={`flex ${m.direcao === "saida" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.direcao === "saida" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <div>{m.conteudo ?? `[${m.tipo}]`}</div>
                      <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                ))}
                {mensagens.length === 0 && <p className="text-center text-sm text-muted-foreground">Sem mensagens.</p>}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}