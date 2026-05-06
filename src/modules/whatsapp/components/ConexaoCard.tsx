import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw, Power, CheckCircle2, Smartphone, AlertCircle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { whatsappService } from "../services/whatsappService";

export function ConexaoCard() {
  const qc = useQueryClient();

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["whatsapp", "status"],
    queryFn: () => whatsappService.status(),
    refetchInterval: (q) => {
      const d = q.state.data as { connected?: boolean } | undefined;
      return d?.connected ? 30_000 : 6_000;
    },
    refetchOnWindowFocus: true,
  });

  const disconnect = useMutation({
    mutationFn: () => whatsappService.disconnect(),
    onSuccess: () => {
      toast.success("WhatsApp desconectado");
      qc.invalidateQueries({ queryKey: ["whatsapp"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restart = useMutation({
    mutationFn: () => whatsappService.restart(),
    onSuccess: () => {
      toast.success("Instância reiniciada");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["whatsapp"] }), 1500);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (error) toast.error((error as Error).message);
  }, [error]);

  const connected = !!data?.connected;
  const qr = data?.qrImage;
  const credErr = data?.credentialsError;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          <CardTitle className="text-base">Instância Z-API</CardTitle>
          {connected ? (
            <Badge className="bg-green-100 text-green-800">Conectado</Badge>
          ) : (
            <Badge variant="outline" className="border-amber-400 text-amber-700">
              Desconectado
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const r = await refetch();
              if ((r.data as any)?.connected) toast.success("Conexão OK — WhatsApp conectado");
              else if ((r.data as any)?.credentialsError) toast.error("Credenciais Z-API inválidas");
              else toast.warning("Instância desconectada");
            }}
            disabled={isFetching}
          >
            <Wifi className="mr-2 h-4 w-4" /> Testar conexão
          </Button>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          {connected ? (
            <Button size="sm" variant="destructive" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              <Power className="mr-2 h-4 w-4" />
              Desconectar
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => restart.mutate()} disabled={restart.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reiniciar instância
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando status...
          </div>
        ) : credErr ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-amber-600" />
            <p className="font-medium">Credenciais Z-API inválidas</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Verifique <code>ZAPI_INSTANCE_ID</code> e <code>ZAPI_INSTANCE_TOKEN</code> nas
              configurações de backend. Você encontra os valores corretos no painel da Z-API em{" "}
              <strong>Painel da instância</strong>.
            </p>
          </div>
        ) : connected ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <p className="font-medium">WhatsApp conectado e pronto para enviar mensagens.</p>
            <p className="text-sm text-muted-foreground">
              Para trocar de número, clique em <strong>Desconectar</strong> e escaneie o novo QR Code.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center justify-center">
              {qr ? (
                <img
                  src={qr}
                  alt="QR Code WhatsApp Z-API"
                  className="h-64 w-64 rounded-lg border bg-white p-2"
                />
              ) : (
                <div className="flex h-64 w-64 flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                  Gerando QR Code...
                </div>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold">Como conectar</h3>
              <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                <li>Abra o WhatsApp no celular que será usado para enviar.</li>
                <li>
                  Vá em <strong>Configurações → Aparelhos conectados → Conectar um aparelho</strong>.
                </li>
                <li>Aponte a câmera para o QR Code ao lado.</li>
                <li>Aguarde a confirmação — o status aqui atualiza sozinho a cada poucos segundos.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Se o QR Code não aparecer, clique em <strong>Reiniciar instância</strong> e aguarde alguns segundos.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}