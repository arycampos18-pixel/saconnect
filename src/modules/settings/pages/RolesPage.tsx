import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Eye, Pencil, Plus as PlusIcon, Trash2, Shield, ShieldCheck, Save, Loader2, Search,
  Settings as SettingsIcon, Users, Building2, FileBarChart, MessageSquare, Megaphone, Vote,
  UserPlus, Bot, ClipboardList, Calendar, Network, Activity, Inbox, Headphones, Plug,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompany } from "../contexts/CompanyContext";
import {
  settingsService,
  type SettingsProfile,
  type SettingsPermission,
} from "../services/settingsService";

// ---------- Helpers de classificação ----------

type ActionKind = "view" | "edit" | "create" | "delete" | "other";

const ACTION_META: Record<ActionKind, { label: string; icon: typeof Eye; color: string }> = {
  view:   { label: "Visualizar", icon: Eye,       color: "text-sky-600" },
  edit:   { label: "Editar",     icon: Pencil,    color: "text-amber-600" },
  create: { label: "Incluir",    icon: PlusIcon,  color: "text-emerald-600" },
  delete: { label: "Excluir",    icon: Trash2,    color: "text-destructive" },
  other:  { label: "Outras",     icon: Shield,    color: "text-muted-foreground" },
};

function classifyAction(permissionId: string): ActionKind {
  const last = permissionId.split(".").pop()?.toLowerCase() ?? "";
  if (["view", "read", "list"].includes(last)) return "view";
  if (["create", "insert", "add", "new"].includes(last)) return "create";
  if (["delete", "remove", "destroy"].includes(last)) return "delete";
  if (["edit", "update", "manage", "send", "close", "interacoes", "links_captacao", "meus_eleitores"].includes(last)) return "edit";
  return "other";
}

const MODULE_META: Record<string, { label: string; icon: typeof SettingsIcon }> = {
  settings:      { label: "Configurações",         icon: SettingsIcon },
  whatsapp:      { label: "WhatsApp (Z-API)",      icon: MessageSquare },
  wa_meta:       { label: "WhatsApp Oficial",      icon: Plug },
  atendimento:   { label: "Atendimento",           icon: Headphones },
  disparos:      { label: "Disparos",              icon: Megaphone },
  automacoes:    { label: "Automações",            icon: Bot },
  tickets:       { label: "Tickets",               icon: Inbox },
  eleitores:     { label: "Eleitores",             icon: Vote },
  eventos:       { label: "Eventos",               icon: Calendar },
  crm:           { label: "CRM",                   icon: ClipboardList },
  cabos:         { label: "Cabos eleitorais",      icon: Network },
  liderancas:    { label: "Lideranças",            icon: UserPlus },
  departamentos: { label: "Departamentos",         icon: Building2 },
  political:     { label: "Funcionalidades políticas", icon: Vote },
  relatorios:    { label: "Relatórios",            icon: FileBarChart },
};

function moduleLabel(key: string) {
  return MODULE_META[key.toLowerCase()]?.label ?? key;
}
function ModuleIcon({ module }: { module: string }) {
  const Icon = MODULE_META[module.toLowerCase()]?.icon ?? Shield;
  return <Icon className="h-4 w-4 text-primary" />;
}

// ---------- Super-grupos (espelham o menu lateral) ----------
type SuperKey = "configuracoes" | "whatsapp" | "wa_oficial" | "tickets" | "politico";

const SUPER_META: Record<SuperKey, { label: string; icon: typeof SettingsIcon; modules: string[] }> = {
  configuracoes: {
    label: "Configurações",
    icon: SettingsIcon,
    modules: ["settings"],
  },
  whatsapp: {
    label: "WhatsApp (Z-API)",
    icon: MessageSquare,
    modules: ["whatsapp", "atendimento", "disparos", "automacoes"],
  },
  wa_oficial: {
    label: "WhatsApp Oficial",
    icon: Plug,
    modules: ["wa_meta"],
  },
  tickets: {
    label: "Tickets",
    icon: Inbox,
    modules: ["tickets"],
  },
  politico: {
    label: "Político",
    icon: Vote,
    modules: [
      "eleitores", "liderancas", "cabos", "crm", "eventos",
      "departamentos", "political", "relatorios",
    ],
  },
};

// Espelha a ordem do menu lateral: Político → WhatsApp → Tickets → WhatsApp Oficial → Configurações
const SUPER_ORDER: SuperKey[] = ["politico", "whatsapp", "wa_oficial", "tickets", "configuracoes"];

