import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ListFilter, MessageSquare } from "lucide-react";

/** Listagem de conversas — página isolada (evolui para dados + filtros sem fundir com o chat). */
export default function WAConversations() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListFilter className="h-5 w-5" /> Conversas
          </CardTitle>
          <CardDescription>
            Visão de lista (abertas, fechadas, por fila/agente). O painel de atendimento em tempo real fica em{" "}
            <strong>Chat</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Placeholder estrutural: conecte aqui o serviço de conversas (apenas API deste módulo).
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/whatsapp/chat">
              <MessageSquare className="mr-2 h-4 w-4" />
              Ir para o chat
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
