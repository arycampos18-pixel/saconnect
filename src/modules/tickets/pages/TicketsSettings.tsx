import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { googleCalendarService } from "../services/googleCalendarService";
import { useTicketsTenant } from "../hooks/useTicketsTenant";
import { toast } from "sonner";

export default function TicketsSettings() {
  const { user } = useAuth();
  const { companyId } = useTicketsTenant();
  const [enabled, setEnabled] = useState(false);
  const [calId, setCalId] = useState("");
  const [integration, setIntegration] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    refresh();
    function onMsg(e: MessageEvent) { if (e.data?.type === "google-calendar-connected") refresh(); }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function refresh() {
    if (!user) return;
    const it: any = await googleCalendarService.getIntegration(user.id);
    setIntegration(it);
    setEnabled(!!it?.sync_enabled);
    setCalId(it?.google_calendar_id ?? "");
  }

  async function save() {
    if (!user || !companyId) return;
    await googleCalendarService.saveIntegration(companyId, user.id, { sync_enabled: enabled, google_calendar_id: calId || null });
    toast.success("Configuração salva");
    refresh();
  }

  async function connect() {
    if (!companyId) return toast.error("Empresa não selecionada");
    try { await googleCalendarService.startOAuth(companyId); }
    catch (e: any) { toast.error(e.message || "Erro ao iniciar OAuth"); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Integração Google Calendar</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        {integration?.google_email ? (
          <div className="rounded-md border p-3 bg-muted/40">
            <div className="text-xs text-muted-foreground">Conectado como</div>
            <div className="font-medium">{integration.google_email}</div>
          </div>
        ) : (
          <div className="text-muted-foreground">
            Conecte seu Google Calendar para sincronizar agendamentos de tickets automaticamente.
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={connect}>{integration?.google_access_token ? "Reconectar Google" : "Conectar Google"}</Button>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={enabled} onCheckedChange={setEnabled} id="sync" />
          <Label htmlFor="sync">Sincronização ativa</Label>
        </div>
        <div>
          <Label>ID do calendário (opcional)</Label>
          <Input value={calId} onChange={e => setCalId(e.target.value)} placeholder="primary" />
        </div>
        <div className="flex gap-2">
          <Button onClick={save}>Salvar</Button>
          <Button variant="outline" onClick={async () => {
            if (!user) return;
            await googleCalendarService.disconnect(user.id);
            setEnabled(false); setCalId(""); setIntegration(null); toast.success("Desconectado");
          }}>Desconectar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
