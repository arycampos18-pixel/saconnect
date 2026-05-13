import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Filter, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import {
  eleitoresService,
  inicioDoDiaLocalISO,
  type EleitorComRelacoes,
} from "@/modules/eleitores/services/eleitoresService";
import { catalogosService } from "@/modules/eleitores/services/catalogosService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EleitorDetailSheet } from "@/modules/eleitores/components/EleitorDetailSheet";
import { downloadCSV, toCSV } from "@/shared/utils/csv";
import { formatPhoneBR } from "@/shared/utils/phone";
import { toast } from "sonner";

const sb: any = supabase;

export default function VotersList() {
  const { user } = useAuth();
  const { role, isAdmin, loading: roleLoading } = useUserRole();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filtroCadastrosHoje = searchParams.get("cadastrados") === "hoje";

  // Descobre vínculo do usuário (liderança ou cabo)
  const { data: vinculo, isLoading: vinculoLoading } = useQuery({
    queryKey: ["user-political-binding", user?.id],
    enabled: !!user && !roleLoading,
    queryFn: async () => {
      const [{ data: lid }, { data: cabo }] = await Promise.all([
        sb.from("liderancas").select("id,nome").eq("user_id", user!.id).maybeSingle(),
        sb.from("cabos_eleitorais").select("id,nome,lideranca_id").eq("user_id", user!.id).maybeSingle(),
      ]);
      return { lideranca: lid ?? null, cabo: cabo ?? null };
    },
  });

  const [search, setSearch] = useState("");
  const [bairro, setBairro] = useState("todos");
  const [liderancaFiltro, setLiderancaFiltro] = useState("todas");
  const [selecionado, setSelecionado] = useState<EleitorComRelacoes | null>(null);
  const [eleitores, setEleitores] = useState<EleitorComRelacoes[]>([]);
  const [bairros, setBairros] = useState<string[]>([]);
  const [liderancas, setLiderancas] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Determina escopo conforme papel
  const escopo = useMemo(() => {
    if (roleLoading || vinculoLoading) return null;
    if (isAdmin) return { tipo: "admin" as const };
    if (vinculo?.cabo) return { tipo: "cabo" as const, caboId: vinculo.cabo.id, lideranca_id: vinculo.cabo.lideranca_id };
    if (vinculo?.lideranca || role === "lideranca")
      return { tipo: "lideranca" as const, liderancaId: vinculo?.lideranca?.id ?? null };
    return { tipo: "nenhum" as const };
  }, [isAdmin, role, vinculo, roleLoading, vinculoLoading]);

  const carregar = async () => {
    if (!escopo) return;
    setLoading(true);
    try {
      const filtros: any = { search, bairro };
      if (escopo.tipo === "cabo") filtros.caboId = escopo.caboId;
      else if (escopo.tipo === "lideranca") {
        if (!escopo.liderancaId) {
          setEleitores([]);
          setLoading(false);
          return;
        }
        filtros.liderancaId = escopo.liderancaId;
      } else       if (escopo.tipo === "admin" && liderancaFiltro !== "todas") {
        filtros.liderancaId = liderancaFiltro;
      }
      if (filtroCadastrosHoje) filtros.criadosDesde = inicioDoDiaLocalISO();
      const [els, bs, lids] = await Promise.all([
        eleitoresService.list(filtros),
        catalogosService.bairros(),
        escopo.tipo === "admin"
          ? sb.from("liderancas").select("id,nome").order("nome").then((r: any) => r.data ?? [])
          : Promise.resolve([]),
      ]);
      setEleitores(els);
      setBairros(bs);
      setLiderancas(lids);
    } catch (e: any) {
      toast.error("Erro ao carregar eleitores: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    escopo?.tipo,
    (escopo as any)?.caboId,
    (escopo as any)?.liderancaId,
    search,
    bairro,
    liderancaFiltro,
    filtroCadastrosHoje,
  ]);

  const titulo =
    escopo?.tipo === "admin"
      ? "Eleitores por Liderança"
      : escopo?.tipo === "cabo"
      ? `Meus Eleitores · ${vinculo?.cabo?.nome}`
      : `Eleitores da Liderança${vinculo?.lideranca ? " · " + vinculo.lideranca.nome : ""}`;

  const exportar = () => {
    if (!eleitores.length) return toast.error("Nada para exportar.");
    const rows = eleitores.map((e) => ({
      Nome: e.nome,
      Telefone: formatPhoneBR(e.telefone),
      CPF: e.cpf ?? "",
      Bairro: e.bairro ?? "",
      Cidade: e.cidade ?? "",
      Lideranca: e.lideranca?.nome ?? "",
      Cabo: e.cabo?.nome ?? "",
      Origem: e.origem,
    }));
    downloadCSV(`eleitores_lideranca_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  };

  if (roleLoading || vinculoLoading || !escopo) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
      </div>
    );
  }

  if (escopo.tipo === "nenhum") {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        Seu usuário não está vinculado a uma liderança ou cabo eleitoral.
      </div>
    );
  }

  if (escopo.tipo === "lideranca" && !escopo.liderancaId) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        Sua conta é marcada como liderança mas não há registro vinculado em "Lideranças". Peça ao administrador para vinculá-la.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {eleitores.length} eleitor(es) {loading ? "carregando..." : "encontrado(s)"}
            {filtroCadastrosHoje && !loading && (
              <>
                {" "}
                <span className="text-foreground">· cadastrados hoje</span>
                <button
                  type="button"
                  className="ml-2 text-primary underline-offset-4 hover:underline"
                  onClick={() => navigate("/app/political/voters", { replace: true })}
                >
                  ver todos
                </button>
              </>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportar} disabled={loading || !eleitores.length}>
          <Download className="mr-1.5 h-4 w-4" /> Exportar
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-elegant-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10"
            />
          </div>
          <Select value={bairro} onValueChange={setBairro}>
            <SelectTrigger className="h-10 w-[180px]">
              <Filter className="mr-1 h-3.5 w-3.5" />
              <SelectValue placeholder="Bairro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os bairros</SelectItem>
              {bairros.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          {escopo.tipo === "admin" && (
            <Select value={liderancaFiltro} onValueChange={setLiderancaFiltro}>
              <SelectTrigger className="h-10 w-[200px]">
                <SelectValue placeholder="Liderança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as lideranças</SelectItem>
                {liderancas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Bairro</TableHead>
                <TableHead className="hidden lg:table-cell">Liderança</TableHead>
                <TableHead className="hidden lg:table-cell">Cabo</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell></TableRow>
              ) : eleitores.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhum eleitor encontrado neste escopo.
                </TableCell></TableRow>
              ) : (
                eleitores.map((e) => (
                  <TableRow key={e.id} onClick={() => setSelecionado(e)} className="cursor-pointer hover:bg-secondary/60">
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{formatPhoneBR(e.telefone)}</TableCell>
                    <TableCell className="hidden md:table-cell">{e.bairro ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{e.lideranca?.nome ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{e.cabo?.nome ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {e.tags.slice(0, 2).map((t) => (
                          <Badge key={t.id} className="border-0 bg-primary/10 text-primary">{t.nome}</Badge>
                        ))}
                        {e.tags.length > 2 && <Badge variant="outline">+{e.tags.length - 2}</Badge>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <EleitorDetailSheet
        eleitor={selecionado}
        onOpenChange={(o) => !o && setSelecionado(null)}
        onDeleted={carregar}
      />
    </div>
  );
}
