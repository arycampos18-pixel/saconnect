import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Pesquisa } from "../services/pesquisaService";

export function CompartilharDialog({
  pesquisa, open, onOpenChange,
}: { pesquisa: Pesquisa | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  if (!pesquisa) return null;
  const url = `${window.location.origin}/p/${pesquisa.slug}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar pesquisa</DialogTitle>
          <DialogDescription>Compartilhe este link para coletar respostas.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-lg border bg-white p-4">
            <QRCodeSVG value={url} size={180} fgColor="#1E3A8A" />
          </div>
          <div className="flex w-full gap-2">
            <Input value={url} readOnly className="text-xs" />
            <Button size="icon" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
