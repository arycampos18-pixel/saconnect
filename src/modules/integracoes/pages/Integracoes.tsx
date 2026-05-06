import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageCircle,
  Send,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Plus,
  Trash2,
  ExternalLink,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { integracoesService, type MensagemStatus, type PostStatus } from "../services/integracoesService";
import { EnviarMensagemDialog } from "../components/EnviarMensagemDialog";
import { NovoPostDialog } from "../components/NovoPostDialog";

const statusMsgVariant: Record<MensagemStatus, string> = {
  Pendente: "bg-yellow-100 text-yellow-800",
  Enviado: "bg-blue-100 text-blue-800",
  Entregue: "bg-green-100 text-green-800",
  Falhou: "bg-red-100 text-red-800",
  Simulado: "bg-purple-100 text-purple-800",
};

const statusPostVariant: Record<PostStatus, string> = {
  Rascunho: "bg-muted text-muted-foreground",
  Agendado: "bg-blue-100 text-blue-800",
  Publicado: "bg-green-100 text-green-800",
  Cancelado: "bg-red-100 text-red-800",
};

export default function Integracoes() {
  const qc = useQueryClient();
  const [openMsg, setOpenMsg] = useState(false);
  const [openPost, setOpenPost] = useState(false);

  const { data: mensagens = [] } = useQuery({
    queryKey: ["integracoes", "mensagens"],
    queryFn: () => integracoesService.listarMensagens(),
  });
  const { data: posts = [] } = useQuery({
    queryKey: ["integracoes", "posts"],
    queryFn: () => integracoesService.listarPosts(),
  });
  const { data: m } = useQuery({
    queryKey: ["integracoes", "metricas"],
    queryFn: () => integracoesService.metricas(),
  });

  const delMsg = useMutation({
    mutationFn: (id: string) => integracoesService.excluirMensagem(id),
    onSuccess: () => {
      toast.success("Mensagem excluída");
      qc.invalidateQueries({ queryKey: ["integracoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delPost = useMutation({
    mutationFn: (id: string) => integracoesService.excluirPost(id),
    onSuccess: () => {
      toast.success("Post excluído");
      qc.invalidateQueries({ queryKey: ["integracoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publicar = useMutation({
    mutationFn: (id: string) => integracoesService.marcarPublicado(id),
    onSuccess: () => {
      toast.success("Marcado como publicado");
      qc.invalidateQueries({ queryKey: ["integracoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrações Externas</h1>
          <p className="text-sm text-muted-foreground">
            WhatsApp via Twilio, SMS (simulado) e planejamento de redes sociais
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{m?.totalMsgs ?? 0}</p>
            <p className="text-xs text-muted-foreground">{m?.whatsapp ?? 0} WhatsApp · {m?.sms ?? 0} SMS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Posts agendados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{m?.agendados ?? 0}</p>
            <p className="text-xs text-muted-foreground">{m?.totalPosts ?? 0} no total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mensagens">
        <TabsList>
          <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
          <TabsTrigger value="sociais">Redes sociais</TabsTrigger>
        </TabsList>

        <TabsContent value="mensagens" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenMsg(true)}>
              <Send className="mr-2 h-4 w-4" /> Nova mensagem
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensagens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma mensagem enviada ainda
                      </TableCell>
                    </TableRow>
                  ) : (
                    mensagens.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell><Badge variant="outline">{msg.canal}</Badge></TableCell>
                        <TableCell>
                          <div className="font-medium">{msg.destinatario_nome || "—"}</div>
                          <div className="text-xs text-muted-foreground">{msg.destinatario}</div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{msg.conteudo}</TableCell>
                        <TableCell>
                          <Badge className={statusMsgVariant[msg.status]}>{msg.status}</Badge>
                          {msg.erro && <div className="mt-1 text-xs text-red-600">{msg.erro}</div>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {msg.enviado_em ? new Date(msg.enviado_em).toLocaleString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => delMsg.mutate(msg.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sociais" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenPost(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo post
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Share2 className="mx-auto mb-2 h-8 w-8" />
                  Nenhum post planejado ainda
                </CardContent>
              </Card>
            )}
            {posts.map((p) => (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <Badge variant="outline" className="mb-2">{p.rede}</Badge>
                    <CardTitle className="text-base">{p.titulo}</CardTitle>
                  </div>
                  <Badge className={statusPostVariant[p.status]}>{p.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {p.conteudo && <p className="text-sm text-muted-foreground line-clamp-3">{p.conteudo}</p>}
                  {p.agendado_para && (
                    <p className="text-xs text-muted-foreground">
                      <Calendar className="mr-1 inline h-3 w-3" />
                      {new Date(p.agendado_para).toLocaleString("pt-BR")}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="mr-1 h-3 w-3" /> Abrir
                        </Button>
                      </a>
                    )}
                    {p.status !== "Publicado" && (
                      <Button size="sm" variant="secondary" onClick={() => publicar.mutate(p.id)}>
                        Marcar publicado
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => delPost.mutate(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <EnviarMensagemDialog open={openMsg} onOpenChange={setOpenMsg} />
      <NovoPostDialog open={openPost} onOpenChange={setOpenPost} />
    </div>
  );
}