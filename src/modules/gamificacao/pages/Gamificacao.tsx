import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award, Medal, Star, Target, Plus, Trash2, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import {
  gamificacaoService,
  type Badge,
  type Desafio,
  type RankingItem,
  NIVEIS,
} from "../services/gamificacaoService";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { DesafioFormDialog } from "../components/DesafioFormDialog";

const ICON_MAP: Record<string, any> = { Trophy, Award, Medal, Star, Target };

function IconByName({ name, className }: { name: string; className?: string }) {
  const Cmp = ICON_MAP[name] ?? Award;
  return <Cmp className={className} />;
}

export default function Gamificacao() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [desafios, setDesafios] = useState<Desafio[]>([]);
  const [meuResumo, setMeuResumo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openDesafio, setOpenDesafio] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [r, b, d] = await Promise.all([
        gamificacaoService.ranking(),
        gamificacaoService.listarBadges(),
        gamificacaoService.listarDesafios(),
      ]);
      setRanking(r);
      setBadges(b);
      setDesafios(d);
      if (user?.id) {
        const me = await gamificacaoService.meuResumo(user.id);
        setMeuResumo(me);
      }
    } catch (e: any) {
      toast.error("Erro ao carregar gamificação", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggleDesafio = async (d: Desafio) => {
    await gamificacaoService.toggleDesafio(d.id, !d.ativo);
    toast.success(d.ativo ? "Desafio pausado" : "Desafio ativado");
    carregar();
  };

  const removerDesafio = async (id: string) => {
    if (!confirm("Remover este desafio?")) return;
    await gamificacaoService.removerDesafio(id);
    toast.success("Desafio removido");
    carregar();
  };

  const proximoNivelMin = meuResumo?.proximoMin ?? null;
  const proximoNivelLabel = proximoNivelMin
    ? NIVEIS.find((n) => n.min === proximoNivelMin)?.label
    : null;
  const progressoNivel =
    proximoNivelMin && meuResumo
      ? Math.min(100, Math.round((meuResumo.total / proximoNivelMin) * 100))
      : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gamificação</h1>
          <p className="text-sm text-muted-foreground">
            Engaje sua equipe com pontos, níveis, badges e desafios.
          </p>
        </div>
      </div>

      {meuResumo && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Meu Progresso
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Pontos totais</p>
              <p className="text-3xl font-bold text-primary">{meuResumo.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nível atual</p>
              <p className="text-3xl font-bold">{meuResumo.label}</p>
              <p className="text-xs text-muted-foreground">Nível {meuResumo.nivel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {proximoNivelMin
                  ? `Próximo: ${proximoNivelLabel} (${proximoNivelMin} pts)`
                  : "Nível máximo atingido!"}
              </p>
              <Progress value={progressoNivel} className="mt-2" />
              <p className="mt-1 text-xs text-muted-foreground">{progressoNivel}%</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="ranking" className="w-full">
        <TabsList>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="desafios">Desafios</TabsTrigger>
          <TabsTrigger value="historico">Meu Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking da Equipe</CardTitle>
              <CardDescription>Classificação por pontos acumulados.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum participante ainda.</p>
              ) : (
                <div className="space-y-2">
                  {ranking.map((r, idx) => (
                    <div
                      key={r.user_id}
                      className="flex items-center gap-4 rounded-lg border bg-card p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                        {idx + 1}
                      </div>
                      <Avatar>
                        <AvatarImage src={r.avatar_url ?? undefined} />
                        <AvatarFallback>{r.nome.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{r.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.cargo ?? "—"} · {r.nivel_label}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <UIBadge variant="outline" className="gap-1">
                          <Award className="h-3 w-3" /> {r.badges_count}
                        </UIBadge>
                        <span className="text-lg font-bold text-primary">{r.pontos_total} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Catálogo de Badges</CardTitle>
              <CardDescription>Conquistas que sua equipe pode desbloquear.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {badges.map((b) => (
                  <div key={b.id} className="flex gap-3 rounded-lg border bg-card p-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${b.cor}20`, color: b.cor }}
                    >
                      <IconByName name={b.icone} className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{b.nome}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{b.descricao}</p>
                      <p className="mt-1 text-xs font-semibold text-primary">+{b.pontos} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desafios" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Desafios</CardTitle>
                <CardDescription>Metas com prazo e recompensa.</CardDescription>
              </div>
              <Button onClick={() => setOpenDesafio(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Novo desafio
              </Button>
            </CardHeader>
            <CardContent>
              {desafios.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum desafio cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {desafios.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                      <Target className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{d.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          Meta: {d.meta} · Recompensa: {d.recompensa_pontos} pts ·{" "}
                          {d.ativo ? (
                            <span className="text-primary">Ativo</span>
                          ) : (
                            <span>Pausado</span>
                          )}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => toggleDesafio(d)}>
                        {d.ativo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removerDesafio(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Meu Histórico</CardTitle>
              <CardDescription>Suas últimas pontuações e badges.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold">Badges conquistadas</p>
                {meuResumo?.badges?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {meuResumo.badges.map((c: any) => (
                      <UIBadge key={c.badge?.id} variant="outline" className="gap-1">
                        <IconByName name={c.badge?.icone ?? "Award"} className="h-3 w-3" />
                        {c.badge?.nome}
                      </UIBadge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma badge ainda.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Pontuações recentes</p>
                {meuResumo?.historico?.length ? (
                  <div className="space-y-1">
                    {meuResumo.historico.map((h: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{h.motivo}</span>
                        <span className="font-semibold text-primary">+{h.pontos}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem pontuações ainda.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DesafioFormDialog
        open={openDesafio}
        onOpenChange={setOpenDesafio}
        badges={badges}
        onSaved={carregar}
      />
    </div>
  );
}