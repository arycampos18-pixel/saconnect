import { TrendingUp, Target, Users, Activity, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, LineChart,
} from "recharts";

const kpis = [
  { label: "Meta de eleitores", value: "12.480", goal: "20.000", pct: 62, icon: Target, trend: "+8,2% vs. mês anterior" },
  { label: "Engajamento médio", value: "47,3%", goal: "60%", pct: 78, icon: Activity, trend: "+3,1 p.p." },
  { label: "Conversões", value: "3.214", goal: "5.000", pct: 64, icon: CheckCircle2, trend: "+12,4%" },
  { label: "Lideranças ativas", value: "184", goal: "250", pct: 73, icon: Users, trend: "+6 esta semana" },
];

const evolucao = [
  { mes: "Jan", cadastros: 820, conversoes: 210 },
  { mes: "Fev", cadastros: 1180, conversoes: 340 },
  { mes: "Mar", cadastros: 1640, conversoes: 520 },
  { mes: "Abr", cadastros: 2010, conversoes: 690 },
  { mes: "Mai", cadastros: 2580, conversoes: 880 },
  { mes: "Jun", cadastros: 3120, conversoes: 1120 },
  { mes: "Jul", cadastros: 3760, conversoes: 1380 },
];

export default function CampanhaEstrategico() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanha Estratégico</h1>
          <p className="text-sm text-muted-foreground">
            Indicadores-chave de desempenho da sua campanha.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {k.label}
                  </CardTitle>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{k.value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={k.pct} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Meta: {k.goal}</span>
                  <span className="text-success">{k.trend}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução de cadastros e conversões</CardTitle>
          <p className="text-xs text-muted-foreground">Últimos 7 meses</p>
        </CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={evolucao} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={36} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="cadastros" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradCad)" />
              <Area type="monotone" dataKey="conversoes" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#gradConv)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}