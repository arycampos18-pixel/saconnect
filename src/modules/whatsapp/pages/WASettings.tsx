import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function WASettings() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Configurações WhatsApp</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">Configurações por empresa — janela de envio, opt-out, webhooks…</CardContent>
    </Card>
  );
}
