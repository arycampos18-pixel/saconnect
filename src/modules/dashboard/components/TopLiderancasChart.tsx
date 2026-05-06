import type { RankingLiderancaItem } from "@/modules/dashboard/services/rankingService";
import { HBarChart } from "@/shared/components/charts/HBarChart";

export function TopLiderancasChart({ ranking }: { ranking: RankingLiderancaItem[] }) {
  const data = ranking
    .slice(0, 5)
    .map((l) => ({ label: l.nome.replace("Liderança ", ""), value: l.total }));

  return (
    <div className="card-interactive p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Top 5 Lideranças</h2>
          <p className="text-xs text-muted-foreground">Cadastros totais</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
          Ao vivo
        </span>
      </div>
      {data.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
          Sem cadastros ainda.
        </div>
      ) : (
        <HBarChart data={data} />
      )}
    </div>
  );
}