function superOfModule(moduleKey: string): SuperKey {
  const k = moduleKey.toLowerCase();
  for (const sk of SUPER_ORDER) {
    if (SUPER_META[sk].modules.includes(k)) return sk;
  }
  return "configuracoes";
}

// Ordem de features dentro de cada módulo — espelha o menu lateral.
const FEATURE_ORDER: Record<string, string[]> = {
  // Configurações
  settings:    ["companies", "users", "profiles", "backup", "notificacoes", "dashboard"],
  // WhatsApp (Z-API)
  whatsapp:    ["dashboard", "sessions", "chat", "contacts", "compositor", "campanhas", "chatbot", "relatorios", "settings"],
  atendimento: ["configuracoes", "stories", "relatorios"],
  disparos:    ["geral"],
  automacoes:  ["geral"],
  // WhatsApp Oficial
  wa_meta:     ["dashboard", "connect", "sessions", "settings"],
  // Tickets
  tickets:     ["dashboard", "chamados", "agenda", "filas", "categorias", "sla", "settings"],
  // Político — segue ordem do sidebar (CRM/Eventos/Depto/Relatórios são módulos próprios)
  political:   ["hierarquia", "metas", "agenda", "mapa", "pesquisas", "aniversariantes", "gamification", "predicoes", "concorrencia", "segmentacao"],
  eleitores:   ["geral"],
  liderancas:  ["geral"],
  cabos:       ["geral"],
  crm:         ["geral"],
  eventos:     ["geral"],
  departamentos: ["geral"],
  relatorios:  ["geral"],
};

function featureRank(moduleKey: string, feature: string): number {
  const order = FEATURE_ORDER[moduleKey.toLowerCase()];
  if (!order) return 999;
  const i = order.indexOf(feature.toLowerCase());
  return i === -1 ? 999 : i;
}

// Tradução dos nomes de feature para PT-BR
const FEATURE_LABEL: Record<string, string> = {
  geral: "Geral",
  // Configurações
  companies: "Empresas",
  users: "Usuários",
  profiles: "Perfis",
  backup: "Backup",
  notificacoes: "Notificações",
  dashboard: "Painel",
  // WhatsApp
  sessions: "Conexões / Dispositivos",
  chat: "Conversas",
  contacts: "Contatos",
  compositor: "Compositor",
  campanhas: "Campanhas",
  chatbot: "Chatbot / URA",
  relatorios: "Relatórios",
  settings: "Configurações",
  // WhatsApp Oficial
  connect: "Conexão",
  // Atendimento
  configuracoes: "Configurações",
  stories: "Stories",
  // Tickets
  chamados: "Chamados",
  agenda: "Agenda",
  filas: "Filas",
  categorias: "Categorias",
  sla: "SLA",
  // Político
  hierarquia: "Dashboard hierárquico",
  metas: "Metas e gamificação",
  mapa: "Mapa eleitoral",
  pesquisas: "Pesquisas",
  aniversariantes: "Aniversariantes",
  gamification: "Gamificação",
  predicoes: "Predição eleitoral",
  concorrencia: "Concorrência",
  segmentacao: "Segmentação",
};

function featureLabel(key: string): string {
  const k = key.toLowerCase();
  return FEATURE_LABEL[k] ?? key.replace(/[._-]/g, " ");
}

// Agrupa permissões: módulo -> "feature" (resto antes da última ação) -> action -> permissão
type FeatureGroup = {
  feature: string;
  byAction: Partial<Record<ActionKind, SettingsPermission[]>>;
};
type ModuleGroup = {
  module: string;
  features: FeatureGroup[];
  total: number;
};

function groupPermissions(list: SettingsPermission[]): ModuleGroup[] {
  const byModule = new Map<string, Map<string, FeatureGroup>>();
  for (const p of list) {
    const parts = p.id.split(".");
    const moduleKey = (p.module || parts[0] || "outros").toLowerCase();
    const featureKey = parts.length > 2 ? parts.slice(1, -1).join(".") : "geral";
    const action = classifyAction(p.id);

    let mods = byModule.get(moduleKey);
    if (!mods) { mods = new Map(); byModule.set(moduleKey, mods); }
    let feat = mods.get(featureKey);
    if (!feat) { feat = { feature: featureKey, byAction: {} }; mods.set(featureKey, feat); }
    (feat.byAction[action] ||= []).push(p);
  }
  return Array.from(byModule.entries())
    .map(([module, feats]) => ({
      module,
      features: Array.from(feats.values()).sort((a, b) => {
        const ra = featureRank(module, a.feature);
        const rb = featureRank(module, b.feature);
        if (ra !== rb) return ra - rb;
        return a.feature.localeCompare(b.feature);
      }),
      total: Array.from(feats.values()).reduce(
        (s, f) => s + Object.values(f.byAction).reduce((a, l) => a + (l?.length ?? 0), 0), 0,
      ),
    }))
    .sort((a, b) => moduleLabel(a.module).localeCompare(moduleLabel(b.module)));
}

