import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare, Send, User, MapPin, Phone, Hash,
  Search, Filter, Loader2, Plus, RefreshCw,
} from "lucide-react";
import { waChatService, type WAConversa, type WAMensagem } from "../services/waChatService";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function WAChat() {
  const [conversas, setConversas] = useState<WAConversa[]>([]);
  const [ativa, setAtiva] = useState<WAConversa | null>(null);
  const [mensagens, setMensagens] = useState<WAMensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Carrega lista de conversas ───────────────────────────────────────────
  const carregarConversas = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await waChatService.listarConversas();
      setConversas(list);
      if (!ativa && list.length > 0) setAtiva(list[0]);
    } catch (e: any) {
      if (!silent) toast.error("Erro ao carregar conversas: " + (e?.message ?? ""));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ativa]);

  useEffect(() => { carregarConversas(); }, []);

  // ─── Carrega mensagens da conversa ativa ──────────────────────────────────
  const carregarMensagens = useCallback(async (id: string) => {
    try {
      const msgs = await waChatService.buscarMensagens(id);
      setMensagens(msgs);
    } catch (e: any) {
      toast.error("Erro ao carregar mensagens: " + (e?.message ?? ""));
    }
  }, []);

  useEffect(() => {
    if (ativa) carregarMensagens(ativa.id);
  }, [ativa?.id]);

  // ─── Scroll automático ────────────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // ─── Realtime: mensagens da conversa ativa ────────────────────────────────
  useEffect(() => {
    if (!ativa) return;

    const addMsg = (row: Record<string, any>) => {
      const nova: WAMensagem = {
        id: row.id,
        conversa_id: row.conversa_id,
        conteudo: row.conteudo ?? "",
        tipo: row.tipo ?? "texto",
        direcao: row.direcao === "saida" ? "saida" : "entrada",
        status: row.status ?? "",
        created_at: row.created_at ?? new Date().toISOString(),
        enviado_por: row.enviado_por ?? null,
      };
      setMensagens((prev) =>
        prev.some((m) => m.id === nova.id) ? prev : [...prev, nova],
      );
    };

    // Subscrição realtime (INSERT na tabela da conversa ativa)
    const channel = supabase
      .channel(`wa-msgs-${ativa.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_mensagens",
          filter: `conversa_id=eq.${ativa.id}`,
        },
        (payload) => addMsg(payload.new as Record<string, any>),
      )
      .subscribe();

    // Polling de segurança a cada 5 s — garante recebimento mesmo se realtime
    // não estiver disponível (ex.: Supabase Realtime desabilitado no plano).
    const poll = setInterval(async () => {
      try {
        const msgs = await waChatService.buscarMensagens(ativa.id);
        setMensagens((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const novas = msgs.filter((m) => !existingIds.has(m.id));
          return novas.length > 0 ? [...prev, ...novas] : prev;
        });
      } catch {
        /* silencioso — não interrompe o fluxo */
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [ativa?.id]);

  // ─── Realtime: lista de conversas (novos chats / última mensagem) ─────────
  useEffect(() => {
    const channel = supabase
      .channel("wa-conversas-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversas" },
        () => { carregarConversas(true); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [carregarConversas]);

  // ─── Enviar mensagem ──────────────────────────────────────────────────────
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!msg.trim() || !ativa || enviando) return;
    setEnviando(true);
    const texto = msg.trim();
    setMsg("");
    try {
      const nova = await waChatService.enviarMensagem(ativa.id, ativa.telefone, texto);
      setMensagens((prev) => {
        if (prev.some((m) => m.id === nova.id)) return prev;
        return [...prev, nova];
      });
    } catch (err: any) {
      toast.error("Erro ao enviar: " + (err?.message ?? ""));
      setMsg(texto); // devolve o texto para não perder
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4 overflow-hidden">

      {/* ── Lista de Conversas ─────────────────────────────────────────────── */}
      <Card className="w-80 shrink-0 overflow-hidden flex flex-col">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg">Conversas</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => carregarConversas(true)} title="Atualizar">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-8 h-9" />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {conversas.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma conversa ainda.
              </p>
            )}
            {conversas.map((c) => (
              <button
                key={c.id}
                onClick={() => setAtiva(c)}
                className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                  ativa?.id === c.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm truncate max-w-[140px]">
                    {c.wa_nome || c.wa_numero}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(c.ultima_interacao), {
                      locale: ptBR,
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.ultima_mensagem}</p>
                <div className="mt-2 flex gap-1 flex-wrap">
                  <Badge
                    variant={
                      c.status === "Pendente" ? "destructive" : "secondary"
                    }
                    className="text-[9px] h-4"
                  >
                    {c.status}
                  </Badge>
                  {c.nao_lidas > 0 && (
                    <Badge className="text-[9px] h-4 bg-primary">{c.nao_lidas}</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* ── Área de Chat ────────────────────────────────────────────────────── */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {ativa ? (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {ativa.wa_nome?.substring(0, 2).toUpperCase() || <User />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{ativa.wa_nome || ativa.wa_numero}</p>
                  <p className="text-xs text-muted-foreground">{ativa.wa_numero}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">{ativa.status}</Badge>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {mensagens.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.direcao === "saida" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 text-sm shadow-sm ${
                        m.direcao === "saida"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p>{m.conteudo}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          m.direcao === "saida"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {m.direcao === "saida" && m.status ? ` · ${m.status}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-muted/20">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  className="flex-1"
                  disabled={enviando}
                />
                <Button type="submit" disabled={enviando || !msg.trim()}>
                  {enviando ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p>Selecione uma conversa para começar</p>
          </div>
        )}
      </Card>

      {/* ── Painel do Contato ────────────────────────────────────────────────── */}
      {ativa && (
        <Card className="w-72 shrink-0 overflow-hidden hidden xl:flex flex-col">
          <CardHeader className="p-4 border-b bg-muted/10">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Ficha do Contato
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <div className="text-center">
                <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-primary/20">
                  <AvatarFallback className="text-xl font-bold">
                    {ativa.wa_nome?.substring(0, 2) || "?"}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-bold text-lg">{ativa.wa_nome || "Contato"}</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Telefone</p>
                    <p className="font-medium">{ativa.wa_numero}</p>
                  </div>
                </div>
                {ativa.eleitor && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Bairro</p>
                      <p className="font-medium">{ativa.eleitor.bairro || "Não informado"}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs font-semibold mb-3 uppercase text-muted-foreground">
                  Ações Rápidas
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" size="sm" className="justify-start">
                    <Plus className="mr-2 h-4 w-4" /> Novo Chamado
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start text-primary">
                    <User className="mr-2 h-4 w-4" /> Vincular a Eleitor
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
