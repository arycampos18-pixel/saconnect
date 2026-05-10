import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { EleitorEditDialog } from "./EleitorEditDialog";

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm border-b border-border/50">
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2 break-words">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export function EleitorDetalheDialog({
  eleitor,
  open,
  onOpenChange,
}: {
  eleitor: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (!eleitor) return null;
  const e = eleitor;
  const fmtData = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : null;
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastro do Eleitor</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            <section>
              <h4 className="text-sm font-semibold mb-2">Identificação</h4>
              <Row label="Nome" value={e.nome} />
              <Row label="CPF" value={e.cpf} />
              <Row label="Data de Nascimento" value={fmtData(e.data_nascimento)} />
              <Row label="Nome da mãe" value={e.nome_mae} />
              <Row label="E-mail" value={e.email} />
            </section>

            <section>
              <h4 className="text-sm font-semibold mb-2">Contato</h4>
              <Row label="Telefone" value={e.telefone_original ?? e.telefone} />
              <Row
                label="WhatsApp validado"
                value={
                  e.telefone_validado ? (
                    <Badge className="bg-green-600 text-white hover:bg-green-600">Sim</Badge>
                  ) : (
                    <Badge variant="secondary">Não</Badge>
                  )
                }
              />
            </section>

            <section>
              <h4 className="text-sm font-semibold mb-2">Endereço</h4>
              <Row label="CEP" value={e.cep} />
              <Row label="Rua" value={e.rua} />
              <Row label="Número" value={e.numero} />
              <Row label="Complemento" value={e.complemento} />
              <Row label="Bairro" value={e.bairro} />
              <Row label="Cidade" value={e.cidade} />
              <Row label="UF" value={e.uf} />
            </section>

            <section>
              <h4 className="text-sm font-semibold mb-2">Dados eleitorais</h4>
              <Row label="Título de eleitor" value={e.titulo_eleitor ?? e.titulo_eleitoral} />
              <Row label="Zona" value={e.zona ?? e.zona_eleitoral} />
              <Row label="Seção" value={e.secao ?? e.secao_eleitoral} />
              <Row label="Município eleitoral" value={e.municipio_eleitoral} />
              <Row label="UF eleitoral" value={e.uf_eleitoral} />
              <Row label="Local de votação" value={e.local_votacao} />
              <Row label="Status validação" value={e.status_validacao_eleitoral} />
            </section>

            <section>
              <h4 className="text-sm font-semibold mb-2">Organização</h4>
              <Row label="Liderança" value={e.lideranca?.nome} />
              <Row label="Cabo eleitoral" value={e.cabo?.nome} />
              <Row label="Origem" value={e.origem} />
              <Row label="Status cadastro" value={e.status_cadastro} />
              <Row
                label="Tags"
                value={
                  (e.tags ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {(e.tags ?? []).map((t: any) => (
                        <Badge key={t.id} variant="outline" style={{ borderColor: t.cor }}>
                          {t.nome}
                        </Badge>
                      ))}
                    </div>
                  ) : null
                }
              />
              <Row label="Cadastrado em" value={fmtData(e.created_at)} />
              <Row label="Aceite LGPD" value={e.aceite_lgpd ? "Sim" : "Não"} />
              <Row label="Observações" value={e.observacoes} />
            </section>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar dados
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <EleitorEditDialog
      eleitor={e}
      open={editing}
      onOpenChange={(v) => {
        setEditing(v);
        if (!v) onOpenChange(false); // fecha o detalhe para recarregar com dados atualizados
      }}
    />
    </>
  );
}