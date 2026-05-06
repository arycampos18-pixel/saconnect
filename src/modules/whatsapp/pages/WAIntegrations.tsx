import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plug, Webhook } from "lucide-react";

/**
 * Integrações do módulo WhatsApp — página isolada.
 * Webhooks globais permanecem em `/app/webhooks`; aqui só entram atalhos e futuras integrações específicas de WA.
 */
export default function WAIntegrations() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plug className="h-5 w-5" /> Integrações
          </CardTitle>
          <CardDescription>Conexões externas relacionadas ao canal WhatsApp desta empresa.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/app/webhooks">
              <Webhook className="mr-2 h-4 w-4" />
              Webhooks (sistema)
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/app/whatsapp/settings">Configurações do módulo</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
