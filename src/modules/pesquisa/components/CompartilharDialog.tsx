import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Check, Download, MessageCircle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Pesquisa } from "../services/pesquisaService";
import { encurtarUrl } from "@/shared/utils/urlShortener";

export function CompartilharDialog({
  pesquisa, open, onOpenChange,
}: { pesquisa: Pesquisa | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!pesquisa) return null;

  // Usa o short_code se disponível (7 chars), senão usa o slug completo
  const code = (pesquisa as any).short_code ?? pesquisa.slug;
  const url = code ? `${window.location.origin}/p/${code}` : null;

  const copy = async () => {
    if (!url) return;
    try {
      // Tenta clipboard API (requer HTTPS)
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback para HTTP ou browsers sem permissão
      const el = document.createElement("textarea");
      el.value = url;
      el.style.cssText = "position:fixed;top:-9999px";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2500);
  };

  const compartilharWhats = async () => {
    if (!url) return;
    setSharing(true);
    try {
      const curto = await encurtarUrl(url);
      const msg = encodeURIComponent(
        `Olá! Responda nossa pesquisa clicando no link:\n${curto}`
      );
      window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener");
    } finally {
      setSharing(false);
    }
  };

  const baixarQR = () => {
    const canvas = qrRef.current?.querySelector<HTMLCanvasElement>("canvas");
    if (!canvas) { toast.error("QR Code ainda não carregou"); return; }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qrcode-${pesquisa.slug ?? "pesquisa"}.png`;
    a.click();
    toast.success("QR Code baixado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar pesquisa</DialogTitle>
          <DialogDescription>
            Compartilhe este link ou QR Code para coletar respostas.
          </DialogDescription>
        </DialogHeader>

        {!url ? (
          <p className="text-sm text-destructive py-4 text-center">
            Esta pesquisa não possui um link público gerado. Salve a pesquisa novamente.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">

            {/* QR Code */}
            <div
              ref={qrRef}
              className="rounded-xl border-2 border-border bg-white p-4 shadow-sm"
            >
              <QRCodeCanvas
                value={url}
                size={200}
                fgColor="#1E3A8A"
                bgColor="#FFFFFF"
                includeMargin
                level="M"
              />
            </div>

            {/* Link clicável — clica e abre direto */}
            <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 break-all"
              >
                {url}
              </a>
              <button
                onClick={copy}
                title="Copiar link"
                className={`shrink-0 rounded-md p-1.5 transition-colors ${
                  copied
                    ? "bg-emerald-100 text-emerald-700"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Ações */}
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={baixarQR}
              >
                <Download className="h-4 w-4 mr-1.5" /> Baixar QR
              </Button>
            </div>

            {/* WhatsApp com link encurtado */}
            <Button
              className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white"
              size="sm"
              onClick={compartilharWhats}
              disabled={sharing}
            >
              {sharing
                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                : <MessageCircle className="h-4 w-4 mr-1.5" />}
              {sharing ? "Encurtando link…" : "Compartilhar via WhatsApp"}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              A pesquisa precisa estar <strong>Ativa</strong> para aceitar respostas.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
