import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { campanhasService, type PreviewSegmento } from "../services/campanhasService";
import { segmentacaoService, type Segmento } from "@/modules/segmentacao/services/segmentacaoService";
import { Users, Phone, Mail, ShieldCheck, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
}

export function NovaCampanhaDialog({ open, onOpenChange, onSent }: Props) {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [segmentoId, setSegmentoId] = useState("");
  const [nome, setNome] = useState("");
  const [canal, setCanal] = useState<"WhatsApp" | "SMS" | "Email">("WhatsApp");
  const [conteudo, setConteudo] = useState("");
  const [apenasLgpd, setApenasLgpd] = useState(true);
  const [preview, setPreview] = useState<PreviewSegmento | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) {
      segmentacaoService.listar().then(setSegmentos);
      setNome(""); setConteudo(""); setSegmentoId(""); setPreview(null); setApenasLgpd(true); setCanal("WhatsApp");
    }
  }, [open]);

  useEffect(() => {
    if (!segmentoId) { setPreview(null); return; }
    setLoadingPrev(true);
    campanhasService.previewSegmento(segmentoId)
      .then(setPreview)
      .catch((e) => toast.error("Erro no preview", { description: e.message }))
      .finally(() => setLoadingPrev(false));
  }, [segmentoId]);

  const elegiveis = preview
    ? canal === "Email"
      ? (apenasLgpd ? Math.min(preview.comEmail, preview.comConsentimento) : preview.comEmail)
      : (apenasLgpd ? Math.min(preview.comTelefone, preview.comConsentimento) : preview.comTelefone)
    : 0;

  const enviar = async () => {
    if (!nome.trim() || !segmentoId || !conteudo.trim()) {
      toast.error("Preencha nome, segmento e conteúdo"); return;
    }
    setEnviando(true);
    try {
      const total = await campanhasService.enviarCampanha({ nome, canal, conteudo, segmento_id: segmentoId, apenas_lgpd: apenasLgpd });
      toast.success(`Campanha enviada para ${total} destinatários`);
      onOpenChange(false);
      onSent();
    } catch (e: any) {
      toast.error("Erro ao enviar", { description: e.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova campanha segmentada</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome da campanha</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Convite evento sábado" /></div>
            <div>
              <Label>Canal</Label>
              <Select value={canal} onValueChange={(v: any) => setCanal(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Segmento alvo</Label>
            <Select value={segmentoId} onValueChange={setSegmentoId}>
              <SelectTrigger><SelectValue placeholder="Escolha um segmento..." /></SelectTrigger>
              <SelectContent>
                {segmentos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome} ({s.total_cache})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Conteúdo</Label>
            <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={5} placeholder="Olá {{nome}}, ..." />
            <p className="mt-1 text-xs text-muted-foreground">{conteudo.length} caracteres</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="lgpd" checked={apenasLgpd} onCheckedChange={(v) => setApenasLgpd(!!v)} />
            <Label htmlFor="lgpd" className="cursor-pointer">Enviar apenas para quem aceitou LGPD</Label>
          </div>

          {loadingPrev ? (
            <p className="text-sm text-muted-foreground">Calculando preview...</p>
          ) : preview && (
            <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold">Preview do envio</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div><Users className="mx-auto h-4 w-4 text-primary" /><p className="text-lg font-bold">{preview.total}</p><p className="text-[10px] text-muted-foreground">No segmento</p></div>
                <div><Phone className="mx-auto h-4 w-4 text-primary" /><p className="text-lg font-bold">{preview.comTelefone}</p><p className="text-[10px] text-muted-foreground">Com telefone</p></div>
                <div><Mail className="mx-auto h-4 w-4 text-primary" /><p className="text-lg font-bold">{preview.comEmail}</p><p className="text-[10px] text-muted-foreground">Com email</p></div>
                <div><ShieldCheck className="mx-auto h-4 w-4 text-primary" /><p className="text-lg font-bold">{preview.comConsentimento}</p><p className="text-[10px] text-muted-foreground">LGPD</p></div>
              </div>
              <div className="rounded bg-background p-2 text-center text-sm">
                <span className="text-muted-foreground">Receberão: </span>
                <strong className="text-primary">{elegiveis} destinatários</strong>
              </div>
              {preview.exemplos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1">Exemplos:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {preview.exemplos.map((e, i) => (
                      <li key={i}>{e.nome} {canal === "Email" ? `· ${e.email ?? "—"}` : `· ${e.telefone ?? "—"}`}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando || !preview || elegiveis === 0}>
            <Send className="mr-2 h-4 w-4" /> Enviar para {elegiveis}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}