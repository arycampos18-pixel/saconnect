import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantGate } from "../hooks/useTenantGate";
import { waService } from "../services/waService";

export default function WAContacts() {
  const { companyId } = useTenantGate();
  const { data, isLoading } = useQuery({
    queryKey: ["wa", "contacts", companyId],
    queryFn: () => waService.listContacts(companyId!),
    enabled: !!companyId,
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Contatos</CardTitle></CardHeader>
      <CardContent>
        {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
        {data?.length === 0 && <div className="text-sm text-muted-foreground">Nenhum contato ainda.</div>}
        <ul className="divide-y">
          {data?.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{c.name ?? "Sem nome"}</div>
                <div className="text-xs text-muted-foreground">{c.phone}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
