import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Pause, Play, Trash2, Send, MessageSquare, Flame } from "lucide-react";
import { toast } from "sonner";
import { waBulkService, type WaBulkApi } from "../services/waBulkService";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  inativo: { label: "Inativo", variant: "secondary" },
  pausada: { label: "Pausada", variant: "outline" },
  bloqueada: { label: "Bloqueada", variant: "destructive" },
  limite_atingido: { label: "Limite atingido", variant: "outline" },
  em_aquecimento: { label: "Aquecimento", variant: "secondary" },
};

export default function WaBulkApis() {
  const [apis, setApis] = useState<WaBulkApi[]>([]);
  const [warmInfo, setWarmInfo] = useState<Record<string, { dias: number; fase: string; limite_efetivo: number }>>({});
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testApi, setTestApi] = useState<WaBulkApi | null>(null);
  const [testForm, setTestForm] = useState({ destinatario: "", texto: "Olá! Teste do SA CONNECT." });
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    numero_telefone: "",
    display_name: "",
    phone_number_id: "",
    waba_id: "",
    business_account_id: "",
    app_id: "",
    access_token: "",
    msgs_limite_diario: "",
    msgs_limite_horario: "",
    observacoes: "",
  });

  const carregar = async () => {
    setLoading(true);
    try {
      const list = await waBulkService.listApis();
      setApis(list);
      // Carrega info de aquecimento apenas para APIs em aquecimento
      const infos: Record<string, any> = {};
      await Promise.all(
        list
          .filter((a) => a.status === "em_aquecimento")
          .map(async (a) => {
            try {
              const i = await waBulkService.aquecimentoInfo(a.id);
              if (i) infos[a.id] = i;
            } catch {}
          }),
      );
      setWarmInfo(infos);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar APIs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const resetForm = () => setForm({
    nome: "", numero_telefone: "", display_name: "", phone_number_id: "",
    waba_id: "", business_account_id: "", app_id: "", access_token: "",
    msgs_limite_diario: "", msgs_limite_horario: "", observacoes: "",
  });

  const salvar = async () => {
    if (!form.nome || !form.numero_telefone || !form.phone_number_id || !form.access_token) {
      toast.error("Preencha nome, número, phone_number_id e access_token");
      return;
    }
    setSaving(true);
    try {
      await waBulkService.createApi({
        nome: form.nome,
        numero_telefone: form.numero_telefone,
        display_name: form.display_name || null,
        phone_number_id: form.phone_number_id,
        waba_id: form.waba_id || null,
        business_account_id: form.business_account_id || null,
        app_id: form.app_id || null,
        access_token: form.access_token,
        msgs_limite_diario: form.msgs_limite_diario ? Number(form.msgs_limite_diario) : null,
        msgs_limite_horario: form.msgs_limite_horario ? Number(form.msgs_limite_horario) : null,
        observacoes: form.observacoes || null,
        status: "ativo",
      });
      toast.success("API conectada");
      setOpenDialog(false);
      resetForm();
      carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async (api: WaBulkApi) => {
    try {
      await waBulkService.toggleApi(api.id, api.status !== "ativo");
      toast.success(api.status === "ativo" ? "API pausada" : "API ativada");
      carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao alterar status");
    }
  };

  const remover = async (api: WaBulkApi) => {
    if (!confirm(`Remover a API "${api.nome}"?`)) return;
    try {
      await waBulkService.deleteApi(api.id);
      toast.success("API removida");
      carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao remover");
    }
  };

  const enviarTeste = async () => {
    if (!testApi) return;
    if (!testForm.destinatario) { toast.error("Informe o destinatário"); return; }
    setTesting(true);
    try {
      const r = await waBulkService.testarEnvio({
        api_id: testApi.id,
        destinatario: testForm.destinatario.replace(/\D/g, ""),
        texto: testForm.texto,
      });
      toast.success(r?.id ? `Enviado (id ${r.id})` : "Enviado");
      setTestApi(null);
      carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Falha no envio");
    } finally { setTesting(false); }
  };

  const dispararWorker = async () => {
    try {
      const r = await waBulkService.dispararWorker();
      toast.success(`Worker executado: ${r?.processados ?? 0} mensagens`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao executar worker");
    }
  };

  const iniciarAquecimento = async (api: WaBulkApi) => {
    if (!confirm(`Iniciar aquecimento gradual para "${api.nome}"? O limite diário será ajustado por fases (1-7, 8-14, 15-21 dias) conforme configuração.`)) return;
    try {
      await waBulkService.iniciarAquecimento(api.id);
      toast.success("Aquecimento iniciado");
      carregar();
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  const promoverAquecimento = async () => {
    try {
      const n = await waBulkService.promoverAquecimento();
      toast.success(n > 0 ? `${n} API(s) promovida(s) para ativa` : "Nenhuma API pronta para promoção");
      carregar();
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Conexões / APIs</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie múltiplas APIs Meta para distribuir o envio em massa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={dispararWorker}>
            <Send className="mr-2 h-4 w-4" /> Disparar fila
          </Button>
          <Button variant="outline" onClick={promoverAquecimento}>
            <Flame className="mr-2 h-4 w-4" /> Promover aquecidas
          </Button>
          <Dialog open={openDialog} onOpenChange={(o) => { setOpenDialog(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova API</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Conectar nova API Meta</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nome interno *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="API #1 - Marketing" />
                </div>
                <div>
                  <Label>Número de telefone *</Label>
                  <Input value={form.numero_telefone} onChange={(e) => setForm({ ...form, numero_telefone: e.target.value })} placeholder="+5511999999999" />
                </div>
                <div>
                  <Label>Display name</Label>
                  <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                </div>
                <div>
                  <Label>phone_number_id *</Label>
                  <Input value={form.phone_number_id} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} />
                </div>
                <div>
                  <Label>waba_id</Label>
                  <Input value={form.waba_id} onChange={(e) => setForm({ ...form, waba_id: e.target.value })} />
                </div>
                <div>
                  <Label>business_account_id</Label>
                  <Input value={form.business_account_id} onChange={(e) => setForm({ ...form, business_account_id: e.target.value })} />
                </div>
                <div>
                  <Label>app_id</Label>
                  <Input value={form.app_id} onChange={(e) => setForm({ ...form, app_id: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Access token *</Label>
                  <Input type="password" value={form.access_token} onChange={(e) => setForm({ ...form, access_token: e.target.value })} />
                </div>
                <div>
                  <Label>Limite diário (opcional)</Label>
                  <Input type="number" value={form.msgs_limite_diario} onChange={(e) => setForm({ ...form, msgs_limite_diario: e.target.value })} placeholder="500" />
                </div>
                <div>
                  <Label>Limite por hora (opcional)</Label>
                  <Input type="number" value={form.msgs_limite_horario} onChange={(e) => setForm({ ...form, msgs_limite_horario: e.target.value })} placeholder="50" />
                </div>
                <div className="col-span-2">
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
                <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Conectar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Carregando APIs...</Card>
      ) : apis.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma API conectada ainda. Clique em "Nova API" para começar.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {apis.map((api) => {
            const st = STATUS_LABEL[api.status] ?? STATUS_LABEL.inativo;
            const warm = warmInfo[api.id];
            const lim = warm?.limite_efetivo ?? api.msgs_limite_diario ?? 500;
            const pct = Math.min(100, Math.round((api.msgs_enviadas_hoje / lim) * 100));
            return (
              <Card key={api.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{api.nome}</h3>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {warm && (
                        <Badge variant="outline" className="gap-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          {warm.fase} · dia {warm.dias}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{api.numero_telefone} · {api.phone_number_id}</p>
                  </div>
                  <div className="flex gap-2">
                    {api.status !== "em_aquecimento" && (
                      <Button variant="outline" size="sm" onClick={() => iniciarAquecimento(api)}>
                        <Flame className="mr-1 h-3.5 w-3.5" /> Aquecer
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => togglePause(api)}>
                      {api.status === "ativo" ? <><Pause className="mr-1 h-3.5 w-3.5" /> Pausar</> : <><Play className="mr-1 h-3.5 w-3.5" /> Ativar</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setTestApi(api)}>
                      <MessageSquare className="mr-1 h-3.5 w-3.5" /> Testar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remover(api)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Saúde</p>
                    <Progress value={api.saude} className="mt-1 h-2" />
                    <p className="text-xs">{api.saude}/100</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hoje</p>
                    <Progress value={pct} className="mt-1 h-2" />
                    <p className="text-xs">
                      {api.msgs_enviadas_hoje} / {lim}
                      {warm && <span className="ml-1 text-orange-500">(aquecimento)</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total enviadas</p>
                    <p className="text-base font-semibold">{api.total_enviadas}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Erros</p>
                    <p className="text-base font-semibold">{api.total_erros}</p>
                  </div>
                </div>
                {api.ultimo_erro && (
                  <p className="mt-2 text-xs text-destructive truncate">Último erro: {api.ultimo_erro}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!testApi} onOpenChange={(o) => !o && setTestApi(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar mensagem de teste</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Via API: <strong>{testApi?.nome}</strong></p>
            <div>
              <Label>Destinatário (com DDD/país)</Label>
              <Input value={testForm.destinatario} onChange={(e) => setTestForm({ ...testForm, destinatario: e.target.value })} placeholder="5511999999999" />
            </div>
            <div>
              <Label>Mensagem (texto livre, fora da janela 24h não funciona)</Label>
              <Textarea rows={3} value={testForm.texto} onChange={(e) => setTestForm({ ...testForm, texto: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestApi(null)}>Cancelar</Button>
            <Button onClick={enviarTeste} disabled={testing}>{testing ? "Enviando..." : "Enviar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}