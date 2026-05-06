import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { depStore } from "../store";
import type { FuncaoMembro } from "../data/mock";

const FUNCOES: FuncaoMembro[] = ["Membro", "Coordenador", "Voluntário"];

const novoSchema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(80),
  telefone: z.string().trim().min(8, "Telefone obrigatório").max(20),
  email: z.string().trim().email("E-mail inválido").max(120).optional().or(z.literal("")),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  bairro: z.string().trim().max(80).optional().or(z.literal("")),
  funcao: z.enum(["Membro", "Coordenador", "Voluntário"]),
});

export function AdicionarMembroDialog({
  open, onOpenChange, departamentoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departamentoId: string;
}) {
  const [tab, setTab] = useState("novo");
  const [novo, setNovo] = useState({
    nome: "", telefone: "", email: "", cpf: "", bairro: "", funcao: "Membro" as FuncaoMembro,
  });
  const [csv, setCsv] = useState<File | null>(null);

  const cadastrarNovo = () => {
    const parsed = novoSchema.safeParse(novo);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    depStore.adicionarMembro({
      departamentoId,
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      email: parsed.data.email || undefined,
      cpf: parsed.data.cpf || undefined,
      bairro: parsed.data.bairro || undefined,
      funcao: parsed.data.funcao,
    });
    toast.success("Membro adicionado");
    onOpenChange(false);
  };

  const importarCSV = async () => {
    if (!csv) { toast.error("Selecione um arquivo CSV"); return; }
    const text = await csv.text();
    const linhas = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    let count = 0;
    linhas.slice(1).forEach((linha) => {
      const [nome, telefone, email, cpf, funcaoRaw] = linha.split(",").map((s) => s?.trim() ?? "");
      if (!nome || !telefone) return;
      const funcao: FuncaoMembro = (FUNCOES as string[]).includes(funcaoRaw) ? (funcaoRaw as FuncaoMembro) : "Membro";
      depStore.adicionarMembro({ departamentoId, nome, telefone, email: email || undefined, cpf: cpf || undefined, funcao });
      count++;
    });
    toast.success(`${count} membros importados`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar membro</DialogTitle>
          <DialogDescription>Cadastre um novo membro ou importe uma lista.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="novo">Novo membro</TabsTrigger>
            <TabsTrigger value="csv">Importar CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="novo" className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome *</Label>
              <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} maxLength={80} />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={novo.cpf} onChange={(e) => setNovo({ ...novo, cpf: e.target.value })} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={novo.bairro} onChange={(e) => setNovo({ ...novo, bairro: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Função no Departamento</Label>
              <Select value={novo.funcao} onValueChange={(v) => setNovo({ ...novo, funcao: v as FuncaoMembro })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNCOES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Formato esperado (cabeçalho na primeira linha): <code>Nome, Telefone, Email, CPF, Função</code>
            </p>
            <Input type="file" accept=".csv,text/csv" onChange={(e) => setCsv(e.target.files?.[0] ?? null)} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {tab === "novo" ? (
            <Button onClick={cadastrarNovo}>Cadastrar e adicionar</Button>
          ) : (
            <Button onClick={importarCSV}>Importar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}