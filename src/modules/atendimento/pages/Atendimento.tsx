import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, MessageCircle, Inbox, CheckCircle2, Clock, Filter, BarChart3, Building2, Zap, ShieldCheck, Route, Settings, Bot, FileBarChart, MessageSquarePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { atendimentoService, type Conversa, type ConversaStatus } from "../services/atendimentoService";
import { ConversaPainel } from "../components/ConversaPainel";
import { formatPhoneBR } from "@/shared/utils/phone";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { NovaConversaDialog } from "../components/NovaConversaDialog";

export default function Atendimento() {
  const qc = useQueryClient();
  const { isAdmin } = useUserRole();
  const [tab, setTab] = useState<ConversaStatus>("Pendente");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [filtroDep, setFiltroDep] = useState<string>("todos");
  const [filtroAt, setFiltroAt] = useState<string>("todos");
  const [apenasMinhas, setApenasMinhas] = useState(false);
  const [novaOpen, setNovaOpen] = useState(false);

  const { data: departamentos = [] } = useQuery({
    queryKey: ["departamentos-ativos"],
    queryFn: () => atendimentoService.listarDepartamentos(),
  });
  const { data: atendentes = [] } = useQuery({
    queryKey: ["atendentes"],
    queryFn: () => atendimentoService.listarAtendentes(),
  });

  const { data: conversas = [] } = useQuery({
    queryKey: ["conversas", tab, filtroDep, filtroAt, apenasMinhas],
    queryFn: () => atendimentoService.listarConversas({
      status: tab,
      departamentoId: filtroDep === "todos" ? null : filtroDep,
      atendenteId: filtroAt === "todos" ? null : filtroAt,
      apenasMinhas,
    }),
    refetchInterval: 15000,
  });

  // Contadores por status (independente da aba ativa)
  const { data: contadores = { Pendente: 0, "Em atendimento": 0, Atendido: 0 } } = useQuery({
    queryKey: ["conversas-contadores", filtroDep, filtroAt, apenasMinhas],
    queryFn: async () => {
      const statuses: ConversaStatus[] = ["Pendente", "Em atendimento", "Atendido"];
      const results = await Promise.all(
        statuses.map((s) =>
          atendimentoService.listarConversas({
            status: s,
            departamentoId: filtroDep === "todos" ? null : filtroDep,
            atendenteId: filtroAt === "todos" ? null : filtroAt,
            apenasMinhas,
          }).then((r) => r.length),
        ),
      );
      return { Pendente: results[0], "Em atendimento": results[1], Atendido: results[2] } as Record<ConversaStatus, number>;
    },
    refetchInterval: 15000,
  });

  // Realtime para atualizar lista
  useEffect(() => {
    const channel = supabase
      .channel("conversas-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversas" }, () => {
        qc.invalidateQueries({ queryKey: ["conversas"] });
        qc.invalidateQueries({ queryKey: ["conversas-contadores"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return conversas;
    return conversas.filter((c) =>
      (c.contato_nome ?? "").toLowerCase().includes(t) ||
      c.telefone_digits.includes(t.replace(/\D/g, "")),
    );
  }, [conversas, busca]);

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Lista */}
      <aside className="flex w-full max-w-sm flex-col border-r border-border bg-muted/30">
        <div className="space-y-4 border-b border-border bg-card p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Atendimento</h2>
              <p className="text-xs text-muted-foreground">Inbox WhatsApp receptivo</p>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              <Button asChild size="icon" variant="outline" className="h-8 w-8 border-border bg-background text-primary hover:border-primary/30 hover:bg-primary/10" title="Dashboard">
                <Link to="/app/atendimento/dashboard"><BarChart3 className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="icon" variant="outline" className="h-8 w-8 border-border bg-background text-primary hover:border-primary/30 hover:bg-primary/10" title="Relatórios">
                <Link to="/app/atendimento/relatorios"><FileBarChart className="h-4 w-4" /></Link>
              </Button>
              {isAdmin && (
                <>
                  <Button asChild size="icon" variant="outline" className="h-8 w-8 border-border bg-background text-primary hover:border-primary/30 hover:bg-primary/10" title="Departamentos">
                    <Link to="/app/atendimento/departamentos"><Building2 className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="icon" variant="outline" className="h-8 w-8 border-border bg-background text-primary hover:border-primary/30 hover:bg-primary/10" title="Auto-roteamento">
                    <Link to="/app/atendimento/roteamento"><Route className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="icon" variant="outline" className="h-8 w-8 border-border bg-background text-primary hover:border-primary/30 hover:bg-primary/10" title="Chatbot / URA">
                    <Link to="/app/chatbot"><Bot className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="icon" variant="outline" className="h-8 w-8 border-border bg-background text-primary hover:border-primary/30 hover:bg-primary/10" title="Configurações Avançadas">
                    <Link to="/app/atendimento/configuracoes-avancadas"><Settings className="h-4 w-4" /></Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <Button
            onClick={() => setNovaOpen(true)}
            className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90"
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Nova conversa
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome ou telefone…"
              className="h-10 rounded-lg border-border bg-background pl-9 text-sm shadow-sm focus-visible:ring-primary/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={filtroDep} onValueChange={setFiltroDep}>
              <SelectTrigger className="h-9 rounded-lg border-border bg-background text-xs font-medium"><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos depto.</SelectItem>
                {departamentos.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroAt} onValueChange={setFiltroAt}>
              <SelectTrigger className="h-9 rounded-lg border-border bg-background text-xs font-medium"><SelectValue placeholder="Atendente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos atend.</SelectItem>
                {(atendentes as any[]).map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>{a.nome || a.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            variant={apenasMinhas ? "default" : "outline"}
            className={cn(
              "h-9 w-full rounded-lg text-xs font-semibold",
              !apenasMinhas && "border-border bg-background text-foreground hover:bg-primary/5 hover:text-primary",
            )}
            onClick={() => setApenasMinhas((v) => !v)}
          >
            <Filter className="mr-2 h-3.5 w-3.5" />
            {apenasMinhas ? "Mostrando minhas" : "Apenas minhas"}
          </Button>
          <StatusSegmented tab={tab} setTab={setTab} contadores={contadores} />
        </div>
        <ScrollArea className="flex-1 bg-muted/20">
          {filtradas.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <MessageCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Nenhuma conversa</p>
                <p className="text-xs text-muted-foreground">Aguardando novas mensagens…</p>
              </div>
            </div>
          )}
          <ul className="space-y-1 p-2">
            {filtradas.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelecionada(c.id)}
                  className={cn(
                    "group w-full rounded-xl border px-3 py-3 text-left transition-all duration-200",
                    selecionada === c.id
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : "border-transparent bg-card hover:border-border hover:bg-card hover:shadow-sm",
                  )}
                >
                  <ItemLista c={c} />
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </aside>

      {/* Painel */}
      <section className="flex-1 bg-background">
        {selecionada ? (
          <ConversaPainel conversaId={selecionada} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/5">
              <MessageCircle className="h-10 w-10 text-primary" />
            </div>
            <p className="mt-5 text-base font-semibold text-foreground">Selecione uma conversa</p>
            <p className="mt-1 text-sm text-muted-foreground">Escolha um contato à esquerda para começar a atender.</p>
          </div>
        )}
      </section>
      <NovaConversaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        onCreated={(id) => setSelecionada(id)}
      />
    </div>
  );
}

function StatusSegmented({
  tab,
  setTab,
  contadores,
}: {
  tab: ConversaStatus;
  setTab: (s: ConversaStatus) => void;
  contadores: Record<ConversaStatus, number>;
}) {
  const items: { key: ConversaStatus; label: string; icon: typeof Inbox; activeBg: string; badgeBg: string; badgeText: string; pulse?: boolean }[] = [
    { key: "Pendente", label: "Pendentes", icon: Inbox, activeBg: "bg-amber-500 text-white shadow-md shadow-amber-500/20", badgeBg: "bg-amber-100 text-amber-700", badgeText: "border-amber-200", pulse: contadores.Pendente > 0 },
    { key: "Em atendimento", label: "Em atend.", icon: Clock, activeBg: "bg-primary text-primary-foreground shadow-md shadow-primary/25", badgeBg: "bg-primary/10 text-primary", badgeText: "border-primary/20" },
    { key: "Atendido", label: "Atendidos", icon: CheckCircle2, activeBg: "bg-emerald-500 text-white shadow-md shadow-emerald-500/20", badgeBg: "bg-emerald-100 text-emerald-700", badgeText: "border-emerald-200" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1 shadow-sm">
      {items.map((it) => {
        const active = tab === it.key;
        const count = contadores[it.key] ?? 0;
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            onClick={() => setTab(it.key)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200",
              active
                ? it.activeBg
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{it.label}</span>
            <span
              className={cn(
                "ml-0.5 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                active ? "bg-white/25 text-white" : it.badgeBg,
                it.pulse && !active && "animate-pulse",
              )}
            >
              {count > 99 ? "99+" : count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ItemLista({ c }: { c: Conversa }) {
  const statusStyle =
    c.status === "Pendente"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : c.status === "Em atendimento"
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-emerald-100 text-emerald-700 border-emerald-200";
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-semibold text-primary">
        {(c.contato_nome || c.telefone || "?").trim().charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{c.contato_nome || formatPhoneBR(c.telefone)}</span>
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
            {c.ultima_mensagem_em
              ? new Date(c.ultima_mensagem_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
              : ""}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{c.ultima_mensagem || "—"}</span>
          {c.nao_lidas > 0 && (
            <Badge className="h-5 min-w-[20px] justify-center rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
              {c.nao_lidas}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 pt-0.5">
          {c.eleitor_id && (
            <Badge variant="outline" className="h-4 rounded-full border-primary/20 bg-primary/5 px-1.5 text-[9px] font-medium text-primary">
              Eleitor
            </Badge>
          )}
          <Badge variant="outline" className={cn("h-4 rounded-full px-1.5 text-[9px] font-medium", statusStyle)}>
            {c.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}