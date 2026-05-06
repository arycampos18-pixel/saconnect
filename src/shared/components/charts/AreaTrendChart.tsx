import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface TrendDatum {
  label: string;
  value: number;
}

/**
 * Área 2D suave com gradiente roxo do design system.
 * Leve (recharts), proporcional, sem efeitos pesados.
 */
export function AreaTrendChart({ data, height = 220 }: { data: TrendDatum[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaTrendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tick={{ opacity: 0.6 }}
          dy={4}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={28}
          tick={{ opacity: 0.6 }}
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4", strokeOpacity: 0.5 }}
          contentStyle={{
            background: "hsl(var(--card) / 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid hsl(var(--border))",
            borderRadius: "12px",
            fontSize: "12px",
            padding: "8px 12px",
            boxShadow: "0 12px 32px -12px hsl(var(--primary) / 0.25)",
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11, marginBottom: 2 }}
          formatter={(v: number) => [v.toLocaleString("pt-BR"), "Cadastros"]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#areaTrendGrad)"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}