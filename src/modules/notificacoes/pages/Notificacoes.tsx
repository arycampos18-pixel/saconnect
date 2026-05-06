import { useEffect, useState } from "react";
import { Bell, BellOff, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { notificationService, type Notificacao } from "../services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Notificacoes() {
  const [items, setItems] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushAtivo, setPushAtivo] = useState(false);

  const carregar = async () => {
    try {
      setLoading(true);
      const data = await notificationService.listar(100);
      setItems(data);
    } catch (e: any) {
      toast.error("Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // Status do push
    if ("Notification" in window) {
      setPushAtivo(Notification.permission === "granted");
    }
    // Realtime
    const ch = supabase
      .channel("notif-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const marcarLida = async (id: string) => {
    await notificationService.marcarLida(id);
    carregar();
  };

  const marcarTodas = async () => {
    await notificationService.marcarTodasLidas();
    toast.success("Todas marcadas como lidas");
    carregar();
  };

  const remover = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    carregar();
  };

  const togglePush = async (ativar: boolean) => {
    if (!("Notification" in window)) {
      toast.error("Seu navegador não suporta notificações push");
      return;
    }
    if (ativar) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Permissão negada");
        setPushAtivo(false);
        return;
      }
      setPushAtivo(true);
      toast.success("Notificações push ativadas");
    } else {
      setPushAtivo(false);
      toast.info("Para revogar totalmente, ajuste nas configurações do navegador");
    }
  };

  const naoLidas = items.filter((i) => !i.lida).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">Central de alertas do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          {naoLidas > 0 && (
            <Button variant="outline" onClick={marcarTodas}>
              <CheckCheck className="mr-2 h-4 w-4" /> Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {pushAtivo ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            Push do navegador
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Receba alertas em tempo real mesmo com a aba fechada.
          </span>
          <Switch checked={pushAtivo} onCheckedChange={togglePush} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico ({naoLidas} não lidas)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground">Carregando...</p>
            ) : items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">Nenhuma notificação</p>
            ) : (
              <div className="space-y-2">
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start justify-between gap-3 rounded-md border p-3 ${
                      n.lida ? "bg-muted/30" : "bg-background"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{n.titulo}</span>
                        {!n.lida && <Badge variant="default">Nova</Badge>}
                        <Badge variant="outline">{n.tipo}</Badge>
                      </div>
                      {n.mensagem && (
                        <p className="mt-1 text-sm text-muted-foreground">{n.mensagem}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!n.lida && (
                        <Button size="icon" variant="ghost" onClick={() => marcarLida(n.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => remover(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}