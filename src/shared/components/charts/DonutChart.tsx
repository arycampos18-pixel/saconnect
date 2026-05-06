interface DonutDatum {
  label: string;
  value: number;
}

/** Gradientes modernos (roxo + acentos). */
const PALETTE: Array<{ from: string; to: string; solid: string }> = [
  { from: "hsl(263 75% 62%)", to: "hsl(280 75% 70%)", solid: "hsl(263 75% 62%)" },
  { from: "hsl(220 75% 60%)", to: "hsl(245 75% 65%)", solid: "hsl(230 75% 62%)" },
  { from: "hsl(295 65% 60%)", to: "hsl(320 65% 65%)", solid: "hsl(305 65% 62%)" },
  { from: "hsl(160 65% 45%)", to: "hsl(175 65% 50%)", solid: "hsl(165 65% 47%)" },
  { from: "hsl(38 90% 55%)",  to: "hsl(20 90% 60%)",  solid: "hsl(28 90% 57%)" },
  { from: "hsl(345 75% 60%)", to: "hsl(15 75% 62%)",  solid: "hsl(355 75% 60%)" },
];

/**
 * "Distribution card" moderno: total em destaque + barras de progresso
 * com gradiente. Mais legível que um donut em datasets pequenos.
 */
export function DonutChart({
  data,
  height,
  onSelect,
}: {
  data: DonutDatum[];
  height?: number;
  onSelect?: (label: string) => void;
}) {
  void height;
  const total = data.reduce((s, d) => s + d.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const topPct = total && top ? Math.round((top.value / total) * 100) : 0;

  return (
    <div className="space-y-5 px-1 sm:px-2">
      {/* Hero: total + destaque do líder */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">Total de cadastros</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
              {total.toLocaleString("pt-BR")}
            </p>
          </div>
          {top && (
            <div className="rounded-xl border border-primary/15 bg-card/70 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Principal origem</p>
              <p className="mt-0.5 truncate text-sm font-bold text-foreground">{top.label}</p>
              <p className="text-[11px] font-semibold text-primary">{topPct}% do total</p>
            </div>
          )}
        </div>
      </div>

      {/* Lista com barras de progresso */}
      <ul className="space-y-3">
        {sorted.map((d, i) => {
          const pct = total ? (d.value / total) * 100 : 0;
          const c = PALETTE[i % PALETTE.length];
          const interactive = !!onSelect;
          return (
            <li key={d.label}>
              <button
                type="button"
                onClick={interactive ? () => onSelect!(d.label) : undefined}
                disabled={!interactive}
                className="group block w-full rounded-xl border border-border/60 bg-card p-3 text-left transition-all hover:border-primary/30 hover:shadow-sm disabled:cursor-default disabled:hover:border-border/60 disabled:hover:shadow-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-md shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                    />
                    <span className="truncate text-sm font-semibold text-foreground">{d.label}</span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-2">
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {d.value.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: c.solid }}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(2, pct)}%`,
                      background: `linear-gradient(90deg, ${c.from}, ${c.to})`,
                    }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}