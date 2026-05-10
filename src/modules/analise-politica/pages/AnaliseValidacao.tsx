import { PageShell } from "../components/PageShell";
import { Card, CardContent } from "@/components/ui/card";

export default function AnaliseValidacao() {
  return (
    <PageShell title="Validação Eleitoral" description="Valide dados eleitorais via API ou regras internas.">
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
        Fluxo de validação será implementado nos próximos prompts.
      </CardContent></Card>
    </PageShell>
  );
}
