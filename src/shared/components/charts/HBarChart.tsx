import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface HBarDatum {
  label: string;
  value: number;
}

/**
 * Barras horizontais leves (recharts) com gradiente roxo, altura proporcional
 * (~32px por linha, mín 220, máx 420) e cantos arredondados.
 */
export function HBarChart({
  data,
  onSelect,
}: {
  data: HBarDatum[];
  onSelect?: (label: string) => void;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const height = Math.min(380, Math.max(220, sorted.length * 46 + 16));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 44, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="hbarGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
          </linearGradient>
        </defs>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          stroke="hsl(var(--foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={140}
          tick={{ fontWeight: 500 }}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
          contentStyle={{
            background: "hsl(var(--card) / 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid hsl(var(--border))",
            borderRadius: "12px",
            fontSize: "12px",
            padding: "8px 12px",
            boxShadow: "0 12px 32px -12px hsl(var(--primary) / 0.25)",
          }}
          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 2 }}
          formatter={(v: number) => [v.toLocaleString("pt-BR"), "Cadastros"]}
        />
        <Bar
          dataKey="value"
          fill="url(#hbarGrad)"
          radius={[8, 999, 999, 8]}
          barSize={16}
          onClick={onSelect ? (d: any) => onSelect(d?.label) : undefined}
          style={{ cursor: onSelect ? "pointer" : undefined }}
        >
          <LabelList
            dataKey="value"
            position="right"
            offset={10}
            style={{ fill: "hsl(var(--primary))", fontSize: 12, fontWeight: 700 }}
            formatter={(v: number) => v.toLocaleString("pt-BR")}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}