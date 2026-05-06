import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { metaService } from "@/modules/whatsapp-meta/services/whatsappMetaService";
import { Activity, MessageCircle, TrendingUp, Users } from "lucide-react";

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default function MetaDashboard() {
  const { data: campaigns = [] } = useQuery({ queryKey: ["meta-campaigns"], queryFn: () => metaService.listCampaigns() });
  const { data: leads = [] } = useQuery({ queryKey: ["meta-leads"], queryFn: () => metaService.listLeads() });

  const active = campaigns.filter((c) => c.status === "running").length;
  const sent = campaigns.reduce((a, c) => a + c.sent_count, 0);
  const delivered = campaigns.reduce((a, c) => a + c.delivered_count, 0);
  const rate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Activity} label="Campanhas ativas" value={active} />
        <Kpi icon={MessageCircle} label="Mensagens enviadas" value={sent} />
        <Kpi icon={TrendingUp} label="Taxa de entrega" value={`${rate}%`} />
        <Kpi icon={Users} label="Leads capturados" value={leads.length} />
      </div>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Últimas campanhas</h3>
        <div className="space-y-2">
          {campaigns.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground">{c.sent_count}/{c.total_contacts} enviados · {c.status}</span>
            </div>
          ))}
          {campaigns.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma campanha ainda.</p>}
        </div>
      </Card>
    </div>
  );
}