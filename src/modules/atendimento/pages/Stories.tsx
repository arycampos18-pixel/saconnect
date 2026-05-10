import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { atendimentoService } from "../services/atendimentoService";
import { Loader2, Send, Image as ImageIcon, Video, Type, MessageCircleReply } from "lucide-react";

export default function Stories() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stories WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Publique stories e responda stories de contatos via Z-API</p>
      </div>

      <Tabs defaultValue="texto" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="texto"><Type className="mr-1 h-3.5 w-3.5" /> Texto</TabsTrigger>
          <TabsTrigger value="imagem"><ImageIcon className="mr-1 h-3.5 w-3.5" /> Imagem</TabsTrigger>
          <TabsTrigger value="video"><Video className="mr-1 h-3.5 w-3.5" /> Vídeo</TabsTrigger>
          <TabsTrigger value="reply"><MessageCircleReply className="mr-1 h-3.5 w-3.5" /> Responder Status</TabsTrigger>
        </TabsList>

        <TabsContent value="texto"><StoryTexto /></TabsContent>
        <TabsContent value="imagem"><StoryImagem /></TabsContent>
        <TabsContent value="video"><StoryVideo /></TabsContent>
        <TabsContent value="reply"><ResponderStatus /></TabsContent>
      </Tabs>
    </div>
  );
}

function StoryTexto() {
  const [text, setText] = useState("");
  const [bg, setBg] = useState("#25D366");
  const [loading, setLoading] = useState(false);
  const enviar = async () => {
    if (!text.trim()) return toast.error("Digite o texto");
    setLoading(true);
    try {
      await atendimentoService.enviarStatusTexto(text, bg);
      toast.success("Status de texto publicado");
      setText("");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader><CardTitle>Status de texto</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Cor de fundo</Label>
          <Input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-10 w-24" />
        </div>
        <div>
          <Label>Texto</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="O que você quer compartilhar?" />
        </div>
        <Button onClick={enviar} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Publicar
        </Button>
      </CardContent>
    </Card>
  );
}

function StoryImagem() {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const enviar = async () => {
    if (!url.trim()) return toast.error("Informe a URL da imagem");
    setLoading(true);
    try {
      await atendimentoService.enviarStatusImagem(url, caption || undefined);
      toast.success("Status de imagem publicado");
      setUrl(""); setCaption("");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader><CardTitle>Status de imagem</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>URL da imagem (https)</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <Label>Legenda (opcional)</Label>
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} />
        </div>
        <Button onClick={enviar} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Publicar
        </Button>
      </CardContent>
    </Card>
  );
}

function StoryVideo() {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const enviar = async () => {
    if (!url.trim()) return toast.error("Informe a URL do vídeo");
    setLoading(true);
    try {
      await atendimentoService.enviarStatusVideo(url, caption || undefined);
      toast.success("Status de vídeo publicado");
      setUrl(""); setCaption("");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  return (
    <Card>
      <CardHeader><CardTitle>Status de vídeo</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>URL do vídeo (mp4)</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <Label>Legenda (opcional)</Label>
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} />
        </div>
        <Button onClick={enviar} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Publicar
        </Button>
      </CardContent>
    </Card>
  );
}

function ResponderStatus() {
  const [tipo, setTipo] = useState<"texto" | "gif" | "sticker">("texto");
  const [phone, setPhone] = useState("");
  const [messageId, setMessageId] = useState("");
  const [text, setText] = useState("");
  const [media, setMedia] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    if (!phone || !messageId) return toast.error("Telefone e ID do status são obrigatórios");
    setLoading(true);
    try {
      if (tipo === "texto") {
        if (!text) return toast.error("Digite a resposta");
        await atendimentoService.responderStatusTexto({ phone, messageId, text });
      } else if (tipo === "gif") {
        await atendimentoService.responderStatusGif({ phone, messageId, gif: media, caption: caption || undefined });
      } else {
        await atendimentoService.responderStatusSticker({ phone, messageId, sticker: media });
      }
      toast.success("Resposta enviada ao status");
      setText(""); setMedia(""); setCaption("");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Responder status de contato</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {(["texto","gif","sticker"] as const).map((t) => (
            <Button key={t} size="sm" variant={tipo === t ? "default" : "outline"} onClick={() => setTipo(t)}>{t.toUpperCase()}</Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Telefone do contato</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511999999999" />
          </div>
          <div>
            <Label>ID da mensagem do status</Label>
            <Input value={messageId} onChange={(e) => setMessageId(e.target.value)} placeholder="messageId do status" />
          </div>
        </div>
        {tipo === "texto" ? (
          <div>
            <Label>Resposta</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          </div>
        ) : (
          <>
            <div>
              <Label>URL do {tipo === "gif" ? "GIF" : "Sticker"}</Label>
              <Input value={media} onChange={(e) => setMedia(e.target.value)} placeholder="https://..." />
            </div>
            {tipo === "gif" && (
              <div>
                <Label>Legenda (opcional)</Label>
                <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
              </div>
            )}
          </>
        )}
        <Button onClick={enviar} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Responder status
        </Button>
      </CardContent>
    </Card>
  );
}