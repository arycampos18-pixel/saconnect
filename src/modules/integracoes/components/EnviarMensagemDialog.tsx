import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { integracoesService } from "../services/integracoesService";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EnviarMensagemDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"whatsapp" | "sms">("whatsapp");
  const [to, setTo] = useState("");
  const [nome, setNome] = useState("");
  const [conteudo, setConteudo] = useState("");

  const reset = () => {
    setTo("");
    setNome("");
    setConteudo("");
  };

  const wapp = useMutation({
    mutationFn: () => integracoesService.enviarWhatsApp({ to, message: conteudo, nome }),
    onSuccess: () => {
      toast.success("WhatsApp enviado!");
      qc.invalidateQueries({ queryKey: ["integracoes"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(`Falha: ${e.message}`),
  });

  const sms = useMutation({
    mutationFn: () =>
      integracoesService.registrarSMSSimulado({ destinatario: to, nome, conteudo }),
    onSuccess: () => {
      toast.success("SMS registrado (simulado)");
      qc.invalidateQueries({ queryKey: ["integracoes"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(`Falha: ${e.message}`),
  });

  const enviar = () => {
    if (!to || !conteudo) {
      toast.error("Preencha destinatário e mensagem");
      return;
    }
    if (tab === "whatsapp") wapp.mutate();
    else sms.mutate();
  };

  const loading = wapp.isPending || sms.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova mensagem externa</DialogTitle>
          <DialogDescription>
            WhatsApp envia via Z-API (número conectado por QR Code). SMS é registrado em modo simulação.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "whatsapp" | "sms")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="sms">SMS (simulado)</TabsTrigger>
          </TabsList>
          <TabsContent value="whatsapp" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              A mensagem será enviada pelo número conectado na sua instância Z-API.
              Informe o destinatário no formato internacional (ex: <code>5511999999999</code>).
            </p>
          </TabsContent>
          <TabsContent value="sms" className="pt-4">
            <p className="text-sm text-muted-foreground">
              Esta mensagem será apenas registrada no histórico (sem envio real).
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Destinatário *</Label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+5511999999999" />
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="opcional" />
            </div>
          </div>
          <div>
            <Label>Mensagem *</Label>
            <Textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={4}
              placeholder="Conteúdo da mensagem..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={loading}>
            {loading ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}