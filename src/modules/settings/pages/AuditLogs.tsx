import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useCompany } from "../contexts/CompanyContext";
import { settingsService } from "../services/settingsService";

export default function AuditLogs() {
  const { currentCompany, isSuperAdmin } = useCompany();
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["settings_audit_logs", currentCompany?.id, isSuperAdmin],
    queryFn: () => settingsService.listarLogs(isSuperAdmin ? null : currentCompany?.id, 500),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Logs de auditoria</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum log registrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                  <TableCell className="text-xs">{l.entity_type ?? "—"}{l.entity_id ? ` · ${l.entity_id.slice(0, 8)}` : ""}</TableCell>
                  <TableCell className="max-w-[400px] truncate text-xs text-muted-foreground">{l.details ? JSON.stringify(l.details) : "—"}</TableCell>
                  <TableCell className="text-xs">{l.ip_address ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}