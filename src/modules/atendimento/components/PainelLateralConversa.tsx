import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, StickyNote, Tag as TagIcon, X, User, Cake, MapPin, Mail, IdCard, Briefcase, CalendarDays, MessageSquare, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { atendimentoService, TAGS_SUGERIDAS, type Conversa } from "../services/atendimentoService";
import { eleitorContextoService } from "../services/eleitorContextoService";
import { tagService } from "../services/configAvancadaService";
import { formatPhoneBR } from "@/shared/utils/phone";

interface Props { conversa: Conversa }

export function PainelLateralConversa({ conversa }: Props) {
  const qc = useQueryClient();
  const [novaNota, setNovaNota] = useState("");
  const [novaTag, setNovaTag] = useState("");
  const [tagsLocais, setTagsLocais] = useState<string[]>(conversa.tags ?? []);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setTagsLocais(conversa.tags ?? []);
  }, [conversa.id, conversa.tags]);

  const { data: notas = [] } = useQuery({
    queryKey: ["notas", conversa.id],
    queryFn: () => atendimentoService.listarNotas(conversa.id),
  });

  const { data: tagsCadastradas = [] } = useQuery({
    queryKey: ["whatsapp-tags-cadastradas"],
    queryFn: () => tagService.list(),
  });
  const corDaTag = (nome: string) =>
    tagsCadastradas.find((t) => t.nome.toLowerCase() === nome.toLowerCase() && t.ativo)?.cor;

  const { data: atendentes = [] } = useQuery({
    queryKey: ["atendentes"],
    queryFn: () => atendimentoService.listarAtendentes(),
  });

  const { data: contexto } = useQuery({
    queryKey: ["eleitor-contexto", conversa.id, conversa.eleitor_id, conversa.telefone_digits],
    queryFn: () => eleitorContextoService.buscar({
      eleitorId: conversa.eleitor_id,
      telefoneDigits: conversa.telefone_digits,
      conversaIdAtual: conversa.id,
    }),
  });

  // Realtime notas
  useEffect(() => {
    const ch = supabase
      .channel(`notas-${conversa.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "whatsapp_conversa_notas",
        filter: `conversa_id=eq.${conversa.id}`,
      }, () => qc.invalidateQueries({ queryKey: ["notas", conversa.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversa.id, qc]);

  const sugestoes = useMemo(() => {
    const cadastradas = tagsCadastradas.filter((t) => t.ativo).map((t) => t.nome);
    const base = cadastradas.length > 0 ? cadastradas : TAGS_SUGERIDAS;
    return base.filter((t) => !tagsLocais.includes(t));
  }, [tagsLocais, tagsCadastradas]);

  const persistirTags = async (next: string[]) => {
    setTagsLocais(next);
    setSalvando(true);
    try {
      await atendimentoService.atualizarTags(conversa.id, next);
      qc.invalidateQueries({ queryKey: ["conversa", conversa.id] });
      qc.invalidateQueries({ queryKey: ["conversas"] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar tags");
    } finally {
      setSalvando(false);
    }
  };

  const adicionarTag = (t: string) => {
    const v = t.trim();
    if (!v || tagsLocais.includes(v)) return;
    persistirTags([...tagsLocais, v]);
    setNovaTag("");
  };

  const removerTag = (t: string) => persistirTags(tagsLocais.filter((x) => x !== t));

  const adicionarNota = async () => {
    const v = novaNota.trim();
    if (!v) return;
    try {
      await atendimentoService.criarNota(conversa.id, v);
      setNovaNota("");
      qc.invalidateQueries({ queryKey: ["notas", conversa.id] });
      toast.success("Nota adicionada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    }
  };

  const removerNota = async (id: string) => {
    try {
      await atendimentoService.removerNota(id);
      qc.invalidateQueries({ queryKey: ["notas", conversa.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao remover");
    }
  };

  const nomeAutor = (uid: string | null) =>
    uid ? ((atendentes as any[]).find((a) => a.user_id === uid)?.nome ?? "Atendente") : "Sistema";

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l bg-card lg:flex">
      <Tabs defaultValue="eleitor" className="flex h-full flex-col">
        <TabsList className="m-2 grid grid-cols-3">
          <TabsTrigger value="eleitor"><User className="mr-1 h-3 w-3" />Eleitor</TabsTrigger>
          <TabsTrigger value="notas"><StickyNote className="mr-1 h-3 w-3" />Notas</TabsTrigger>
          <TabsTrigger value="tags"><TagIcon className="mr-1 h-3 w-3" />Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="eleitor" className="flex flex-1 flex-col overflow-hidden p-0">
          <ContextoEleitor conversa={conversa} contexto={contexto} />
        </TabsContent>

        <TabsContent value="notas" className="flex flex-1 flex-col gap-2 overflow-hidden p-2 pt-0">
          <Textarea
            value={novaNota}
            onChange={(e) => setNovaNota(e.target.value)}
            placeholder="Anotação interna (não enviada ao contato)…"
            rows={3}
          />
          <Button size="sm" onClick={adicionarNota} disabled={!novaNota.trim()}>
            <Plus className="mr-1 h-3 w-3" /> Adicionar nota
          </Button>
          <ScrollArea className="flex-1">
            {notas.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">Sem notas</div>
            )}
            <ul className="space-y-2">
              {notas.map((n) => (
                <li key={n.id}>
                  <Card className="p-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="whitespace-pre-wrap text-xs">{n.conteudo}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removerNota(n.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>{nomeAutor(n.autor_id)}</span>
                      <span>{new Date(n.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="tags" className="flex flex-1 flex-col gap-3 overflow-hidden p-2 pt-0">
          <div>
            <p className="mb-1 text-xs font-medium">Tags atuais</p>
            <div className="flex flex-wrap gap-1">
              {tagsLocais.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhuma tag</span>
              )}
              {tagsLocais.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="gap-1"
                  style={corDaTag(t) ? { backgroundColor: corDaTag(t), color: "#fff" } : undefined}
                >
                  {t}
                  <button onClick={() => removerTag(t)} className="opacity-60 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium">Adicionar nova</p>
            <div className="flex gap-1">
              <Input
                value={novaTag}
                onChange={(e) => setNovaTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarTag(novaTag); } }}
                placeholder="Ex.: Urgente"
                className="h-8 text-xs"
              />
              <Button size="sm" onClick={() => adicionarTag(novaTag)} disabled={!novaTag.trim() || salvando}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {sugestoes.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Sugestões</p>
              <div className="flex flex-wrap gap-1">
                {sugestoes.map((t) => (
                  <button
                    key={t}
                    onClick={() => adicionarTag(t)}
                    className="rounded-full border border-dashed px-2 py-0.5 text-xs hover:border-solid hover:bg-muted"
                    style={corDaTag(t) ? { borderColor: corDaTag(t), color: corDaTag(t) } : undefined}
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function ContextoEleitor({
  conversa,
  contexto,
}: {
  conversa: Conversa;
  contexto: Awaited<ReturnType<typeof eleitorContextoService.buscar>> | undefined;
}) {
  if (!contexto) {
    return <div className="p-4 text-center text-xs text-muted-foreground">Carregando…</div>;
  }

  if (!contexto.eleitor) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <User className="h-10 w-10 text-muted-foreground" />
        <div className="text-sm font-medium">Contato não cadastrado</div>
        <p className="text-xs text-muted-foreground">
          {formatPhoneBR(conversa.telefone)} ainda não está vinculado a um eleitor.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to={`/app/eleitores?telefone=${conversa.telefone_digits}`}>
            <Plus className="mr-1 h-3 w-3" /> Cadastrar como eleitor
          </Link>
        </Button>
      </div>
    );
  }

  const e = contexto.eleitor;
  const idade = e.data_nascimento ? Math.floor((Date.now() - new Date(e.data_nascimento).getTime()) / (365.25 * 86400000)) : null;

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-3 p-3">
        {/* Identificação */}
        <Card className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-semibold">{e.nome}</div>
              <div className="text-xs text-muted-foreground">{formatPhoneBR(e.telefone)}</div>
            </div>
            <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Abrir cadastro">
              <Link to={`/app/eleitores?id=${e.id}`}><ExternalLink className="h-3 w-3" /></Link>
            </Button>
          </div>

          <div className="mt-2 space-y-1 text-xs">
            {e.email && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{e.email}</span>
              </div>
            )}
            {e.cpf && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <IdCard className="h-3 w-3 shrink-0" /> <span>{e.cpf}</span>
              </div>
            )}
            {e.data_nascimento && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Cake className="h-3 w-3 shrink-0" />
                <span>{new Date(e.data_nascimento).toLocaleDateString("pt-BR")}{idade !== null && ` · ${idade} anos`}</span>
              </div>
            )}
            {(e.bairro || e.cidade) && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {[e.bairro, e.cidade, e.uf].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <ShieldCheck className={`h-3 w-3 shrink-0 ${e.consentimento_lgpd ? "text-emerald-500" : "text-muted-foreground"}`} />
              <span className={e.consentimento_lgpd ? "text-emerald-600" : "text-muted-foreground"}>
                {e.consentimento_lgpd ? "Consente LGPD" : "Sem consentimento LGPD"}
              </span>
            </div>
          </div>

          {contexto.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {contexto.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          )}

          {e.observacoes && (
            <p className="mt-2 line-clamp-3 rounded bg-muted p-2 text-[11px] italic text-muted-foreground">
              {e.observacoes}
            </p>
          )}
        </Card>

        {/* Oportunidades CRM */}
        {contexto.oportunidades.length > 0 && (
          <SecaoLista
            titulo="Oportunidades CRM"
            icone={<Briefcase className="h-3 w-3" />}
            items={contexto.oportunidades.map((o) => ({
              key: o.id,
              titulo: o.titulo,
              sub: [o.etapa_nome, new Date(o.created_at).toLocaleDateString("pt-BR")].filter(Boolean).join(" · "),
              link: `/app/crm`,
            }))}
          />
        )}

        {/* Interações CRM */}
        {contexto.interacoesCrm.length > 0 && (
          <SecaoLista
            titulo="Últimas interações"
            icone={<MessageSquare className="h-3 w-3" />}
            items={contexto.interacoesCrm.map((i) => ({
              key: i.id,
              titulo: i.tipo,
              sub: `${i.descricao ?? ""}${i.descricao ? " · " : ""}${new Date(i.data_interacao).toLocaleDateString("pt-BR")}`,
            }))}
          />
        )}

        {/* Eventos inscritos */}
        {contexto.eventosInscritos.length > 0 && (
          <SecaoLista
            titulo="Eventos"
            icone={<CalendarDays className="h-3 w-3" />}
            items={contexto.eventosInscritos.map((ev) => ({
              key: ev.id,
              titulo: ev.nome,
              sub: `${new Date(ev.data_hora).toLocaleDateString("pt-BR")} · ${ev.presente ? "✅ Presente" : "Inscrito"}`,
              link: `/app/eventos`,
            }))}
          />
        )}

        {/* Conversas anteriores */}
        {contexto.conversasAnteriores.length > 0 && (
          <SecaoLista
            titulo="Outras conversas"
            icone={<MessageSquare className="h-3 w-3" />}
            items={contexto.conversasAnteriores.slice(0, 5).map((c) => ({
              key: c.id,
              titulo: c.ultima_mensagem ?? "(sem prévia)",
              sub: `${c.status}${c.ultima_mensagem_em ? " · " + new Date(c.ultima_mensagem_em).toLocaleDateString("pt-BR") : ""}`,
              link: `/app/atendimento?conversa=${c.id}`,
            }))}
          />
        )}
      </div>
    </ScrollArea>
  );
}

function SecaoLista({
  titulo, icone, items,
}: {
  titulo: string;
  icone: React.ReactNode;
  items: Array<{ key: string; titulo: string; sub?: string; link?: string }>;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground">
        {icone} {titulo}
      </div>
      <ul className="space-y-1">
        {items.map((it) => {
          const inner = (
            <Card className="p-2 text-xs hover:bg-muted/60">
              <div className="line-clamp-1 font-medium">{it.titulo}</div>
              {it.sub && <div className="line-clamp-1 text-[10px] text-muted-foreground">{it.sub}</div>}
            </Card>
          );
          return (
            <li key={it.key}>
              {it.link ? <Link to={it.link}>{inner}</Link> : inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}