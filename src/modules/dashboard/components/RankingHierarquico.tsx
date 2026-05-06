import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Trophy, Medal, Award } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RankingLiderancaItem } from "@/modules/dashboard/services/rankingService";
import { cn } from "@/lib/utils";

function PosicaoBadge({ pos }: { pos: number }) {
  if (pos === 1) return <Trophy className="h-4 w-4 text-primary" />;
  if (pos === 2) return <Medal className="h-4 w-4 text-muted-foreground" />;
  if (pos === 3) return <Award className="h-4 w-4 text-muted-foreground" />;
  return <span className="text-sm font-semibold text-muted-foreground">#{pos}</span>;
}

export function RankingHierarquico({ ranking }: { ranking: RankingLiderancaItem[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="rounded-xl border border-border/80 bg-card shadow-elegant-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">Ranking de Cadastros por Hierarquia</h2>
        <p className="text-sm text-muted-foreground">Clique em uma liderança para ver seus cabos eleitorais</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead>Liderança</TableHead>
              <TableHead className="text-center">Cadastros</TableHead>
              <TableHead className="hidden md:table-cell text-center">Cabos</TableHead>
              <TableHead className="hidden lg:table-cell">Meta</TableHead>
              <TableHead className="text-center">Posição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma liderança ativa.
                </TableCell>
              </TableRow>
            )}
            {ranking.map((l) => {
              const pct = Math.min(100, Math.round((l.total / Math.max(1, l.meta)) * 100));
              const isOpen = expanded[l.id];
              return (
                <Fragment key={l.id}>
                  <TableRow className="cursor-pointer border-border hover:bg-secondary/70" onClick={() => toggle(l.id)}>
                    <TableCell>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{l.nome}</TableCell>
                    <TableCell className="text-center font-semibold">{l.total}</TableCell>
                    <TableCell className="hidden md:table-cell text-center text-muted-foreground">{l.cabos.length}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 text-right text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center"><PosicaoBadge pos={l.posicao} /></div>
                    </TableCell>
                  </TableRow>
                  {isOpen && l.cabos.map((c) => {
                    const cpct = Math.min(100, Math.round((c.cadastros / Math.max(1, c.meta)) * 100));
                    return (
                       <TableRow key={c.id} className={cn("border-border bg-secondary/60 hover:bg-secondary/80")}>
                        <TableCell></TableCell>
                        <TableCell className="pl-8 text-sm text-muted-foreground">↳ {c.nome}</TableCell>
                        <TableCell className="text-center text-sm">{c.cadastros}</TableCell>
                        <TableCell className="hidden md:table-cell text-center text-sm text-muted-foreground">—</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-primary/70" style={{ width: `${cpct}%` }} />
                            </div>
                            <span className="w-12 text-right text-xs text-muted-foreground">{cpct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">Meta {c.meta}</TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
