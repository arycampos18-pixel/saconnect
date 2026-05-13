import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Plus, UserPlus, Link2, QrCode, Copy, Check, MessageCircle, Download, Loader2, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCan } from "@/shared/auth/useCan";
import { supabase } from "@/integrations/supabase/client";

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function NovoEleitorMenu() {
  const navigate = useNavigate();
  const { can } = useCan();
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  const [linkOpen, setLinkOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const [tokenUrl, setTokenUrl] = useState<string>("");
  const [tokenQrUrl, setTokenQrUrl] = useState<string>("");
  const [genLink, setGenLink] = useState(false);
  const [genQr, setGenQr] = useState(false);

  if (!can("eleitores.create")) return null;

  async function gerarToken(tipo: "link" | "qrcode" | "whatsapp", telefone_destino?: string): Promise<string | null> {
    const { data, error } = await supabase.functions.invoke("auto-cadastro-token", { body: { tipo, telefone_destino } });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Falha ao gerar link");
      return null;
    }
    return `${window.location.origin}/cadastro-publico?token=${(data as any).token}`;
  }

  async function abrirLink() {
    setLinkOpen(true);
    if (!tokenUrl) {
      setGenLink(true);
      const u = await gerarToken("link");
      if (u) setTokenUrl(u);
      setGenLink(false);
    }
  }

  async function abrirQr() {
    setQrOpen(true);
    if (!tokenQrUrl) {
      setGenQr(true);
      const u = await gerarToken("qrcode");
      if (u) setTokenQrUrl(u);
      setGenQr(false);
    }
  }

  async function regerarLink() {
    setGenLink(true);
    const u = await gerarToken("link");
    if (u) { setTokenUrl(u); toast.success("Novo link gerado"); }
    setGenLink(false);
  }

  async function regerarQr() {
    setGenQr(true);
    const u = await gerarToken("qrcode");
    if (u) { setTokenQrUrl(u); toast.success("Novo QR Code gerado"); }
    setGenQr(false);
  }

  async function enviarWhats() {
    const tel = waPhone.replace(/\D/g, "");
    // aceita 10 (sem o 9) ou 11 dígitos
    if (tel.length < 10 || tel.length > 11) {
      toast.error("Informe DDD + número (10 ou 11 dígitos)");
      return;
    }
    setWaSending(true);
    try {
      const u = await gerarToken("whatsapp", tel);
      if (!u) return;
      const msg = `Olá! 👋\n\nClique no link abaixo para se cadastrar na nossa base:\n${u}`;
      const { data, error } = await supabase.functions.invoke("send-whatsapp-zapi", {
        body: { to: tel, message: msg },
      });
      if (error || (data as any)?.error) {
        // fallback: abrir wa.me direto
        const wa = `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
        window.open(wa, "_blank", "noopener");
        toast.message("Abrindo WhatsApp Web para envio manual");
      } else {
        toast.success("Link enviado por WhatsApp ✓");
      }
      setWaOpen(false);
      setWaPhone("");
    } finally {
      setWaSending(false);
    }
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(tokenUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback para browsers sem clipboard API
      const el = document.createElement("textarea");
      el.value = tokenUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const compartilharWhats = () => {
    if (!tokenUrl) return;
    const msg = encodeURIComponent(
      `Olá! Faça seu cadastro de eleitor pelo link abaixo:\n${tokenUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener");
  };

  const baixarQR = () => {
    const canvas = qrCanvasRef.current?.querySelector<HTMLCanvasElement>("canvas");
    if (!canvas) {
      toast.error("QR Code ainda não foi gerado");
      return;
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "qrcode-cadastro-eleitor.png";
    a.click();
    toast.success("QR Code baixado!");
  };

  const telDigits = waPhone.replace(/\D/g, "");
  const telValido = telDigits.length >= 10 && telDigits.length <= 11;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Novo Eleitor
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => navigate("/app/captacao")}>
            <UserPlus className="mr-2 h-4 w-4" /> Cadastro manual
          </DropdownMenuItem>
          <DropdownMenuItem onClick={abrirLink}>
            <Link2 className="mr-2 h-4 w-4" /> Compartilhar link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={abrirQr}>
            <QrCode className="mr-2 h-4 w-4" /> Gerar QR Code
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWaOpen(true)}>
            <MessageCircle className="mr-2 h-4 w-4" /> Enviar por WhatsApp
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog: link */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de cadastro público</DialogTitle>
            <DialogDescription>
              Compartilhe este link único — quem se cadastrar por ele será vinculado a você.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              value={genLink ? "Gerando…" : tokenUrl}
              readOnly
              className="text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant={copied ? "default" : "outline"}
              onClick={copiar}
              disabled={!tokenUrl || genLink}
              className={copied ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
            >
              {copied
                ? <><Check className="mr-1.5 h-4 w-4" /> Copiado!</>
                : <><Copy className="mr-1.5 h-4 w-4" /> Copiar</>}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">Válido por 30 dias · uso único</p>

          <DialogFooter className="sm:justify-between gap-2">
            <Button variant="outline" onClick={regerarLink} disabled={genLink}>
              {genLink
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <RefreshCw className="mr-1.5 h-4 w-4" />}
              Gerar novo
            </Button>
            <Button
              onClick={compartilharWhats}
              disabled={!tokenUrl || genLink}
              className="bg-[#25D366] text-white hover:bg-[#1ebe57]"
            >
              <MessageCircle className="mr-1.5 h-4 w-4" /> Enviar pelo WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: QR */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code do cadastro</DialogTitle>
            <DialogDescription>
              Imprima ou exiba este QR Code em eventos. Ao escanear, o eleitor abre o formulário.
            </DialogDescription>
          </DialogHeader>

          <div
            ref={qrCanvasRef}
            id="novo-eleitor-qrcode"
            className="flex justify-center rounded-lg border bg-white p-4"
          >
            {genQr || !tokenQrUrl ? (
              <div className="flex h-[220px] w-[220px] items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <QRCodeCanvas value={tokenQrUrl} size={220} includeMargin />
            )}
          </div>

          {tokenQrUrl && (
            <p className="break-all text-center text-xs text-muted-foreground">{tokenQrUrl}</p>
          )}
          <p className="text-center text-[11px] text-muted-foreground">Válido por 30 dias · uso único</p>

          <DialogFooter className="sm:justify-between gap-2">
            <Button variant="outline" onClick={regerarQr} disabled={genQr}>
              {genQr
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <RefreshCw className="mr-1.5 h-4 w-4" />}
              Gerar novo
            </Button>
            <Button onClick={baixarQR} disabled={!tokenQrUrl || genQr}>
              <Download className="mr-1.5 h-4 w-4" /> Baixar PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: enviar WhatsApp */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar link via WhatsApp</DialogTitle>
            <DialogDescription>
              Informe o número do eleitor. Ele receberá um link único de cadastro vinculado a você.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Telefone (com DDD)</Label>
            <Input
              placeholder="(67) 9 8765-4321"
              value={waPhone}
              onChange={(e) => setWaPhone(formatPhone(e.target.value))}
              inputMode="numeric"
              maxLength={16}
            />
            {waPhone && !telValido && (
              <p className="text-xs text-destructive">
                Informe DDD + número (10 ou 11 dígitos)
              </p>
            )}
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <Button variant="outline" onClick={() => { setWaOpen(false); setWaPhone(""); }}>
              Cancelar
            </Button>
            <Button
              onClick={enviarWhats}
              disabled={waSending || !telValido}
              className="bg-[#25D366] text-white hover:bg-[#1ebe57]"
            >
              {waSending
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <Send className="mr-1.5 h-4 w-4" />}
              Enviar link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
