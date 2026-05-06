import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, UserCheck, CheckCircle2, ArrowRightLeft, Building2, RotateCcw, Phone, User, FileText, Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { atendimentoService, type Conversa, type Mensagem } from "../services/atendimentoService";
import { formatPhoneBR } from "@/shared/utils/phone";
import { PainelLateralConversa } from "./PainelLateralConversa";
import { templateService } from "../services/templateService";

interface Props { conversaId: string }

export function ConversaPainel({ conversaId }: Props) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [openTransferAt, setOpenTransferAt] = useState(false);
  const [openTransferDep, setOpenTransferDep] = useState(false);
  const [novoAtendente, setNovoAtendente] = useState<string>("");
  const [novoDep, setNovoDep] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversa } = useQuery({
    queryKey: ["conversa", conversaId],
    queryFn: () => atendimentoService.getConversa(conversaId),
  });

  const { data: mensagens = [] } = useQuery({
    queryKey: ["mensagens", conversaId],
    queryFn: () => atendimentoService.listarMensagens(conversaId),
  });

  const { data: departamentos = [] } = useQuery({
    queryKey: ["departamentos-ativos"],
    queryFn: () => atendimentoService.listarDepartamentos(),
  });

  const { data: atendentes = [] } = useQuery({
    queryKey: ["atendentes"],
    queryFn: () => atendimentoService.listarAtendentes(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["whatsapp-templates", conversa?.departamento_id ?? null],
    queryFn: () => templateService.listar({
      apenasAtivos: true,
      departamentoId: conversa?.departamento_id ?? null,
    }),
    enabled: !!conversa,
  });

  const [openTpl, setOpenTpl] = useState(false);
  const [tplBusca, setTplBusca] = useState("");

  // Marca como lidas ao abrir
  useEffect(() => {
    if (!conversaId) return;
    atendimentoService.marcarLidas(conversaId).then(() => {
      qc.invalidateQueries({ queryKey: ["conversas"] });
    });
  }, [conversaId, qc]);

  // Realtime mensagens
  useEffect(() => {
    if (!conversaId) return;
    const channel = supabase
      .channel(`msg-${conversaId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "whatsapp_mensagens",
        filter: `conversa_id=eq.${conversaId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["mensagens", conversaId] });
        qc.invalidateQueries({ queryKey: ["conversas"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversaId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens.length]);

  const atendenteNome = useMemo(() => {
    if (!conversa?.atendente_id) return null;
    return (atendentes as any[]).find((a) => a.user_id === conversa.atendente_id)?.nome ?? "—";
  }, [conversa?.atendente_id, atendentes]);

  const depNome = useMemo(() => {
    if (!conversa?.departamento_id) return null;
    return departamentos.find((d) => d.id === conversa.departamento_id)?.nome ?? "—";
  }, [conversa?.departamento_id, departamentos]);

  const enviar = async () => {
    if (!conversa || !texto.trim()) return;
    setEnviando(true);
    try {
      await atendimentoService.enviarMensagem(conversa.id, conversa.telefone, texto.trim(), conversa.contato_nome);
      setTexto("");
      qc.invalidateQueries({ queryKey: ["mensagens", conversaId] });
      qc.invalidateQueries({ queryKey: ["conversas"] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar");
    } finally {
      setEnviando(false);
    }
  };

  const handleAssumir = async () => {
    try {
      await atendimentoService.assumir(conversaId);
      toast.success("Conversa assumida");
      qc.invalidateQueries({ queryKey: ["conversas"] });
      qc.invalidateQueries({ queryKey: ["conversa", conversaId] });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleFinalizar = async () => {
    try {
      await atendimentoService.finalizar(conversaId);
      toast.success("Atendimento finalizado");
      qc.invalidateQueries({ queryKey: ["conversas"] });
      qc.invalidateQueries({ queryKey: ["conversa", conversaId] });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReabrir = async () => {
    try {
      await atendimentoService.reabrir(conversaId);
      toast.success("Atendimento reaberto");
      qc.invalidateQueries({ queryKey: ["conversas"] });
      qc.invalidateQueries({ queryKey: ["conversa", conversaId] });
    } catch (e: any) { toast.error(e.message); }
  };

  const confirmTransferAt = async () => {
    if (!novoAtendente) return;
    try {
      await atendimentoService.transferirAtendente(conversaId, novoAtendente);
      toast.success("Conversa transferida");
      setOpenTransferAt(false);
      setNovoAtendente("");
      qc.invalidateQueries({ queryKey: ["conversas"] });
      qc.invalidateQueries({ queryKey: ["conversa", conversaId] });
    } catch (e: any) { toast.error(e.message); }
  };

  const confirmTransferDep = async () => {
    if (!novoDep) return;
    try {
      await atendimentoService.transferirDepartamento(conversaId, novoDep);
      toast.success("Encaminhado ao departamento");
      setOpenTransferDep(false);
      setNovoDep("");
      qc.invalidateQueries({ queryKey: ["conversas"] });
      qc.invalidateQueries({ queryKey: ["conversa", conversaId] });
    } catch (e: any) { toast.error(e.message); }
  };

  if (!conversa) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="flex h-full">
      <div className="flex h-full flex-1 flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{conversa.contato_nome || "Sem nome"}</span>
            {conversa.eleitor_id && <Badge variant="secondary">Eleitor vinculado</Badge>}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhoneBR(conversa.telefone)}</span>
            <Badge
              className={
                conversa.status === "Atendido" ? "bg-green-100 text-green-800"
                  : conversa.status === "Em atendimento" ? "bg-blue-100 text-blue-800"
                  : "bg-amber-100 text-amber-800"
              }
            >{conversa.status}</Badge>
            {atendenteNome && <span>Atendente: <b>{atendenteNome}</b></span>}
            {depNome && <span>Depto: <b>{depNome}</b></span>}
            {(conversa.tags ?? []).slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {conversa.status !== "Atendido" && (
            <Button size="sm" variant="outline" onClick={handleAssumir}>
              <UserCheck className="mr-2 h-4 w-4" /> Assumir
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setOpenTransferAt(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferir atendente
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOpenTransferDep(true)}>
            <Building2 className="mr-2 h-4 w-4" /> Transferir departamento
          </Button>
          {conversa.status === "Atendido" ? (
            <Button size="sm" variant="outline" onClick={handleReabrir}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reabrir
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinalizar}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
            </Button>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <ScrollArea className="flex-1 bg-muted/30">
        <div ref={scrollRef} className="space-y-2 p-4">
          {mensagens.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Sem mensagens</div>
          )}
          {mensagens.map((m) => <Bolha key={m.id} m={m} />)}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-3">
        <div className="flex items-end gap-2">
          <Popover open={openTpl} onOpenChange={setOpenTpl}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" title="Templates" disabled={templates.length === 0}>
                <Zap className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-2">
              <Input
                value={tplBusca}
                onChange={(e) => setTplBusca(e.target.value)}
                placeholder="Buscar template…"
                className="mb-2 h-8 text-xs"
              />
              <ScrollArea className="max-h-72">
                <ul className="space-y-1">
                  {templates
                    .filter((t) => {
                      const v = tplBusca.trim().toLowerCase();
                      if (!v) return true;
                      return t.nome.toLowerCase().includes(v)
                        || (t.atalho ?? "").toLowerCase().includes(v)
                        || (t.categoria ?? "").toLowerCase().includes(v)
                        || t.conteudo.toLowerCase().includes(v);
                    })
                    .map((t) => (
                      <li key={t.id}>
                        <button
                          className="w-full rounded-md p-2 text-left text-xs hover:bg-muted"
                          onClick={() => {
                            const aplicado = templateService.aplicarVariaveis(t.conteudo, conversa.contato_nome);
                            setTexto((prev) => prev ? `${prev}\n${aplicado}` : aplicado);
                            templateService.registrarUso(t.id);
                            setOpenTpl(false);
                            setTplBusca("");
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t.nome}</span>
                            {t.atalho && <Badge variant="outline" className="h-4 text-[10px]">{t.atalho}</Badge>}
                            {t.categoria && <Badge variant="secondary" className="h-4 text-[10px]">{t.categoria}</Badge>}
                            {(t.usos ?? 0) > 0 && <span className="ml-auto text-[10px] text-muted-foreground">{t.usos}×</span>}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-muted-foreground">{t.conteudo}</p>
                        </button>
                      </li>
                    ))}
                  {templates.length === 0 && (
                    <li className="p-3 text-center text-xs text-muted-foreground">Sem templates</li>
                  )}
                </ul>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Digite uma mensagem… use ⚡ ou /atalho"
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              // Tab: tenta expandir /atalho no texto
              if (e.key === "Tab" && texto.trim().startsWith("/")) {
                const cmd = texto.trim().split(/\s/)[0].toLowerCase();
                const found = templates.find((t) => (t.atalho ?? "").toLowerCase() === cmd);
                if (found) {
                  e.preventDefault();
                  const aplicado = templateService.aplicarVariaveis(found.conteudo, conversa.contato_nome);
                  setTexto(aplicado + texto.trim().slice(cmd.length));
                  templateService.registrarUso(found.id);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
            }}
          />
          <Button onClick={enviar} disabled={enviando || !texto.trim()}>
            <Send className="mr-2 h-4 w-4" /> Enviar
          </Button>
        </div>
      </div>

      {/* Dialog: transferir atendente */}
      <Dialog open={openTransferAt} onOpenChange={setOpenTransferAt}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transferir para outro atendente</DialogTitle></DialogHeader>
          <Select value={novoAtendente} onValueChange={setNovoAtendente}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {(atendentes as any[]).map((a) => (
                <SelectItem key={a.user_id} value={a.user_id}>{a.nome || a.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTransferAt(false)}>Cancelar</Button>
            <Button onClick={confirmTransferAt} disabled={!novoAtendente}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: transferir departamento */}
      <Dialog open={openTransferDep} onOpenChange={setOpenTransferDep}>
        <DialogContent>
          <DialogHeader><DialogTitle>Encaminhar para departamento</DialogTitle></DialogHeader>
          <Select value={novoDep} onValueChange={setNovoDep}>
            <SelectTrigger><SelectValue placeholder="Selecione um departamento" /></SelectTrigger>
            <SelectContent>
              {departamentos.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTransferDep(false)}>Cancelar</Button>
            <Button onClick={confirmTransferDep} disabled={!novoDep}>Encaminhar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      <PainelLateralConversa conversa={conversa} />
    </div>
  );
}

function Bolha({ m }: { m: Mensagem }) {
  const isOut = m.direcao === "saida";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <Card className={`max-w-[75%] overflow-hidden px-3 py-2 text-sm shadow-sm ${isOut ? "bg-primary text-primary-foreground" : "bg-background"}`}>
        {m.tipo === "imagem" && m.midia_url && (
          <a href={m.midia_url} target="_blank" rel="noreferrer" className="-mx-3 -mt-2 mb-2 block">
            <img src={m.midia_url} alt="" className="max-h-72 w-full object-cover" loading="lazy" />
          </a>
        )}
        {m.tipo === "video" && m.midia_url && (
          <video src={m.midia_url} controls className="-mx-3 -mt-2 mb-2 max-h-72 w-[calc(100%+1.5rem)]" />
        )}
        {m.tipo === "audio" && m.midia_url && (
          <audio src={m.midia_url} controls className="mb-1 w-full" />
        )}
        {m.tipo === "documento" && m.midia_url && (
          <a
            href={m.midia_url}
            target="_blank"
            rel="noreferrer"
            className={`mb-1 flex items-center gap-2 rounded-md p-2 text-xs ${
              isOut ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted hover:bg-muted/80"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{m.conteudo || "documento"}</span>
            <Download className="h-3 w-3 shrink-0" />
          </a>
        )}
        {m.tipo === "localizacao" && m.conteudo && (
          <a
            href={`https://maps.google.com/?q=${m.conteudo}`}
            target="_blank" rel="noreferrer"
            className="mb-1 block underline"
          >📍 Ver localização</a>
        )}
        {(m.tipo === "outro" || m.tipo === "contato") && (
          <div className="mb-1 text-xs opacity-70">[{m.tipo}]</div>
        )}
        {m.conteudo && m.tipo !== "documento" && m.tipo !== "localizacao" && (
          <div className="whitespace-pre-wrap break-words">{m.conteudo}</div>
        )}
        <div className={`mt-1 text-[10px] ${isOut ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {new Date(m.enviado_em || m.created_at).toLocaleString("pt-BR")}
          {isOut && ` · ${m.status}`}
        </div>
      </Card>
    </div>
  );
}