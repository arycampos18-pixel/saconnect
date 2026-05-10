import { useEffect, useMemo, useRef, useState } from "react";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { waBulkService } from "@/modules/whatsapp-bulk/services/waBulkService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageSquare, Search, Send, CheckCircle2, RotateCcw, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Conversa = {
  id: string;
  company_id: string;
  api_id: string | null;
  wa_numero: string;
  wa_nome: string | null;
  ultima_mensagem: string | null;
  ultima_interacao: string;
  ultima_msg_recebida_em?: string | null;
  status: "aberta" | "fechada" | "pendente";
  nao_lidas: number;
};

type Mensagem = {
  id: string;
  direcao: "entrada" | "saida";
  corpo: string | null;
  tipo: string;
  status: string | null;
  created_at: string;
};

export default function WaBulkAtendimento() {
  const { currentCompany } = useCompany();
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState<"aberta" | "fechada" | "todas">("aberta");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregandoMsg, setCarregandoMsg] = useState(false);
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  const carregarConversas = async () => {
    if (!currentCompany) return;
    setCarregando(true);
    try {
      const data = await waBulkService.listarConversas(currentCompany.id, statusFiltro);
      setConversas(data as Conversa[]);
    } catch (e: any) {
      toast.error("Erro ao carregar conversas: " + e.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarConversas();
    // eslint-disable-next-line
  }, [currentCompany?.id, statusFiltro]);

  // Realtime: novas conversas/mensagens
  useEffect(() => {
    if (!currentCompany) return;
    const ch = supabase
      .channel(`wa-bulk-atendimento-${currentCompany.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_bulk_conversas", filter: `company_id=eq.${currentCompany.id}` }, () => {
        carregarConversas();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wa_bulk_mensagens", filter: `company_id=eq.${currentCompany.id}` }, (payload) => {
        const novo = payload.new as any;
        if (selecionada && novo.conversa_id === selecionada.id) {
          setMensagens((prev) => [...prev, novo as Mensagem]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [currentCompany?.id, selecionada?.id]);

  const abrirConversa = async (c: Conversa) => {
    setSelecionada(c);
    setCarregandoMsg(true);
    try {
      const msgs = await waBulkService.listarMensagens(c.id);
      setMensagens(msgs as Mensagem[]);
      if (c.nao_lidas > 0) {
        await waBulkService.marcarLida(c.id);
        setConversas((prev) => prev.map((x) => x.id === c.id ? { ...x, nao_lidas: 0 } : x));
      }
    } catch (e: any) {
      toast.error("Erro ao carregar mensagens: " + e.message);
    } finally {
      setCarregandoMsg(false);
    }
  };

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  const enviar = async () => {
    if (!selecionada || !resposta.trim()) return;
    setEnviando(true);
    try {
      await waBulkService.enviarResposta(selecionada, resposta.trim());
      setResposta("");
      const msgs = await waBulkService.listarMensagens(selecionada.id);
      setMensagens(msgs as Mensagem[]);
      toast.success("Mensagem enviada");
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e.message ?? e));
    } finally {
      setEnviando(false);
    }
  };

  const alternarStatus = async () => {
    if (!selecionada) return;
    const novo = selecionada.status === "fechada" ? "aberta" : "fechada";
    try {
      await waBulkService.atualizarStatusConversa(selecionada.id, novo);
      setSelecionada({ ...selecionada, status: novo });
      carregarConversas();
      toast.success(novo === "fechada" ? "Conversa encerrada" : "Conversa reaberta");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return conversas;
    return conversas.filter((c) =>
      (c.wa_nome ?? "").toLowerCase().includes(q) ||
      c.wa_numero.toLowerCase().includes(q) ||
      (c.ultima_mensagem ?? "").toLowerCase().includes(q)
    );
  }, [busca, conversas]);

  // Janela de atendimento da Meta: 24h após a última mensagem recebida do contato
  const janelaInfo = (c: { ultima_msg_recebida_em?: string | null }) => {
    if (!c.ultima_msg_recebida_em) return { expirado: true, label: "Sem janela", restanteMs: 0 };
    const fim = new Date(c.ultima_msg_recebida_em).getTime() + 24 * 60 * 60 * 1000;
    const restante = fim - agora;
    if (restante <= 0) return { expirado: true, label: "Expirada", restanteMs: 0 };
    const h = Math.floor(restante / 3_600_000);
    const m = Math.floor((restante % 3_600_000) / 60_000);
    return { expirado: false, label: h > 0 ? `${h}h ${m}m` : `${m}m`, restanteMs: restante };
  };

  return (
    <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      {/* Lista de conversas */}
      <div className="flex flex-col rounded-xl border border-border bg-card">
        <div className="border-b border-border p-3 space-y-3">
          <Tabs value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="aberta">Abertas</TabsTrigger>
              <TabsTrigger value="fechada">Fechadas</TabsTrigger>
              <TabsTrigger value="todas">Todas</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, número..." className="pl-8 h-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : filtradas.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Nenhuma conversa encontrada.
            </div>
          ) : (
            filtradas.map((c) => (
              <button
                key={c.id}
                onClick={() => abrirConversa(c)}
                className={`w-full border-b border-border p-3 text-left transition hover:bg-secondary ${selecionada?.id === c.id ? "bg-secondary" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{c.wa_nome ?? c.wa_numero}</p>
                      {c.nao_lidas > 0 && (
                        <Badge className="h-5 min-w-5 justify-center bg-primary px-1.5 text-[10px] text-primary-foreground">{c.nao_lidas}</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.ultima_mensagem ?? "—"}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(c.ultima_interacao), "HH:mm", { locale: ptBR })}
                    </span>
                    {(() => {
                      const j = janelaInfo(c);
                      const tone = j.expirado
                        ? "bg-destructive/10 text-destructive"
                        : j.restanteMs < 2 * 3_600_000
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-primary/10 text-primary";
                      return (
                        <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
                          <Clock className="h-2.5 w-2.5" /> {j.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Painel de mensagens */}
      <div className="flex flex-col rounded-xl border border-border bg-card">
        {!selecionada ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>Selecione uma conversa para visualizar</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border p-3">
              <div>
                <p className="font-medium">{selecionada.wa_nome ?? selecionada.wa_numero}</p>
                <p className="text-xs text-muted-foreground">{selecionada.wa_numero}</p>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const j = janelaInfo(selecionada);
                  const tone = j.expirado
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : j.restanteMs < 2 * 3_600_000
                      ? "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400"
                      : "bg-primary/10 text-primary border-primary/30";
                  return (
                    <span
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${tone}`}
                      title="Janela de atendimento da Meta (24h após a última mensagem do contato)"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {j.expirado ? "Janela expirada" : `Janela: ${j.label}`}
                    </span>
                  );
                })()}
                <Badge variant={selecionada.status === "aberta" ? "default" : "secondary"}>{selecionada.status}</Badge>
                <Button size="sm" variant="outline" onClick={alternarStatus}>
                  {selecionada.status === "fechada" ? <><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reabrir</> : <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Encerrar</>}
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4">
              {carregandoMsg ? (
                <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : mensagens.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
              ) : (
                mensagens.map((m) => (
                  <div key={m.id} className={`flex ${m.direcao === "saida" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${m.direcao === "saida" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.corpo ?? `[${m.tipo}]`}</p>
                      <p className={`mt-1 text-[10px] ${m.direcao === "saida" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {format(new Date(m.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={fimRef} />
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  placeholder="Digite sua resposta... (somente em janela de 24h)"
                  rows={2}
                  className="resize-none"
                />
                <Button onClick={enviar} disabled={enviando || !resposta.trim()} className="h-10">
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                A Meta só permite mensagens de texto livre dentro da janela de 24h após a última mensagem do contato.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
