import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Cake, CalendarDays, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { agendaService, type Compromisso } from "@/modules/agenda/services/agendaService";
import { aniversariantesService, type Aniversariante } from "@/modules/aniversariantes/services/aniversariantesService";
import { notificationService, type Notificacao } from "@/modules/notificacoes/services/notificationService";
import { supabase } from "@/integrations/supabase/client";

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([]);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);

  async function carregar() {
    setLoading(true);
    try {
      const [c, a, n] = await Promise.all([
        agendaService.hoje(),
        aniversariantesService.hoje(),
        notificationService.listar(20),
      ]);
      setCompromissos(c.filter((x) => x.status === "Agendado"));
      setAniversariantes(a);
      setNotifs(n);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    const id = window.setInterval(carregar, 5 * 60 * 1000); // refresh a cada 5 min
    // realtime
    const ch = supabase
      .channel("notif-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => carregar())
      .subscribe();
    return () => {
      window.clearInterval(id);
      supabase.removeChannel(ch);
    };
  }, []);

  const naoLidas = notifs.filter((n) => !n.lida).length;
  const total = naoLidas + compromissos.length + aniversariantes.length;

  async function abrirNotif(n: Notificacao) {
    if (!n.lida) {
      await notificationService.marcarLida(n.id);
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function marcarTodas() {
    await notificationService.marcarTodasLidas();
    setNotifs((prev) => prev.map((x) => ({ ...x, lida: true })));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-xl border border-border/80 p-0 shadow-elegant-md">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notificações</p>
            <p className="text-xs text-muted-foreground">{total} item(ns)</p>
          </div>
          {naoLidas > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={marcarTodas}>
              <CheckCheck className="mr-1 h-3 w-3" /> Ler todas
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : total === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nada de novo por aqui.</p>
        ) : (
          <div className="max-h-96 divide-y overflow-y-auto">
            {notifs.length > 0 && (
              <div>
                <div className="bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Recentes
                </div>
                {notifs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => abrirNotif(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/40 ${!n.lida ? "bg-primary/5" : ""}`}
                  >
                    <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${!n.lida ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${!n.lida ? "font-semibold text-foreground" : "text-foreground/80"}`}>{n.titulo}</p>
                      {n.mensagem && <p className="truncate text-xs text-muted-foreground">{n.mensagem}</p>}
                      <p className="text-[10px] text-muted-foreground/70">
                        {new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {compromissos.length > 0 && (
              <div>
                <div className="bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Compromissos
                </div>
                {compromissos.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setOpen(false); navigate("/app/agenda"); }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/40"
                  >
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{c.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {c.local ? ` · ${c.local}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {aniversariantes.length > 0 && (
              <div>
                <div className="bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Aniversariantes
                </div>
                {aniversariantes.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setOpen(false); navigate("/app/aniversariantes"); }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/40"
                  >
                    <Cake className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">{a.idade} anos · {a.bairro ?? "—"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}