// ---------- Tela ----------

export default function RolesPage() {
  const { currentCompany, hasPermission } = useCompany();
  const qc = useQueryClient();
  const canManage = hasPermission("settings.profiles.manage");
  const [searchParams, setSearchParams] = useSearchParams();

  const [openNew, setOpenNew] = useState(false);
  const [novo, setNovo] = useState({ nome: "", descricao: "" });
  const [editando, setEditando] = useState<SettingsProfile | null>(null);
  const [edicao, setEdicao] = useState({ nome: "", descricao: "" });
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("profile"));
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  const { data: perfis = [], isLoading } = useQuery({
    queryKey: ["settings_profiles", currentCompany?.id],
    queryFn: () => (currentCompany ? settingsService.listarPerfis(currentCompany.id) : []),
    enabled: !!currentCompany,
  });

  const { data: dicionario = [] } = useQuery({
    queryKey: ["settings_permissions"],
    queryFn: () => settingsService.listarPermissoes(),
  });

  // Seleção inicial de perfil
  useEffect(() => {
    if (!perfis.length) { setSelectedId(null); return; }
    if (selectedId && perfis.some((p) => p.id === selectedId)) return;
    setSelectedId(perfis[0].id);
  }, [perfis, selectedId]);

  // Sincroniza URL
  useEffect(() => {
    if (selectedId) setSearchParams({ profile: selectedId }, { replace: true });
    else setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Carrega permissões do perfil selecionado
  useEffect(() => {
    if (!selectedId) { setPerms(new Set()); return; }
    settingsService.permissoesDoPerfil(selectedId).then((ps) => setPerms(new Set(ps)));
  }, [selectedId]);

  const selected = useMemo(
    () => perfis.find((p) => p.id === selectedId) ?? null,
    [perfis, selectedId],
  );

  const filtroDic = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return dicionario;
    return dicionario.filter((p) =>
      p.id.toLowerCase().includes(t) ||
      p.description.toLowerCase().includes(t) ||
      moduleLabel(p.module).toLowerCase().includes(t),
    );
  }, [dicionario, busca]);

  const grupos = useMemo(() => groupPermissions(filtroDic), [filtroDic]);

  function togglePerm(id: string) {
    if (!canManage) return;
    setPerms((cur) => {
      const n = new Set(cur);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleMany(ids: string[], turnOn: boolean) {
    if (!canManage) return;
    setPerms((cur) => {
      const n = new Set(cur);
      ids.forEach((id) => (turnOn ? n.add(id) : n.delete(id)));
      return n;
    });
  }

  async function salvar() {
    if (!selected) return;
    setSaving(true);
    try {
      await settingsService.definirPermissoesDoPerfil(selected.id, Array.from(perms));
      toast.success("Permissões salvas");
      qc.invalidateQueries({ queryKey: ["settings_profiles", currentCompany?.id] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function criarPerfil() {
    if (!currentCompany) return;
    try {
      const p = await settingsService.criarPerfil({ ...novo, company_id: currentCompany.id });
      toast.success("Perfil criado");
      setOpenNew(false);
      setNovo({ nome: "", descricao: "" });
      qc.invalidateQueries({ queryKey: ["settings_profiles", currentCompany.id] });
      if (p?.id) setSelectedId(p.id);
    } catch (e: any) { toast.error(e.message); }
  }

  function abrirEdicao(p: SettingsProfile) {
    setEditando(p);
    setEdicao({ nome: p.nome ?? "", descricao: p.descricao ?? "" });
  }

  async function salvarEdicao() {
    if (!editando) return;
    try {
      await settingsService.atualizarPerfil(editando.id, {
        nome: edicao.nome,
        descricao: edicao.descricao,
      });
      toast.success("Perfil atualizado");
      setEditando(null);
      qc.invalidateQueries({ queryKey: ["settings_profiles", currentCompany?.id] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remover(p: SettingsProfile) {
    if (p.is_system_default) return toast.error("Perfis padrão do sistema não podem ser removidos");
    if (!confirm(`Remover perfil "${p.nome}"?`)) return;
    try {
      await settingsService.removerPerfil(p.id);
      toast.success("Perfil removido");
      qc.invalidateQueries({ queryKey: ["settings_profiles", currentCompany?.id] });
      if (selectedId === p.id) setSelectedId(null);
    } catch (e: any) { toast.error(e.message); }
  }

  if (!currentCompany) {
    return <p className="text-sm text-muted-foreground">Selecione uma empresa no seletor global.</p>;
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary md:h-7 md:w-7" />
            <span className="break-words">Perfis &amp; Permissões</span>
          </h1>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            Crie perfis (papéis) e defina o que cada um pode <strong>visualizar</strong>, <strong>editar</strong>,{" "}
            <strong>incluir</strong> ou <strong>excluir</strong> em cada módulo do sistema.
          </p>
        </div>
        {selected && canManage && (
          <Button onClick={salvar} disabled={saving} className="shrink-0 self-start">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar permissões
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Lista de perfis */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Perfis</CardTitle>
            {canManage && (
              <Dialog open={openNew} onOpenChange={setOpenNew}>
                <DialogTrigger asChild>
                  <Button size="sm"><PlusIcon className="mr-1 h-4 w-4" /> Novo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo perfil</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Nome</Label>
                      <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                    <Button onClick={criarPerfil} disabled={!novo.nome}>Criar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : perfis.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum perfil cadastrado.</p>
            ) : (
              <ScrollArea className="max-h-[70vh]">
                <ul className="divide-y">
                  {perfis.map((p) => {
                    const active = p.id === selectedId;
                    return (
                      <li key={p.id}>
                        <div
                          className={cn(
                            "flex items-start gap-2 px-4 py-3 transition",
                            active ? "bg-primary/10" : "hover:bg-muted/40",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedId(p.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className={cn("break-words text-sm font-medium leading-snug", active && "text-primary")}>
                              {p.nome}
                            </p>
                            {p.descricao && (
                              <p className="mt-0.5 break-words text-xs leading-snug text-muted-foreground">
                                {p.descricao}
                              </p>
                            )}
                            {p.is_system_default && (
                              <Badge variant="secondary" className="mt-2 text-[10px]">Sistema</Badge>
                            )}
                          </button>

                          {canManage && (
                            <div className="flex shrink-0 items-center gap-1 self-start">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => abrirEdicao(p)}
                                aria-label={`Editar perfil ${p.nome}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {!p.is_system_default && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => remover(p)}
                                  aria-label={`Remover perfil ${p.nome}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={edicao.nome} onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={edicao.descricao} onChange={(e) => setEdicao({ ...edicao, descricao: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button onClick={salvarEdicao} disabled={!edicao.nome}>Salvar alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Matriz de permissões */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {selected ? <>Permissões de <span className="text-primary">{selected.nome}</span></> : "Permissões"}
              </CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar permissão ou módulo…"
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>
            <LegendaAcoes />
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Selecione um perfil à esquerda para configurar suas permissões.
              </p>
            ) : grupos.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nada encontrado para a busca.</p>
            ) : (
              (() => {
                // Agrupa módulos em super-grupos (espelha o sidebar)
                const bySuper = new Map<SuperKey, typeof grupos>();
                for (const sk of SUPER_ORDER) bySuper.set(sk, []);
                for (const g of grupos) {
                  bySuper.get(superOfModule(g.module))!.push(g);
                }
                // Ordena módulos dentro de cada super conforme SUPER_META.modules
                for (const sk of SUPER_ORDER) {
                  const order = SUPER_META[sk].modules;
                  bySuper.get(sk)!.sort((a, b) => {
                    const ia = order.indexOf(a.module.toLowerCase());
                    const ib = order.indexOf(b.module.toLowerCase());
                    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                  });
                }
                const supersWithItems = SUPER_ORDER.filter((sk) => (bySuper.get(sk)?.length ?? 0) > 0);

                return (
                  <Accordion type="multiple" defaultValue={supersWithItems} className="space-y-3">
                    {supersWithItems.map((sk) => {
                      const meta = SUPER_META[sk];
                      const SIcon = meta.icon;
                      const groups = bySuper.get(sk)!;
                      const allIdsSuper = groups.flatMap((g) =>
                        g.features.flatMap((f) => Object.values(f.byAction).flat())
                      ).filter(Boolean).map((p: any) => p.id);
                      const grantedS = allIdsSuper.filter((id) => perms.has(id)).length;
                      const allS = allIdsSuper.length;
                      const allCheckedS = grantedS === allS && allS > 0;

                      return (
                        <AccordionItem
                          key={sk}
                          value={sk}
                          className="rounded-xl border-2 border-primary/20 bg-primary/5 px-3"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                              <div className="flex items-center gap-2">
                                <SIcon className="h-5 w-5 text-primary" />
                                <span className="text-base font-bold text-primary">{meta.label}</span>
                                <Badge variant="outline" className="ml-1 text-[10px]">
                                  {grantedS}/{allS}
                                </Badge>
                              </div>
                              {canManage && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); toggleMany(allIdsSuper, !allCheckedS); }}
                                  className="rounded-md border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                                >
                                  {allCheckedS ? "Desmarcar tudo" : "Marcar tudo"}
                                </span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {sk === "whatsapp" ? (
                              <div className="space-y-3 pt-1">
                                {groups.flatMap((g) =>
                                  g.features.map((f) => (
                                    <FeatureRow
                                      key={`${g.module}-${f.feature}`}
                                      feature={f}
                                      perms={perms}
                                      onToggle={togglePerm}
                                      canManage={canManage}
                                    />
                                  ))
                                )}
                              </div>
                            ) : (
                            <Accordion
                              type="multiple"
                              defaultValue={groups.map((g) => g.module)}
                              className="space-y-2 pt-1"
                            >
                              {groups.map((g) => {
                                const allIds = g.features.flatMap((f) => Object.values(f.byAction).flat()).filter(Boolean).map((p: any) => p.id);
                                const granted = allIds.filter((id) => perms.has(id)).length;
                                const all = allIds.length;
                                const allChecked = granted === all && all > 0;
                                return (
                                  <AccordionItem
                                    key={g.module}
                                    value={g.module}
                                    className="rounded-lg border bg-card px-3"
                                  >
                                    <AccordionTrigger className="hover:no-underline">
                                      <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                                        <div className="flex items-center gap-2">
                                          <ModuleIcon module={g.module} />
                                          <span className="font-semibold">{moduleLabel(g.module)}</span>
                                          <Badge variant="outline" className="ml-1 text-[10px]">
                                            {granted}/{all}
                                          </Badge>
                                        </div>
                                        {canManage && (
                                          <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => { e.stopPropagation(); toggleMany(allIds, !allChecked); }}
                                            className="rounded-md border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                                          >
                                            {allChecked ? "Desmarcar tudo" : "Marcar tudo"}
                                          </span>
                                        )}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-3 pt-1">
                                        {g.features.map((f) => (
                                          <FeatureRow
                                            key={`${g.module}-${f.feature}`}
                                            feature={f}
                                            perms={perms}
                                            onToggle={togglePerm}
                                            canManage={canManage}
                                          />
                                        ))}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LegendaAcoes() {
  const ordem: ActionKind[] = ["view", "edit", "create", "delete", "other"];
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <span>Ações:</span>
      {ordem.map((k) => {
        const m = ACTION_META[k];
        const Icon = m.icon;
        return (
          <span key={k} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5">
            <Icon className={cn("h-3 w-3", m.color)} /> {m.label}
          </span>
        );
      })}
    </div>
  );
}

function FeatureRow({
  feature, perms, onToggle, canManage,
}: {
  feature: FeatureGroup;
  perms: Set<string>;
  onToggle: (id: string) => void;
  canManage: boolean;
}) {
  const ordem: ActionKind[] = ["view", "edit", "create", "delete", "other"];
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {featureLabel(feature.feature)}
      </p>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {ordem.flatMap((kind) => (feature.byAction[kind] ?? []).map((p) => {
          const meta = ACTION_META[kind];
          const Icon = meta.icon;
          const checked = perms.has(p.id);
          return (
            <label
              key={p.id}
              className={cn(
                "flex items-start gap-2 rounded-lg border bg-card p-2 text-sm transition",
                checked && "border-primary/40 bg-primary/5",
                !canManage && "opacity-60",
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(p.id)}
                disabled={!canManage}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{meta.label}</span>
                </div>
                <p className="font-medium leading-tight">{p.description}</p>
                <code className="text-[10px] text-muted-foreground">{p.id}</code>
              </div>
            </label>
          );
        }))}
      </div>
    </div>
  );
}