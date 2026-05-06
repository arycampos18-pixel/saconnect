import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Smartphone, Users, ListTree } from "lucide-react";
import { useTenantGate } from "../hooks/useTenantGate";
import { waService } from "../services/waService";

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function WADashboard() {
  const { companyId } = useTenantGate();

  const sessions = useQuery({
    queryKey: ["wa", "sessions", companyId],
    queryFn: () => waService.listSessions(companyId!),
    enabled: !!companyId,
  });
  const conversations = useQuery({
    queryKey: ["wa", "conversations", companyId],
    queryFn: () => waService.listConversations(companyId!),
    enabled: !!companyId,
  });
  const contacts = useQuery({
    queryKey: ["wa", "contacts", companyId],
    queryFn: () => waService.listContacts(companyId!),
    enabled: !!companyId,
  });
  const queues = useQuery({
    queryKey: ["wa", "queues", companyId],
    queryFn: () => waService.listQueues(companyId!),
    enabled: !!companyId,
  });

  if (!companyId) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Selecione uma empresa para visualizar este módulo.</CardContent></Card>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Stat icon={Smartphone} label="Sessões" value={sessions.data?.length ?? 0} />
      <Stat icon={MessageSquare} label="Conversas" value={conversations.data?.length ?? 0} />
      <Stat icon={Users} label="Contatos" value={contacts.data?.length ?? 0} />
      <Stat icon={ListTree} label="Filas" value={queues.data?.length ?? 0} />
    </div>
  );
}
