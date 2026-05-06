import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Inbox, Clock, CheckCircle2, MessageCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { atendimentoService } from "../services/atendimentoService";

export default function AtendimentoDashboard() {
  const { data: todas = [] } = useQuery({
    queryKey: ["conversas-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversas")
        .select("id,status,departamento_id,atendente_id,created_at,ultima_mensagem_em")
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: deptos = [] } = useQuery({
    queryKey: ["departamentos-ativos"],
    queryFn: () => atendimentoService.listarDepartamentos(),
  });
  const { data: atendentes = [] } = useQuery({
    queryKey: ["atendentes"],
    queryFn: () => atendimentoService.listarAtendentes(),
  });

  const stats = useMemo(() => {
    const pend = todas.filter((c: any) => c.status === "Pendente").length;
    const emAt = todas.filter((c: any) => c.status === "Em atendimento").length;
    const fin = todas.filter((c: any) => c.status === "Atendido").length;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const novasHoje = todas.filter((c: any) => new Date(c.created_at) >= hoje).length;
    return { pend, emAt, fin, total: todas.length, novasHoje };
  }, [todas]);

  const porDepto = useMemo(() => {
    const map = new Map<string, number>();
    todas.forEach((c: any) => {
      const k = c.departamento_id ?? "sem";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([k, v]) => ({
      nome: k === "sem" ? "Sem departamento" : (deptos.find((d) => d.id === k)?.nome ?? "Outro"),
      total: v,
      cor: k === "sem" ? "#94a3b8" : (deptos.find((d) => d.id === k)?.cor ?? "#2563EB"),
    })).sort((a, b) => b.total - a.total);
  }, [todas, deptos]);

  const porAtendente = useMemo(() => {
    const map = new Map<string, number>();
    todas.filter((c: any) => c.atendente_id).forEach((c: any) => {
      map.set(c.atendente_id, (map.get(c.atendente_id) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([k, v]) => ({
      nome: (atendentes as any[]).find((a) => a.user_id === k)?.nome
        ?? (atendentes as any[]).find((a) => a.user_id === k)?.email
        ?? "—",
      total: v,
    })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [todas, atendentes]);

  const max = Math.max(1, ...porDepto.map((p) => p.total));
  const maxAt = Math.max(1, ...porAtendente.map((p) => p.total));

  return (
    <div className="container max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost">
          <Link to="/app/atendimento"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Atendimento</h1>
          <p className="text-sm text-muted-foreground">Visão geral das conversas WhatsApp</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KPI label="Pendentes" value={stats.pend} icon={Inbox} accent="text-amber-600" />
        <KPI label="Em atendimento" value={stats.emAt} icon={Clock} accent="text-blue-600" />
        <KPI label="Atendidos" value={stats.fin} icon={CheckCircle2} accent="text-green-600" />
        <KPI label="Total" value={stats.total} icon={MessageCircle} accent="text-foreground" />
        <KPI label="Novas hoje" value={stats.novasHoje} icon={Users} accent="text-primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Conversas por departamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {porDepto.length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
            {porDepto.map((p) => (
              <div key={p.nome} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{p.nome}</span><span className="font-medium">{p.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded"
                    style={{ width: `${(p.total / max) * 100}%`, backgroundColor: p.cor }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top atendentes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {porAtendente.length === 0 && <p className="text-sm text-muted-foreground">Sem atendentes ativos</p>}
            {porAtendente.map((p) => (
              <div key={p.nome} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{p.nome}</span><span className="font-medium">{p.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary"
                    style={{ width: `${(p.total / maxAt) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg bg-muted p-2 ${accent}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}