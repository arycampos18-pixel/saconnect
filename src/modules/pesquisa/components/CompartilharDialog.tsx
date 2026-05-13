import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Check, Download, MessageCircle, Loader2, Send, Plus, X, Shield, ShieldOff } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Pesquisa } from "../services/pesquisaService";
import { encurtarUrl } from "@/shared/utils/urlShortener";
import { supabase } from "@/integrations/supabase/client";

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type Modo = "validado" | "simples";

function LinkBlock({
  url,
  qrLabel,
  slug,
}: {
  url: string;
  qrLabel: string;
  slug: string;
}) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
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

  const baixarQR = () => {
    const canvas = qrRef.current?.querySelector<HTMLCanvasElement>("canvas");
    if (!canvas) { toast.error("QR Code ainda não carregou"); return; }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qrcode-${slug}-${qrLabel}.png`;
    a.click();
    toast.success("QR Code baixado!");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={qrRef} className="rounded-xl border-2 border-border bg-white p-4 shadow-sm">
        <QRCodeCanvas value={url} size={180} fgColor="#1E3A8A" bgColor="#FFFFFF" includeMargin level="M" />
      </div>

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

      <Button variant="outline" size="sm" className="w-full" onClick={baixarQR}>
        <Download className="h-4 w-4 mr-1.5" /> Baixar QR Code
      </Button>
    </div>
  );
}

export function CompartilharDialog({
  pesquisa, open, onOpenChange,
}: { pesquisa: Pesquisa | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [modo, setModo] = useState<Modo>("validado");
  const [waOpen, setWaOpen] = useState(false);
  const [phones, setPhones] = useState([""]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ tel: string; ok: boolean; msg: string }[]>([]);

  if (!pesquisa) return null;

  const code = (pesquisa as any).short_code ?? pesquisa.slug;
  const urlValidado = code ? `${window.location.origin}/p/${code}` : null;
  const urlSimples = code ? `${window.location.origin}/p/${code}?s=1` : null;
  const urlAtual = modo === "validado" ? urlValidado : urlSimples;

  // ── Envio via Z-API ─────────────────────────────────────────────────────────
  const addPhone = () => setPhones((p) => [...p, ""]);
  const removePhone = (i: number) => setPhones((p) => p.filter((_, idx) => idx !== i));
  const setPhone = (i: number, v: string) =>
    setPhones((p) => p.map((x, idx) => (idx === i ? formatPhone(v) : x)));

  const enviarViaZapi = async () => {
    if (!urlAtual) return;
    const validos = phones.map((p) => p.replace(/\D/g, "")).filter((p) => p.length >= 10);
    if (!validos.length) { toast.error("Informe ao menos um número válido"); return; }
    setSending(true);
    setResults([]);
    const curto = await encurtarUrl(urlAtual);
    const modoLabel = modo === "validado" ? "com verificação de WhatsApp" : "acesso direto";
    const msg = `Olá! 👋\n\nResponda nossa pesquisa "${pesquisa.titulo}" (${modoLabel}):\n${curto}`;
    const res: typeof results = [];
    for (const tel of validos) {
      try {
        const { data, error } = await supabase.functions.invoke("send-whatsapp-zapi", {
          body: { to: tel, message: msg },
        });
        if (error || (data as any)?.error) {
          res.push({ tel, ok: false, msg: (data as any)?.error ?? error?.message ?? "Falha" });
        } else {
          res.push({ tel, ok: true, msg: "Enviado ✓" });
        }
      } catch (e: any) {
        res.push({ tel, ok: false, msg: e.message ?? "Erro" });
      }
    }
    setResults(res);
    setSending(false);
    const ok = res.filter((r) => r.ok).length;
    if (ok > 0) toast.success(`${ok} mensagem${ok > 1 ? "ns" : ""} enviada${ok > 1 ? "s" : ""} com sucesso`);
    if (res.some((r) => !r.ok)) toast.error("Alguns envios falharam — verifique abaixo");
  };

  const fecharWa = () => { setWaOpen(false); setPhones([""]); setResults([]); };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar pesquisa</DialogTitle>
            <DialogDescription>
              Escolha o modo e compartilhe o link ou QR Code.
            </DialogDescription>
          </DialogHeader>

          {!urlValidado ? (
            <p className="text-sm text-destructive py-4 text-center">
              Esta pesquisa não possui um link público. Salve a pesquisa novamente.
            </p>
          ) : (
            <div className="flex flex-col gap-4 py-1">

              {/* Toggle de modo */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/30 p-1">
                <button
                  onClick={() => setModo("validado")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    modo === "validado"
                      ? "bg-background text-primary shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Com verificação WhatsApp
                </button>
                <button
                  onClick={() => setModo("simples")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    modo === "simples"
                      ? "bg-background text-primary shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  Acesso direto
                </button>
              </div>

              {/* Descrição do modo */}
              {modo === "validado" ? (
                <p className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
                  <Shield className="inline h-3.5 w-3.5 mr-1" />
                  O participante confirma o WhatsApp via código antes de responder. Evita respostas duplicadas.
                </p>
              ) : (
                <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <ShieldOff className="inline h-3.5 w-3.5 mr-1" />
                  O participante vai direto ao formulário. Nome é opcional e WhatsApp é obrigatório apenas no final.
                </p>
              )}

              {/* QR + Link do modo atual */}
              <LinkBlock
                url={modo === "validado" ? urlValidado : urlSimples!}
                qrLabel={modo === "validado" ? "verificado" : "simples"}
                slug={(pesquisa as any).short_code ?? pesquisa.slug ?? "pesquisa"}
              />

              {/* Enviar via WhatsApp */}
              <Button
                className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white"
                size="sm"
                onClick={() => setWaOpen(true)}
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Enviar via WhatsApp
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                A pesquisa precisa estar <strong>Ativa</strong> para aceitar respostas.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de envio WhatsApp via Z-API */}
      <Dialog open={waOpen} onOpenChange={fecharWa}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
              Enviar link via WhatsApp
            </DialogTitle>
            <DialogDescription>
              Informe os números que vão receber o link da pesquisa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              Números (com DDD)
            </Label>
            {phones.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="(67) 9 8765-4321"
                  value={p}
                  onChange={(e) => setPhone(i, e.target.value)}
                  inputMode="numeric"
                  maxLength={16}
                  className="flex-1"
                  disabled={sending}
                />
                {phones.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removePhone(i)}
                    disabled={sending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={addPhone}
              disabled={sending || phones.length >= 20}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar número
            </Button>

            {results.length > 0 && (
              <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs ${r.ok ? "text-emerald-700" : "text-destructive"}`}>
                    {r.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    <span className="font-mono">{r.tel}</span>
                    <span>— {r.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={fecharWa} disabled={sending}>
              Fechar
            </Button>
            <Button
              className="flex-1 bg-[#25D366] hover:bg-[#1ebe57] text-white"
              onClick={enviarViaZapi}
              disabled={sending || phones.every((p) => p.replace(/\D/g, "").length < 10)}
            >
              {sending
                ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Enviando…</>
                : <><Send className="h-4 w-4 mr-1.5" /> Enviar</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
