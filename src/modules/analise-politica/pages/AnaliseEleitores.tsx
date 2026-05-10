import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell } from "../components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MessageCircle, CheckCircle2, Sparkles, Search, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analiseService } from "../services/analiseService";
import { EleitorFormDialog } from "../components/EleitorFormDialog";
import { WhatsAppValidacaoDialog } from "../components/WhatsAppValidacaoDialog";
import { EleitorDetalheDialog } from "../components/EleitorDetalheDialog";
import { EleitorEditDialog } from "../components/EleitorEditDialog";

const sb: any = supabase;

export default function AnaliseEleitores() {
  const [validar, setValidar] = useState<{ id: string; nome: string; telefone?: string | null; auto?: boolean } | null>(null);
  const [enriquecendoId, setEnriquecendoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [editar, setEditar] = useState<any | null>(null);

  const [search, setSearch] = useState("");
  const [bairro, setBairro] = useState<string>("todos");
  const [liderancaId, setLiderancaId] = useState<string>("todas");
  const [caboId, setCaboId] = useState<string>("todos");
  const [tagId, setTagId] = useState<string>("todas");

  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["analise-eleitores", { search, bairro, liderancaId, caboId, tagId }],
    queryFn: () =>
      analiseService.listarEleitores({ search, bairro, liderancaId, caboId, tagId }),
  });

  const { data: liderancas = [] } = useQuery({
    queryKey: ["lookup-liderancas"],
    queryFn: async () => (await sb.from("liderancas").select("id,nome").order("nome")).data ?? [],
  });
  const { data: cabos = [] } = useQuery({
    queryKey: ["lookup-cabos"],
    queryFn: async () => (await sb.from("cabos_eleitorais").select("id,nome").order("nome")).data ?? [],
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["lookup-tags"],
    queryFn: async () => (await sb.from("tags").select("id,nome,cor").order("nome")).data ?? [],
  });

  const bairros = useMemo(() => {
    const set = new Set<string>();
    (rows as any[]).forEach((r) => r.bairro && set.add(r.bairro));
    return Array.from(set).sort();
  }, [rows]);

  const enriquecer = useMutation({
    mutationFn: (eleitor_id: string) => analiseService.enriquecerEleitor({ eleitor_id }),
    onMutate: (id) => setEnriquecendoId(id),
    onSettled: () => setEnriquecendoId(null),
    onSuccess: (r) => {
      if ((r as any)?.skipped) {
        toast.info((r as any)?.motivo ?? "Sem CPF/telefone para enriquecer este eleitor.");
        return;
      }
      const n = r?.campos_aplicados?.length ?? 0;
      const div = r?.divergencia;
      if (div && div.divergencias_fortes.length > 0) {
        toast.warning(`Divergência (score ${div.score}/100): ${div.divergencias_fortes.join(", ")}.`);
      } else if (div) {
        toast.success(`Enriquecimento OK · score ${div.score}/100 · ${n} campo(s) atualizado(s).`);
      } else {
        toast.success(`Consulta registrada${r?.chave_busca ? ` (busca por ${r.chave_busca})` : ""}.`);
      }
      qc.invalidateQueries({ queryKey: ["analise-eleitores"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha no enriquecimento"),
  });

  return (
    <PageShell
      title="Todos os Eleitores"
      description="Base unificada de eleitores."
      actions={
        <EleitorFormDialog
          onCreated={(eleitor) =>
            eleitor && setValidar({ id: eleitor.id, nome: eleitor.nome, telefone: eleitor.telefone_original ?? eleitor.telefone, auto: true })
          }
        />
      }
    >
      <Card>
        <CardContent className="p-3 grid gap-2 md:grid-cols-5 sm:grid-cols-2">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou CPF…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={bairro} onValueChange={setBairro}>
            <SelectTrigger><SelectValue placeholder="Bairro" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os bairros</SelectItem>
              {bairros.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={liderancaId} onValueChange={setLiderancaId}>
            <SelectTrigger><SelectValue placeholder="Liderança" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lideranças</SelectItem>
              {(liderancas as any[]).map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={caboId} onValueChange={setCaboId}>
            <SelectTrigger><SelectValue placeholder="Cabo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os cabos</SelectItem>
              {(cabos as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tagId} onValueChange={setTagId}>
            <SelectTrigger><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as tags</SelectItem>
              {(tags as any[]).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-auto">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : (rows as any[]).length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum eleitor encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Liderança</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as any[]).map((e) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setDetalhe(e)}
                  >
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={(ev) => { ev.stopPropagation(); setDetalhe(e); }}
                      >
                        <div>{e.nome}</div>
                        <div className="text-xs text-muted-foreground">{e.cpf ?? "sem CPF"}</div>
                      </button>
                    </TableCell>
                    <TableCell>{e.telefone_original ?? e.telefone ?? "—"}</TableCell>
                    <TableCell>{e.bairro ?? "—"}</TableCell>
                    <TableCell>{e.lideranca?.nome ?? "—"}</TableCell>
                    <TableCell>{e.origem ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(e.tags ?? []).map((t: any) => (
                          <Badge key={t.id} variant="outline" style={{ borderColor: t.cor }}>{t.nome}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.ativo === false ? "secondary" : "default"}>
                        {e.ativo === false ? "Inativo" : "Ativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {e.created_at ? new Date(e.created_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        {e.telefone_validado ? (
                          <Badge className="bg-green-600 hover:bg-green-600 text-white">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> WhatsApp
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline"
                            onClick={() => setValidar({ id: e.id, nome: e.nome, telefone: e.telefone_original ?? e.telefone })}>
                            <MessageCircle className="h-3 w-3 mr-1" /> Validar
                          </Button>
                        )}
                        <Button size="sm" variant="outline"
                          disabled={enriquecendoId === e.id}
                          onClick={() => enriquecer.mutate(e.id)}>
                          <Sparkles className="h-3 w-3 mr-1" />
                          {enriquecendoId === e.id ? "…" : "Enriquecer"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditar(e)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {validar && (
        <WhatsAppValidacaoDialog
          eleitorId={validar.id}
          eleitorNome={validar.nome}
          telefone={validar.telefone}
          autoEnviar={validar.auto}
          open={!!validar}
          onOpenChange={(v) => !v && setValidar(null)}
        />
      )}

      <EleitorDetalheDialog
        eleitor={detalhe}
        open={!!detalhe}
        onOpenChange={(v) => !v && setDetalhe(null)}
      />

      <EleitorEditDialog
        eleitor={editar}
        open={!!editar}
        onOpenChange={(v) => !v && setEditar(null)}
      />
    </PageShell>
  );
}
