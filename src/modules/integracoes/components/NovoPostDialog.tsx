import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { integracoesService, type RedeSocial, type PostStatus } from "../services/integracoesService";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const REDES: RedeSocial[] = ["Instagram", "Facebook", "X", "LinkedIn", "TikTok", "YouTube", "Outro"];
const STATUS: PostStatus[] = ["Rascunho", "Agendado", "Publicado"];

export function NovoPostDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [rede, setRede] = useState<RedeSocial>("Instagram");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [link, setLink] = useState("");
  const [imagem, setImagem] = useState("");
  const [status, setStatus] = useState<PostStatus>("Rascunho");
  const [agendado, setAgendado] = useState("");

  const criar = useMutation({
    mutationFn: () =>
      integracoesService.criarPost({
        rede,
        titulo,
        conteudo: conteudo || null,
        link: link || null,
        imagem_url: imagem || null,
        status,
        agendado_para: agendado ? new Date(agendado).toISOString() : null,
        metadata: {},
      } as Parameters<typeof integracoesService.criarPost>[0]),
    onSuccess: () => {
      toast.success("Post criado");
      qc.invalidateQueries({ queryKey: ["integracoes"] });
      setTitulo(""); setConteudo(""); setLink(""); setImagem(""); setAgendado("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo post social</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rede</Label>
              <Select value={rede} onValueChange={(v) => setRede(v as RedeSocial)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REDES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Conteúdo</Label>
            <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Link</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Imagem (URL)</Label>
              <Input value={imagem} onChange={(e) => setImagem(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          {status === "Agendado" && (
            <div>
              <Label>Agendar para</Label>
              <Input type="datetime-local" value={agendado} onChange={(e) => setAgendado(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => titulo ? criar.mutate() : toast.error("Título obrigatório")} disabled={criar.isPending}>
            {criar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}