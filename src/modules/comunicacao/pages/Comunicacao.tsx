import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare, Send, Filter, Users, History, CheckCircle2, Smartphone, Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { catalogosService, type Tag } from "@/modules/eleitores/services/catalogosService";
import {
  comunicacaoService, type Mensagem,
} from "@/modules/comunicacao/services/comunicacaoService";
import { useCan } from "@/shared/auth/useCan";

export default function Comunicacao() {
  const { can } = useCan();
  const podeEnviar = can("whatsapp.campanhas.view");
  const [bairro, setBairro] = useState("todos");
  const [tagId, setTagId] = useState("todas");
  const [mensagem, setMensagem] = useState("");
  const [bairros, setBairros] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [destinatarios, setDestinatarios] = useState(0);
  const [contando, setContando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [historico, setHistorico] = useState<Mensagem[]>([]);
  const [carregandoHist, setCarregandoHist] = useState(true);

  useEffect(() => {
    Promise.all([catalogosService.bairros(), catalogosService.tags()]).then(([b, t]) => {
      setBairros(b); setTags(t);
    });
    refreshHistorico();
  }, []);

  useEffect(() => {
    setContando(true);
    comunicacaoService
      .contarDestinatarios({ bairro, tagId })
      .then(setDestinatarios)
      .finally(() => setContando(false));
  }, [bairro, tagId]);

  const refreshHistorico = async () => {
    setCarregandoHist(true);
    try {
      setHistorico(await comunicacaoService.historico());
    } finally {
      setCarregandoHist(false);
    }
  };

  const publicoAlvo = useMemo(() => {
    const partes: string[] = [];
    if (bairro !== "todos") partes.push(`Bairro: ${bairro}`);
    if (tagId !== "todas") {
      const t = tags.find((x) => x.id === tagId);
      if (t) partes.push(`Tag: ${t.nome}`);
    }
    return partes.length ? partes.join(" · ") : "Todos";
  }, [bairro, tagId, tags]);

  const enviar = async (canal: "WhatsApp" | "SMS") => {
    if (!podeEnviar) {
      return toast.error("Você não tem permissão para enviar comunicações.");
    }
    if (!mensagem.trim()) return toast.error("Digite uma mensagem antes de enviar.");
    if (destinatarios === 0) return toast.error("Nenhum destinatário com consentimento LGPD.");
    setEnviando(true);
    try {
      await comunicacaoService.registrar({
        canal,
        conteudo: mensagem.trim(),
        publico_alvo: publicoAlvo,
        total_destinatarios: destinatarios,
        filtro_bairro: bairro !== "todos" ? bairro : null,
        filtro_tag_id: tagId !== "todas" ? tagId : null,
      });
      toast.success(`${destinatarios} mensagens enviadas via ${canal}!`, {
        description: "O envio foi registrado no histórico.",
      });
      setMensagem("");
      refreshHistorico();
    } catch (e: any) {
      toast.error("Erro ao registrar envio: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Comunicação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie mensagens segmentadas e acompanhe o histórico de campanhas.
        </p>
      </div>

      <Tabs defaultValue="nova" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-secondary">
          <TabsTrigger value="nova" className="data-[state=active]:bg-card data-[state=active]:shadow-elegant-sm">
            <MessageSquare className="mr-2 h-4 w-4" /> Nova Mensagem
          </TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-card data-[state=active]:shadow-elegant-sm">
            <History className="mr-2 h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nova" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                  <Filter className="h-4 w-4 text-primary" /> Segmentação
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Bairro</label>
                    <Select value={bairro} onValueChange={setBairro}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os bairros</SelectItem>
                        {bairros.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tag</label>
                    <Select value={tagId} onValueChange={setTagId}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as tags</SelectItem>
                        {tags.map((t) => (<SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
                <h2 className="mb-4 text-base font-semibold">Mensagem</h2>
                <Textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Digite a mensagem que será enviada aos eleitores selecionados..."
                  rows={7}
                  className="resize-none"
                  maxLength={500}
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Mensagens curtas têm maior taxa de leitura</span>
                  <span>{mensagem.length}/500</span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => enviar("WhatsApp")}
                    disabled={enviando || !podeEnviar}
                    title={!podeEnviar ? "Sem permissão para enviar" : undefined}
                    className="h-12 bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]"
                  >
                    {enviando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MessageSquare className="mr-2 h-5 w-5" />}
                    Enviar via WhatsApp
                  </Button>
                  <Button
                    onClick={() => enviar("SMS")}
                    disabled={enviando || !podeEnviar}
                    title={!podeEnviar ? "Sem permissão para enviar" : undefined}
                    variant="outline"
                    className="h-12 border-primary text-primary hover:bg-primary/10"
                  >
                    {enviando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Smartphone className="mr-2 h-5 w-5" />}
                    Enviar via SMS
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-primary p-6 text-primary-foreground shadow-elegant-md">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-primary-foreground/70">
                  <Users className="h-3.5 w-3.5" /> Destinatários
                </div>
                <div className="text-4xl font-bold">
                  {contando ? <Loader2 className="h-8 w-8 animate-spin" /> : destinatarios.toLocaleString("pt-BR")}
                </div>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  eleitores correspondem aos filtros e têm consentimento LGPD
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 shadow-elegant-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Boas práticas</p>
                <ul className="space-y-2 text-sm">
                  {[
                    "Mantenha mensagens claras e diretas",
                    "Inclua identificação do gabinete",
                    "Sempre ofereça opção de descadastro",
                    "Respeite horários comerciais",
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2 text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <div className="rounded-xl border border-border bg-card shadow-elegant-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold">Histórico de Envios</h2>
              <p className="text-sm text-muted-foreground">{historico.length} campanhas registradas</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Data</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Público-alvo</TableHead>
                    <TableHead className="hidden md:table-cell">Mensagem</TableHead>
                    <TableHead className="text-right">Destinatários</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carregandoHist ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : historico.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Nenhuma mensagem enviada ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historico.map((m) => (
                      <TableRow key={m.id} className="border-border">
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(m.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge className="border-0 bg-primary/10 text-primary hover:bg-primary/15">
                            {m.canal === "WhatsApp" ? <MessageSquare className="mr-1 h-3 w-3" /> : <Smartphone className="mr-1 h-3 w-3" />}
                            {m.canal}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{m.publico_alvo}</TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs truncate text-sm text-muted-foreground">
                          {m.conteudo}
                        </TableCell>
                        <TableCell className="text-right font-medium">{m.total_destinatarios.toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge className="border-0 bg-primary/10 text-primary hover:bg-primary/15">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> {m.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
