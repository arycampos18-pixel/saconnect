import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { predicaoService, type AnalisePreditiva } from "../services/predicaoService";

const PIE_COLORS = ["#1E3A8A", "#2563EB", "#60A5FA", "#94A3B8"];

function whatsAppLink(telefone: string | null, nome: string) {
  const tel = (telefone ?? "").replace(/\D/g, "");
  if (!tel) return null;
  const num = tel.startsWith("55") ? tel : `55${tel}`;
  const txt = encodeURIComponent(
    `Olá, ${nome.split(" ")[0]}! Seguimos à disposição e gostaríamos de saber como podemos te apoiar.`,
  );
  return `https://wa.me/${num}?text=${txt}`;
}

export default function Predicao() {
  const [data, setData] = useState<AnalisePreditiva | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      const r = await predicaoService.carregar();
      setData(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar análise.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const dist = data?.distribuicao;
  const distData = dist
    ? [
        { name: "Muito Provável", value: dist.muitoProvavel },
        { name: "Provável", value: dist.provavel },
        { name: "Indeciso", value: dist.indeciso },
        { name: "Improvável", value: dist.improvavel },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <TrendingUp className="h-7 w-7 text-primary" /> Análise Preditiva
            <Badge className="ml-1 gap-1 bg-sky-500 text-white hover:bg-sky-500">
              <Sparkles className="h-3.5 w-3.5" /> IA
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Propensão de voto, eleitores em risco, influenciadores e oportunidades — com insights gerados por IA.
          </p>
        </div>
        <Button onClick={carregar} disabled={loading} variant="outline" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar análise
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calculando análise preditiva...
        </div>
      ) : data ? (
        <>
          {data.insights.length > 0 && (
            <Card className="border-sky-200 bg-sky-50/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-sky-500" /> Insights da IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-foreground">
                  {data.insights.map((i, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-sky-500">•</span>
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Propensão */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Propensão de Voto</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Distribuição entre {data.totalEleitores} eleitores
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {distData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {distData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: PIE_COLORS[i] }}
                      />
                      <span className="text-muted-foreground">{d.name}:</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Oportunidades */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Oportunidades por Bairro</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Bairros com maior potencial de crescimento
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.oportunidades}>
                      <XAxis dataKey="bairro" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="potencial" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Em Risco */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-sky-500" /> Eleitores em Risco
                </CardTitle>
                <p className="text-xs text-muted-foreground">Top 10 com maior risco de não votar</p>
              </CardHeader>
              <CardContent>
                {data.emRisco.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum eleitor em risco identificado.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.emRisco.map((e) => {
                      const link = whatsAppLink(e.telefone, e.nome);
                      return (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{e.nome}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {e.bairro ?? "—"} · {e.diasSemInteracao}d sem interação
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Progress value={e.risco} className="h-1.5" />
                              <span className="w-10 text-right text-xs font-semibold text-foreground">
                                {e.risco}%
                              </span>
                            </div>
                          </div>
                          {link && (
                            <Button asChild size="sm" className="gap-1">
                              <a href={link} target="_blank" rel="noreferrer">
                                <MessageCircle className="h-4 w-4" /> WhatsApp
                              </a>
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Influenciadores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-sky-500" /> Influenciadores Detectados
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Eleitores com maior engajamento e participação
                </p>
              </CardHeader>
              <CardContent>
                {data.influenciadores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem influenciadores detectados ainda. Realize eventos e pesquisas para começar.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {data.influenciadores.map((e) => {
                      const link = whatsAppLink(e.telefone, e.nome);
                      return (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{e.nome}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {e.bairro ?? "—"} · {e.eventosPresentes} eventos · {e.respostasTotal} pesquisas
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Progress value={e.influencia * 10} className="h-1.5" />
                              <span className="w-10 text-right text-xs font-semibold text-foreground">
                                {e.influencia.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          {link && (
                            <Button asChild size="sm" variant="outline" className="gap-1">
                              <a href={link} target="_blank" rel="noreferrer">
                                <MessageCircle className="h-4 w-4" /> Conectar
                              </a>
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-right text-[11px] text-muted-foreground">
            Análise gerada em {new Date(data.geradoEm).toLocaleString("pt-BR")}
          </p>
        </>
      ) : null}
    </div>
  );
}