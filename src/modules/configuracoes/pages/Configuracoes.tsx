import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Settings, Save, Loader2, Palette, Vote, Shield, Sliders, Plug, Users, Building2, Ticket, Database, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { configService, type SistemaConfig } from "../services/configService";
import { toast } from "sonner";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import CentralIntegracoes from "./CentralIntegracoes";

const UsersManager = lazy(() => import("@/modules/settings/pages/UsersManager"));
const DepartamentosGabinete = lazy(() => import("@/modules/departamentos-gabinete/pages/DepartamentosGabinete"));
const TicketsSettings = lazy(() => import("@/modules/tickets/pages/TicketsSettings"));
const Backup = lazy(() => import("@/modules/backup/pages/Backup"));
const PermissoesCadastroPanel = lazy(() => import("../components/PermissoesCadastroPanel"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-16 text-muted-foreground">
    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
  </div>
);

export default function Configuracoes() {
  const { isAdmin } = useUserRole();
  const [params] = useSearchParams();
  const initialTab = params.get("tab") || "branding";
  const { data, refetch } = useQuery({ queryKey: ["sistema_config"], queryFn: () => configService.obter() });
  const [form, setForm] = useState<Partial<SistemaConfig>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  function set<K extends keyof SistemaConfig>(k: K, v: SistemaConfig[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function salvar() {
    setSaving(true);
    try {
      await configService.salvar(form);
      toast.success("Configurações salvas");
      await refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        Apenas administradores podem acessar as configurações do sistema.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <Settings className="h-7 w-7 text-primary" /> Configurações Gerais
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Branding, parâmetros eleitorais, LGPD e regras de envio.</p>
        </div>
        <Button onClick={salvar} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar tudo
        </Button>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="branding"><Palette className="mr-2 h-4 w-4" />Geral</TabsTrigger>
          <TabsTrigger value="eleitoral"><Vote className="mr-2 h-4 w-4" />Eleitoral</TabsTrigger>
          <TabsTrigger value="lgpd"><Shield className="mr-2 h-4 w-4" />LGPD</TabsTrigger>
          <TabsTrigger value="limites"><Sliders className="mr-2 h-4 w-4" />Limites</TabsTrigger>
          <TabsTrigger value="usuarios"><Users className="mr-2 h-4 w-4" />Usuários</TabsTrigger>
          <TabsTrigger value="departamentos"><Building2 className="mr-2 h-4 w-4" />Departamentos</TabsTrigger>
          <TabsTrigger value="integracoes"><Plug className="mr-2 h-4 w-4" />Integrações</TabsTrigger>
          <TabsTrigger value="tickets"><Ticket className="mr-2 h-4 w-4" />Tickets</TabsTrigger>
          <TabsTrigger value="backup"><Database className="mr-2 h-4 w-4" />Backup</TabsTrigger>
          <TabsTrigger value="permissoes-cadastro"><ShieldCheck className="mr-2 h-4 w-4" />Permissões de cadastro</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <Card><CardHeader><CardTitle className="text-base">Identidade do mandato</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div><Label>Nome do mandato</Label>
                <Input value={form.nome_mandato ?? ""} onChange={(e) => set("nome_mandato", e.target.value)} />
              </div>
              <div><Label>Cor primária (hex)</Label>
                <div className="flex items-center gap-2">
                  <Input value={form.cor_primaria ?? ""} onChange={(e) => set("cor_primaria", e.target.value)} />
                  <div className="h-10 w-10 rounded border" style={{ backgroundColor: form.cor_primaria ?? "#2563EB" }} />
                </div>
              </div>
              <div className="md:col-span-2"><Label>URL do logo</Label>
                <Input placeholder="https://..." value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eleitoral">
          <Card><CardHeader><CardTitle className="text-base">Parâmetros eleitorais</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div><Label>Cargo</Label><Input value={form.cargo ?? ""} onChange={(e) => set("cargo", e.target.value)} /></div>
              <div><Label>Partido</Label><Input value={form.partido ?? ""} onChange={(e) => set("partido", e.target.value)} /></div>
              <div><Label>Número eleitoral</Label><Input value={form.numero_eleitoral ?? ""} onChange={(e) => set("numero_eleitoral", e.target.value)} /></div>
              <div><Label>Jurisdição (município/estado)</Label><Input value={form.jurisdicao ?? ""} onChange={(e) => set("jurisdicao", e.target.value)} /></div>
              <div><Label>Fuso horário</Label><Input value={form.fuso_horario ?? ""} onChange={(e) => set("fuso_horario", e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lgpd">
          <Card><CardHeader><CardTitle className="text-base">LGPD e textos legais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Texto de consentimento</Label>
                <Textarea rows={3} value={form.texto_consentimento ?? ""} onChange={(e) => set("texto_consentimento", e.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label>URL da política de privacidade</Label>
                  <Input value={form.url_politica_privacidade ?? ""} onChange={(e) => set("url_politica_privacidade", e.target.value)} />
                </div>
                <div><Label>E-mail do DPO</Label>
                  <Input type="email" value={form.email_dpo ?? ""} onChange={(e) => set("email_dpo", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limites">
          <Card><CardHeader><CardTitle className="text-base">Limites e regras</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div><Label>Limite de mensagens/dia</Label>
                  <Input type="number" value={form.limite_mensagens_dia ?? 0} onChange={(e) => set("limite_mensagens_dia", Number(e.target.value))} />
                </div>
                <div><Label>Hora início envio (0-23)</Label>
                  <Input type="number" min={0} max={23} value={form.horario_envio_inicio ?? 9} onChange={(e) => set("horario_envio_inicio", Number(e.target.value))} />
                </div>
                <div><Label>Hora fim envio (0-23)</Label>
                  <Input type="number" min={0} max={23} value={form.horario_envio_fim ?? 20} onChange={(e) => set("horario_envio_fim", Number(e.target.value))} />
                </div>
                <div><Label>Máximo de tentativas</Label>
                  <Input type="number" min={1} max={10} value={form.max_tentativas ?? 3} onChange={(e) => set("max_tentativas", Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <Switch checked={!!form.notificar_responsavel_tarefa} onCheckedChange={(v) => set("notificar_responsavel_tarefa", v)} />
                  <span className="text-sm">Notificar responsável quando tarefa estiver para vencer</span>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={!!form.notificar_evento_proximo} onCheckedChange={(v) => set("notificar_evento_proximo", v)} />
                  <span className="text-sm">Notificar responsável de eventos próximos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes">
          <CentralIntegracoes />
        </TabsContent>

        <TabsContent value="usuarios">
          <Suspense fallback={<TabFallback />}><UsersManager /></Suspense>
        </TabsContent>

        <TabsContent value="departamentos">
          <Suspense fallback={<TabFallback />}><DepartamentosGabinete /></Suspense>
        </TabsContent>

        <TabsContent value="tickets">
          <Suspense fallback={<TabFallback />}><TicketsSettings /></Suspense>
        </TabsContent>

        <TabsContent value="backup">
          <Suspense fallback={<TabFallback />}><Backup /></Suspense>
        </TabsContent>

        <TabsContent value="permissoes-cadastro">
          <Suspense fallback={<TabFallback />}><PermissoesCadastroPanel /></Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}