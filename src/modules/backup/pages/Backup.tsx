import { useState } from "react";
import { Database, Download, Loader2, Calendar, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";

export default function Backup() {
  const { isAdmin } = useUserRole();
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-export`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!resp.ok) throw new Error(`Falha ao gerar backup (${resp.status})`);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Backup gerado e baixado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBaixando(false);
    }
  }

  if (!isAdmin) {
    return <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
      Apenas administradores podem fazer backup do sistema.
    </div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Database className="h-7 w-7 text-primary" /> Backup & Restauração
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Exporte todos os dados do sistema em um arquivo ZIP com CSVs.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Backup manual</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gera um arquivo ZIP contendo um CSV para cada tabela (eleitores, eventos, pesquisas, mensagens, automações etc.) e um arquivo de metadados.
          </p>
          <Button onClick={baixar} disabled={baixando}>
            {baixando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Gerar e baixar backup agora
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4" /> Backup automático diário</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Um backup é executado automaticamente todo dia às 03h (Brasília). Os arquivos ficam disponíveis para auditoria interna por 30 dias.</p>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Para restaurar a partir de um backup, baixe o ZIP e abra um chamado com o suporte. A restauração é manual para evitar sobrescrever dados por engano.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}