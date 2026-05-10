import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { analiseService } from "../services/analiseService";

interface Props {
  eleitorId: string;
  eleitorNome?: string;
  telefone?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Se true, envia o código automaticamente ao abrir. */
  autoEnviar?: boolean;
}

export function WhatsAppValidacaoDialog({
  eleitorId, eleitorNome, telefone, open, onOpenChange, autoEnviar,
}: Props) {
  const [codigo, setCodigo] = useState("");
  const [expiraEm, setExpiraEm] = useState<string | null>(null);
  const [restanteSeg, setRestanteSeg] = useState(0);
  const qc = useQueryClient();

  const enviar = useMutation({
    mutationFn: () => analiseService.whatsappEnviarCodigo(eleitorId),
    onSuccess: (d) => {
      setExpiraEm(d.expira_em);
      setCodigo("");
      toast.success("Código enviado por WhatsApp");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao enviar código"),
  });

  const validar = useMutation({
    mutationFn: () => analiseService.whatsappValidarCodigo(eleitorId, codigo),
    onSuccess: () => {
      toast.success("WhatsApp validado com sucesso");
      qc.invalidateQueries({ queryKey: ["analise-eleitores"] });
      qc.invalidateQueries({ queryKey: ["analise-metricas"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Código inválido"),
  });

  useEffect(() => {
    if (open && autoEnviar && !enviar.isPending && !expiraEm) {
      enviar.mutate();
    }
    if (!open) {
      setCodigo(""); setExpiraEm(null); setRestanteSeg(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!expiraEm) return;
    const tick = () => {
      const ms = new Date(expiraEm).getTime() - Date.now();
      setRestanteSeg(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [expiraEm]);

  const mm = String(Math.floor(restanteSeg / 60)).padStart(2, "0");
  const ss = String(restanteSeg % 60).padStart(2, "0");
  const expirado = expiraEm !== null && restanteSeg === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Validação por WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Vamos enviar um código de 6 dígitos para
            {eleitorNome ? <> <strong>{eleitorNome}</strong></> : null}
            {telefone ? <> no número <strong>{telefone}</strong></> : null}.
          </p>

          {!expiraEm && (
            <Button onClick={() => enviar.mutate()} disabled={enviar.isPending} className="w-full">
              {enviar.isPending ? "Enviando…" : "Enviar código por WhatsApp"}
            </Button>
          )}

          {expiraEm && (
            <>
              <div className="space-y-1">
                <Label htmlFor="codigo-wpp">Código recebido</Label>
                <Input
                  id="codigo-wpp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-lg tracking-[0.4em] font-mono"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={expirado ? "text-destructive" : "text-muted-foreground"}>
                  {expirado ? "Código expirado" : `Expira em ${mm}:${ss}`}
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => enviar.mutate()}
                  disabled={enviar.isPending}
                >
                  Reenviar código
                </Button>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Você tem até 3 tentativas. Sem validação, o cadastro permanece salvo
            como <strong>não validado</strong>.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Validar depois
          </Button>
          <Button
            onClick={() => validar.mutate()}
            disabled={validar.isPending || codigo.length !== 6 || expirado || !expiraEm}
          >
            {validar.isPending ? "Validando…" : (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Validar
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}