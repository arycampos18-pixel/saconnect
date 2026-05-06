import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

/** Logs e monitoramento do WhatsApp — página isolada (fonte futura: tabela `whatsapp_*_logs` ou observabilidade). */
export default function WALogs() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" /> Logs
          </CardTitle>
          <CardDescription>Eventos de envio, erros de provider e webhooks — visão por empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Estrutura pronta para listagem paginada. Hoje os detalhes técnicos também podem ser consultados nos logs das
            Edge Functions do Supabase e na fila de mensagens.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
