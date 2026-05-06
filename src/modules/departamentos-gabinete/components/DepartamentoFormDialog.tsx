import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { depStore } from "../store";
import { RESPONSAVEIS, type DepartamentoGab } from "../data/mock";

const schema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(80, "Máximo 80 caracteres"),
  descricao: z.string().trim().min(10, "Descrição mínima de 10 caracteres").max(500),
  responsavel: z.string().trim().min(1, "Responsável obrigatório"),
  objetivo: z.string().trim().max(500).optional().or(z.literal("")),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  telefone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(120).optional().or(z.literal("")),
  status: z.enum(["Ativo", "Inativo"]),
});

export function DepartamentoFormDialog({
  open, onOpenChange, editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: DepartamentoGab | null;
}) {
  const [form, setForm] = useState({
    nome: "", descricao: "", responsavel: "", objetivo: "", area: "",
    telefone: "", email: "", status: "Ativo" as "Ativo" | "Inativo",
  });

  useEffect(() => {
    if (open) {
      setForm({
        nome: editing?.nome ?? "",
        descricao: editing?.descricao ?? "",
        responsavel: editing?.responsavel ?? "",
        objetivo: editing?.objetivo ?? "",
        area: editing?.area ?? "",
        telefone: editing?.telefone ?? "",
        email: editing?.email ?? "",
        status: editing?.status ?? "Ativo",
      });
    }
  }, [open, editing]);

  const salvar = () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    const existentes = depStore.getState().departamentos;
    const dup = existentes.find(
      (d) => d.nome.toLowerCase() === parsed.data.nome.toLowerCase() && d.id !== editing?.id,
    );
    if (dup) {
      toast.error("Já existe um departamento com este nome");
      return;
    }
    const payload = {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao,
      responsavel: parsed.data.responsavel,
      objetivo: parsed.data.objetivo || undefined,
      area: parsed.data.area || undefined,
      telefone: parsed.data.telefone || undefined,
      email: parsed.data.email || undefined,
      status: parsed.data.status,
    };
    if (editing) {
      depStore.atualizar(editing.id, payload);
      toast.success("Departamento atualizado");
    } else {
      depStore.criar(payload);
      toast.success("Departamento criado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar departamento" : "Novo departamento"}</DialogTitle>
          <DialogDescription>
            Preencha os dados do departamento do gabinete.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={80} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição *</Label>
            <Textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              maxLength={500}
            />
          </div>
          <div>
            <Label>Responsável *</Label>
            <Select value={form.responsavel} onValueChange={(v) => setForm({ ...form, responsavel: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {RESPONSAVEIS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Área de Atuação</Label>
            <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex.: Centro, Setor Sul" />
          </div>
          <div className="sm:col-span-2">
            <Label>Objetivo</Label>
            <Textarea rows={2} value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} maxLength={500} />
          </div>
          <div>
            <Label>Telefone de Contato</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <Label>E-mail de Contato</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.status === "Ativo"}
              onCheckedChange={(v) => setForm({ ...form, status: v ? "Ativo" : "Inativo" })}
            />
            <Label>{form.status === "Ativo" ? "Ativo" : "Inativo"}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar}>{editing ? "Salvar alterações" : "Criar Departamento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}