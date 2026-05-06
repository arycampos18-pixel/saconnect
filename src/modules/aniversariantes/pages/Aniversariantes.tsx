import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cake, Loader2, MessageCircle, Phone, Search, Send, Settings } from "lucide-react";
import { toast } from "sonner";
import { aniversariantesService, type Aniversariante } from "../services/aniversariantesService";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MENSAGEM_PADRAO = (nome: string) =>
  `Olá, ${nome}! 🎉 Hoje é seu aniversário e queremos te desejar um dia muito feliz, repleto de saúde, alegria e realizações. Conte sempre com nosso mandato!`;

export default function Aniversariantes() {
  const [periodo, setPeriodo] = useState<"hoje" | "7d" | "30d">("hoje");
  const [lista, setLista] = useState<Aniversariante[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<{ ativo: boolean; template: string; apenas_lgpd: boolean } | null>(null);
  const [savingCfg, setSavingCfg] = useState(false);
  const [disparando, setDisparando] = useState(false);

  useEffect(() => {
    setLoading(true);
    const dias = periodo === "hoje" ? 0 : periodo === "7d" ? 7 : 30;
    aniversariantesService
      .noPeriodo(dias)
      .then(setLista)
      .catch((e) => toast.error(e.message ?? "Erro ao carregar aniversariantes."))
      .finally(() => setLoading(false));
  }, [periodo]);

  useEffect(() => {
    aniversariantesService.obterConfig().then((c: any) => {
      if (c) setCfg({ ativo: c.ativo, template: c.template, apenas_lgpd: c.apenas_lgpd });
    }).catch(() => {});
  }, []);

  async function salvarCfg() {
    if (!cfg) return;
    setSavingCfg(true);
    try {
      await aniversariantesService.salvarConfig(cfg);
      toast.success("Configuração salva");
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingCfg(false); }
  }

  async function dispararAgora() {
    setDisparando(true);
    try {
      const r = await aniversariantesService.dispararAgora();
      toast.success(`Disparo concluído: ${r.enviados} enviados, ${r.falhas} falhas, ${r.pulados} já enviados hoje`);
    } catch (e: any) { toast.error(e.message); }
    finally { setDisparando(false); }
  }

  const filtrada = useMemo(() => {
    const s = busca.trim().toLowerCase();
    if (!s) return lista;
    return lista.filter((a) =>
      `${a.nome} ${a.telefone} ${a.bairro ?? ""} ${a.cidade ?? ""}`.toLowerCase().includes(s)
    );
  }, [lista, busca]);

  function abrirWhatsApp(a: Aniversariante) {
    const tel = a.telefone.replace(/\D/g, "");
    if (!tel) { toast.error("Telefone inválido."); return; }
    const numeroBR = tel.startsWith("55") ? tel : `55${tel}`;
    const msg = encodeURIComponent(MENSAGEM_PADRAO(a.nome.split(" ")[0]));
    window.open(`https://wa.me/${numeroBR}?text=${msg}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <Cake className="h-7 w-7 text-primary" /> Aniversariantes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estreite laços enviando uma mensagem personalizada de aniversário.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as any)}>
          <TabsList>
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="7d">Próximos 7 dias</TabsTrigger>
            <TabsTrigger value="30d">Próximos 30 dias</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, bairro..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-elegant-sm">
          <p className="text-sm text-muted-foreground">Total no período</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{lista.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-elegant-sm">
          <p className="text-sm text-muted-foreground">Hoje</p>
          <p className="mt-1 text-3xl font-bold text-foreground">
            {lista.filter((a) => {
              const h = new Date(); return a.dia === h.getDate() && a.mes === h.getMonth() + 1;
            }).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-elegant-sm">
          <p className="text-sm text-muted-foreground">Filtrados</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{filtrada.length}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Settings className="h-4 w-4" /> Envio automático diário</CardTitle>
          <Button size="sm" onClick={dispararAgora} disabled={disparando}>
            <Send className="mr-2 h-4 w-4" />
            {disparando ? "Disparando..." : "Disparar agora (hoje)"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!cfg ? (
            <p className="text-sm text-muted-foreground">Carregando configuração...</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Switch checked={cfg.ativo} onCheckedChange={(v) => setCfg({ ...cfg, ativo: v })} />
                <span className="text-sm">Ativar envio automático diário (todo dia às 09h)</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={cfg.apenas_lgpd} onCheckedChange={(v) => setCfg({ ...cfg, apenas_lgpd: v })} />
                <span className="text-sm">Enviar apenas para quem deu consentimento LGPD</span>
              </div>
              <div>
                <label className="text-sm font-medium">Modelo da mensagem (use <code>{"{nome}"}</code>)</label>
                <Textarea
                  value={cfg.template}
                  onChange={(e) => setCfg({ ...cfg, template: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={salvarCfg} disabled={savingCfg}>
                  {savingCfg ? "Salvando..." : "Salvar configuração"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtrada.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
          Nenhum aniversariante encontrado.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtrada.map((a) => {
            const h = new Date();
            const ehHoje = a.dia === h.getDate() && a.mes === h.getMonth() + 1;
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-elegant-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Cake className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{a.nome}</p>
                      {ehHoje && <Badge className="bg-primary text-primary-foreground">Hoje</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {String(a.dia).padStart(2, "0")}/{String(a.mes).padStart(2, "0")} · {a.idade} anos · {a.bairro ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {a.telefone}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => abrirWhatsApp(a)}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Felicitar
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}