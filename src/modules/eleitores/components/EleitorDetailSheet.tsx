import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { EleitorComRelacoes } from "@/modules/eleitores/services/eleitoresService";
import { eleitoresService } from "@/modules/eleitores/services/eleitoresService";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Phone, MapPin, IdCard, Building2, UserCheck, Tag, Shield, MessageCircle, Mail, Trash2, Loader2, TrendingUp, Star, Lock, Pencil, Check, X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCan } from "@/shared/auth/useCan";

type Props = {
  eleitor: EleitorComRelacoes | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function EleitorDetailSheet({ eleitor, onOpenChange, onDeleted }: Props) {
  if (!eleitor) return null;
  const initials = eleitor.nome.split(" ").map((n) => n[0]).slice(0, 2).join("");
  const [deleting, setDeleting] = useState(false);
  const { isSuperAdmin, can } = useCan();
  const isAdmin = isSuperAdmin || can("eleitores.edit");
  const bloqueado = !!eleitor.whatsapp_bloqueado;
  const podeEditarTelefone = !bloqueado || isAdmin;

  const [editTel, setEditTel] = useState(false);
  const [novoTel, setNovoTel] = useState(eleitor.telefone);
  const [savingTel, setSavingTel] = useState(false);

  const salvarTel = async () => {
    setSavingTel(true);
    try {
      await eleitoresService.updateTelefone(eleitor.id, novoTel);
      toast.success("Telefone atualizado");
      eleitor.telefone = novoTel.replace(/\D/g, "");
      setEditTel(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar telefone");
    } finally {
      setSavingTel(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await eleitoresService.remove(eleitor.id);
      toast.success("Eleitor excluído");
      onOpenChange(false);
      onDeleted?.();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={!!eleitor} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <div className="bg-primary p-6 text-primary-foreground">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-white/20">
                <AvatarFallback className="bg-white text-lg font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-2xl text-primary-foreground">{eleitor.nome}</SheetTitle>
                <SheetDescription className="text-primary-foreground/80">
                  {[eleitor.bairro, eleitor.cidade].filter(Boolean).join(" · ") || "—"}
                </SheetDescription>
               <div className="mt-2 flex flex-wrap items-center gap-1.5">
                   <Badge className="bg-white/20 text-white border-0">
                     <Star className="mr-1 h-3 w-3 fill-white" /> {eleitor.score_fidelidade}% Fidelidade
                   </Badge>
                   {eleitor.tags.map((t) => (
                    <Badge key={t.id} className="border-0 bg-white/15 text-primary-foreground hover:bg-white/25">
                      {t.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3 sm:col-span-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Telefone / WhatsApp</p>
                    {bloqueado && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Lock className="h-3 w-3" /> Protegido
                      </span>
                    )}
                  </div>
                  {editTel ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        value={novoTel}
                        onChange={(e) => setNovoTel(e.target.value)}
                        className="h-8"
                        inputMode="numeric"
                        maxLength={15}
                      />
                      <Button size="sm" onClick={salvarTel} disabled={savingTel}>
                        {savingTel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditTel(false); setNovoTel(eleitor.telefone); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{eleitor.telefone}</p>
                      {podeEditarTelefone ? (
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditTel(true)}>
                          <Pencil className="mr-1 h-3 w-3" /> Editar
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Apenas admin</span>
                      )}
                    </div>
                  )}
                  {bloqueado && eleitor.whatsapp_origem && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Número original que recebeu o link: {eleitor.whatsapp_origem}
                    </p>
                  )}
                </div>
              </div>
              <Field icon={IdCard} label="CPF" value={eleitor.cpf ?? "—"} />
              <Field icon={Mail} label="E-mail" value={eleitor.email ?? "—"} />
              <Field icon={Building2} label="Cidade" value={eleitor.cidade ?? "—"} />
              <Field icon={MapPin} label="Bairro" value={eleitor.bairro ?? "—"} />
              <Field icon={MapPin} label="Endereço" value={
                [eleitor.rua, eleitor.numero].filter(Boolean).join(", ") || "—"
              } />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Informações de Gestão
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <Field icon={Tag} label="Origem do Cadastro" value={eleitor.origem} />
              <Field icon={UserCheck} label="Liderança Responsável" value={eleitor.lideranca?.nome ?? "—"} />
               <Field icon={UserCheck} label="Cabo Eleitoral" value={eleitor.cabo?.nome ?? "—"} />
               <Field icon={TrendingUp} label="Score de Fidelidade" value={`${eleitor.score_fidelidade}%`} />
             </div>
           </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Conformidade
            </h3>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Consentimento LGPD</p>
                  <p className="text-xs text-muted-foreground">
                    {eleitor.consentimento_lgpd ? "Eleitor autorizou contato" : "Sem consentimento registrado"}
                  </p>
                </div>
              </div>
              <Switch checked={eleitor.consentimento_lgpd} disabled />
            </div>
          </section>

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]">
              <MessageCircle className="mr-2 h-4 w-4" /> Enviar Mensagem
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir eleitor?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação remove permanentemente <strong>{eleitor.nome}</strong> da base. Não é possível desfazer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
