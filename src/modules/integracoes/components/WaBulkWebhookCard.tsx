import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wa-bulk-webhook`;
const DEFAULT_TOKEN = "saconnect";

export function WaBulkWebhookCard() {
  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v);
    toast.success(`${label} copiado`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Disparos API OFICIAL — Webhook da Meta
          <Badge variant="outline" className="ml-2">Conexão manual</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Configure o webhook no painel do <strong>Meta for Developers</strong> para receber em
          tempo real os status de entrega/leitura/falha e o opt-out automático por palavra-chave.
        </p>

        <div className="space-y-2">
          <Label>1. Callback URL</Label>
          <div className="flex gap-2">
            <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => copy(WEBHOOK_URL, "URL")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>2. Verify Token</Label>
          <div className="flex gap-2">
            <Input readOnly value={DEFAULT_TOKEN} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => copy(DEFAULT_TOKEN, "Token")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use exatamente este valor no campo <em>Verify Token</em> da Meta. Para usar um token
            personalizado, configure o secret <code>WA_BULK_WEBHOOK_VERIFY_TOKEN</code> no backend.
          </p>
        </div>

        <div className="space-y-2">
          <Label>3. Campos a inscrever (Webhook fields)</Label>
          <div className="flex flex-wrap gap-2">
            <Badge>messages</Badge>
            <Badge>message_status</Badge>
          </div>
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
          <p className="font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Passo a passo
          </p>
          <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
            <li>Acesse <strong>developers.facebook.com</strong> → seu App → WhatsApp → Configuration</li>
            <li>Em <em>Webhook</em>, clique em <strong>Edit</strong></li>
            <li>Cole a <strong>Callback URL</strong> e o <strong>Verify Token</strong> acima</li>
            <li>Clique em <strong>Verify and Save</strong></li>
            <li>Em <em>Webhook fields</em>, ative <code>messages</code> e <code>message_status</code></li>
            <li>Pronto! As atualizações aparecerão na Fila e nos Relatórios em tempo real.</li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1 h-3 w-3" /> Abrir Meta for Developers
            </Button>
          </a>
          <a href="/app/whatsapp-bulk/configuracoes">
            <Button variant="outline" size="sm">Ir para Configurações</Button>
          </a>
          <a href="/app/whatsapp-bulk/optout">
            <Button variant="outline" size="sm">Ver lista de opt-out</Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
