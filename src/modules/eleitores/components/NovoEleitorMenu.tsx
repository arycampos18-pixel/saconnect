import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Plus, UserPlus, Link2, QrCode, Copy, MessageCircle, Download, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCan } from "@/shared/auth/useCan";
import { supabase } from "@/integrations/supabase/client";

export function NovoEleitorMenu() {
  const navigate = useNavigate();
  const { can } = useCan();
  const [linkOpen, setLinkOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waSending, setWaSending] = useState(false);

  const [tokenUrl, setTokenUrl] = useState<string>("");
  const [tokenQrUrl, setTokenQrUrl] = useState<string>("");
  const [genLink, setGenLink] = useState(false);
  const [genQr, setGenQr] = useState(false);

  // Esconde o menu inteiro se o usuário não pode criar eleitores.
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
    if (tel.length !== 11) { toast.error("Informe DDD + 9 dígitos"); return; }
    setWaSending(true);
    try {
      const u = await gerarToken("whatsapp", tel);
      if (!u) return;
      const msg = `Olá! 👋\n\nClique no link abaixo para se cadastrar na nossa base:\n${u}`;
      const { data, error } = await supabase.functions.invoke("send-whatsapp-zapi", {
        body: { to: tel, message: msg },
      });
      if (error || (data as any)?.error) {
        // fallback: abrir wa.me se Z-API não configurado
        const wa = `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
        window.open(wa, "_blank", "noopener");
        toast.message("Z-API indisponível — abrindo WhatsApp Web");
      } else {
        toast.success("Link enviado por WhatsApp");
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
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const compartilharWhats = () => {
    if (!tokenUrl) return;
    const msg = encodeURIComponent(
      `Olá! Faça seu cadastro de eleitor pelo link: ${tokenUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener");
  };

  const baixarQR = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#novo-eleitor-qrcode canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "qrcode-cadastro-eleitor.png";
    a.click();
  };

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
            <Input value={genLink ? "Gerando…" : tokenUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" onClick={copiar} disabled={!tokenUrl || genLink}>
              <Copy className="mr-1.5 h-4 w-4" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Válido por 30 dias · uso único</p>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={regerarLink} disabled={genLink}>
              {genLink ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Gerar novo
            </Button>
            <Button onClick={compartilharWhats} disabled={!tokenUrl || genLink} className="bg-[#25D366] text-white hover:bg-[#1ebe57]">
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
          <div id="novo-eleitor-qrcode" className="flex justify-center rounded-lg border bg-white p-4">
            {genQr || !tokenQrUrl ? (
              <div className="flex h-[220px] w-[220px] items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <QRCodeCanvas value={tokenQrUrl} size={220} includeMargin />
            )}
          </div>
          <p className="break-all text-center text-xs text-muted-foreground">{tokenQrUrl || "Gerando…"}</p>
          <p className="text-center text-[11px] text-muted-foreground">Válido por 30 dias · uso único</p>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={regerarQr} disabled={genQr}>
              {genQr ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Gerar novo
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
          <Input
            placeholder="(11) 98765-4321"
            value={waPhone}
            onChange={(e) => setWaPhone(e.target.value)}
            inputMode="numeric"
            maxLength={16}
          />
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setWaOpen(false)}>Cancelar</Button>
            <Button onClick={enviarWhats} disabled={waSending || waPhone.replace(/\D/g, "").length !== 11}>
              {waSending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Enviar link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}