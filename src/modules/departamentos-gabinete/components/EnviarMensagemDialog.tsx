import { useMemo, useState } from "react";
import { Send, MessageSquare, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { depStore } from "../store";
import type { MembroDep, DepartamentoGab } from "../data/mock";

type Canal = "WhatsApp" | "SMS" | "Email";
type Alvo = "todos" | "ativos" | "membro";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departamento: DepartamentoGab;
  membros: MembroDep[];
  membroPreSelecionado?: MembroDep | null;
}

export function EnviarMensagemDialog({
  open, onOpenChange, departamento, membros, membroPreSelecionado,
}: Props) {
  const [canal, setCanal] = useState<Canal>("WhatsApp");
  const [alvo, setAlvo] = useState<Alvo>(membroPreSelecionado ? "membro" : "ativos");
  const [membroId, setMembroId] = useState<string>(membroPreSelecionado?.id ?? "");
  const [conteudo, setConteudo] = useState(
    `Olá {nome}, somos do departamento de ${departamento.nome}. `,
  );
  const [enviando, setEnviando] = useState(false);

  const destinatarios = useMemo(() => {
    if (alvo === "membro") return membros.filter((m) => m.id === membroId);
    if (alvo === "ativos") return membros.filter((m) => m.status === "Ativo");
    return membros;
  }, [alvo, membroId, membros]);

  const validos = useMemo(
    () => destinatarios.filter((m) => (canal === "Email" ? !!m.email : !!m.telefone)),
    [destinatarios, canal],
  );

  const enviar = async () => {
    if (!conteudo.trim()) { toast.error("Escreva uma mensagem"); return; }
    if (validos.length === 0) {
      toast.error(`Nenhum destinatário com ${canal === "Email" ? "e-mail" : "telefone"}`);
      return;
    }
    setEnviando(true);
    let ok = 0, fail = 0;

    for (const m of validos) {
        const texto = conteudo.split("{nome}").join(m.nome.split(" ")[0] ?? m.nome);
      try {
        if (canal === "WhatsApp") {
          const { data: sess } = await supabase.auth.getSession();
          const token = sess.session?.access_token;
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-zapi`;
          const resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ to: m.telefone, message: texto, nome: m.nome }),
          });
          if (!resp.ok) throw new Error(await resp.text());
        } else {
          // SMS/Email: simulação local (sem provedor configurado neste módulo)
          await new Promise((r) => setTimeout(r, 120));
        }
        ok++;
      } catch (e) {
        console.error("Falha envio", m.nome, e);
        fail++;
      }
    }

    // Registra no histórico (uma entrada de resumo)
    const alvoLabel =
      alvo === "membro" ? validos[0]?.nome ?? "membro"
      : alvo === "ativos" ? `${validos.length} membros ativos`
      : `${validos.length} membros`;

    depStore.registrarInteracao({
      departamentoId: departamento.id,
      dataHora: new Date().toISOString(),
      tipo: "Contato",
      descricao: `${canal} enviado para ${alvoLabel}: "${conteudo.slice(0, 80)}${conteudo.length > 80 ? "…" : ""}"`,
      responsavel: departamento.responsavel,
      status: fail === 0 ? "Concluído" : (ok === 0 ? "Pendente" : "Em andamento"),
    });

    setEnviando(false);
    if (fail === 0) toast.success(`${ok} mensagens enviadas`);
    else toast.warning(`${ok} enviadas, ${fail} falharam`);
    onOpenChange(false);
  };

  const Icone = canal === "Email" ? Mail : canal === "SMS" ? Phone : MessageSquare;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icone className="h-4 w-4" /> Enviar mensagem
          </DialogTitle>
          <DialogDescription>
            Departamento <strong>{departamento.nome}</strong>. Use {"{nome}"} para personalizar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Canal</Label>
              <Select value={canal} onValueChange={(v) => setCanal(v as Canal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="Email">E-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destinatários</Label>
              <Select value={alvo} onValueChange={(v) => setAlvo(v as Alvo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativos">Apenas ativos</SelectItem>
                  <SelectItem value="todos">Todos os membros</SelectItem>
                  <SelectItem value="membro">Membro específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {alvo === "membro" && (
            <div>
              <Label>Membro</Label>
              <Select value={membroId} onValueChange={setMembroId}>
                <SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                <SelectContent>
                  {membros.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Mensagem</Label>
            <Textarea
              rows={5}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              maxLength={1000}
              placeholder="Escreva a mensagem…"
            />
            <p className="mt-1 text-xs text-muted-foreground">{conteudo.length}/1000</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3 text-xs">
            <Badge variant="secondary">{validos.length} válidos</Badge>
            {destinatarios.length !== validos.length && (
              <Badge variant="outline" className="text-muted-foreground">
                {destinatarios.length - validos.length} sem {canal === "Email" ? "e-mail" : "telefone"}
              </Badge>
            )}
            <span className="text-muted-foreground">
              {canal === "WhatsApp"
                ? "Envio real via Z-API."
                : canal === "SMS"
                ? "Envio simulado (sem provedor SMS conectado)."
                : "Envio simulado (sem provedor de e-mail conectado)."}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={enviando || validos.length === 0}>
            <Send className="mr-2 h-4 w-4" />
            {enviando ? "Enviando…" : `Enviar (${validos.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}