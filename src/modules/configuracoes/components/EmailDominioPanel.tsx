import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";

export default function EmailDominioPanel() {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-none shadow-elegant-sm">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Mail className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Domínio de E-mail (Lovable Emails)</h2>
                <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary md:inline-flex">
                  <Sparkles className="h-3 w-3" /> Recomendado
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Configure um subdomínio próprio (ex.: <code>notify.seudominio.com.br</code>) para envio de
                e-mails transacionais e alertas (LGPD, divergências, picos de erros, relatórios).
                Sem necessidade de Resend, SendGrid ou contas externas.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Conectar domínio</CardTitle>
            <CardDescription>
              Abre o assistente da Lovable Cloud para registrar o subdomínio remetente e
              gerar os registros DNS (NS / SPF / DKIM).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/settings/cloud/emails" target="_blank" rel="noreferrer">
              <Button className="w-full gap-2">
                <Mail className="h-4 w-4" />
                Configurar domínio de e-mail
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              Você será direcionado para <strong>Cloud → Emails</strong>, onde poderá adicionar o domínio,
              acompanhar a verificação DNS e visualizar o histórico de envios.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. O que será enviado por aqui</CardTitle>
            <CardDescription>Canais que passam a usar o domínio configurado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="space-y-1 text-muted-foreground">
              <li>• Alertas de erros críticos e picos de falhas</li>
              <li>• Confirmações LGPD e respostas a solicitações</li>
              <li>• Relatórios e exportações concluídas</li>
              <li>• E-mails de autenticação (recuperação de senha, convite)</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Boas práticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Use um <strong>subdomínio dedicado</strong> (ex.: <code>notify.dominio.com</code>) para preservar a
            reputação do domínio principal.
          </p>
          <p>
            • A verificação DNS pode levar até <strong>72 horas</strong>. Enquanto isso, e-mails padrão continuam funcionando.
          </p>
          <p>
            • Após verificado, todos os módulos (Alertas, LGPD, Auditoria) passam a enviar
            automaticamente do seu domínio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}