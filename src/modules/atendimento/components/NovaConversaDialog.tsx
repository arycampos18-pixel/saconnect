import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { atendimentoService } from "../services/atendimentoService";

export function NovaConversaDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (conversaId: string) => void;
}) {
  const qc = useQueryClient();
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");

  const m = useMutation({
    mutationFn: () => atendimentoService.iniciarConversaManual({ telefone, nome: nome.trim() || null }),
    onSuccess: (id) => {
      toast.success("Conversa iniciada");
      qc.invalidateQueries({ queryKey: ["conversas"] });
      qc.invalidateQueries({ queryKey: ["conversas-contadores"] });
      setTelefone("");
      setNome("");
      onOpenChange(false);
      onCreated?.(id);
    },
    onError: (e: any) => toast.error("Não foi possível iniciar", { description: e?.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquarePlus className="h-5 w-5" />
          </div>
          <DialogTitle>Iniciar conversa manual</DialogTitle>
          <DialogDescription>
            Crie uma nova conversa de WhatsApp informando o número do contato.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="nc-tel">Telefone *</Label>
            <Input
              id="nc-tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(62) 99999-9999"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">DDD + número. Ex.: 62999999999</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-nome">Nome do contato (opcional)</Label>
            <Input id="nc-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria Silva" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={m.isPending}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !telefone.trim()}>
            {m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquarePlus className="mr-2 h-4 w-4" />}
            Iniciar conversa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}