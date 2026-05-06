import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { whatsappService } from "../services/whatsappService";
import { ConexaoCard } from "../components/ConexaoCard";
import { EnviarMensagemDialog } from "@/modules/integracoes";

export default function WhatsApp() {
  const [openMsg, setOpenMsg] = useState(false);

  const { data: m } = useQuery({
    queryKey: ["whatsapp", "metricas"],
    queryFn: () => whatsappService.metricas(),
  });
  const { data: mensagens = [] } = useQuery({
    queryKey: ["whatsapp", "mensagens"],
    queryFn: () => whatsappService.listarMensagens(),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Conexão da instância Z-API, status do número e envio de mensagens
          </p>
        </div>
        <Button onClick={() => setOpenMsg(true)}>
          <Send className="mr-2 h-4 w-4" /> Enviar mensagem
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total enviadas</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{m?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{m?.enviadasHoje ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{m?.enviadas ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{m?.falhas ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <ConexaoCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas mensagens enviadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinatário</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mensagens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma mensagem enviada ainda
                  </TableCell>
                </TableRow>
              ) : (
                mensagens.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell>
                      <div className="font-medium">{msg.destinatario_nome || "—"}</div>
                      <div className="text-xs text-muted-foreground">{msg.destinatario}</div>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{msg.conteudo}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          msg.status === "Falhou"
                            ? "bg-red-100 text-red-800"
                            : msg.status === "Enviado" || msg.status === "Entregue"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                        }
                      >
                        {msg.status}
                      </Badge>
                      {msg.erro && <div className="mt-1 text-xs text-red-600">{msg.erro}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {msg.enviado_em ? new Date(msg.enviado_em).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EnviarMensagemDialog open={openMsg} onOpenChange={setOpenMsg} />
    </div>
  );
}