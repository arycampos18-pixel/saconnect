import { PageShell } from "../components/PageShell";
import { Card, CardContent } from "@/components/ui/card";

export default function AnaliseRelatorios() {
  return (
    <PageShell title="Relatórios" description="Relatórios consolidados do módulo.">
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
        Relatórios a serem implementados.
      </CardContent></Card>
    </PageShell>
  );
}
