import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Plus, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  eleitoresService, type EleitorComRelacoes,
} from "@/modules/eleitores/services/eleitoresService";
import { catalogosService, type Tag } from "@/modules/eleitores/services/catalogosService";
import { EleitorDetailSheet } from "@/modules/eleitores/components/EleitorDetailSheet";
import { downloadCSV, toCSV } from "@/shared/utils/csv";
import { formatPhoneBR } from "@/shared/utils/phone";

const PAGE_SIZE = 10;

export default function Eleitores() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [bairro, setBairro] = useState("todos");
  const [tag, setTag] = useState("todas");
  const [page, setPage] = useState(1);
  const [selecionado, setSelecionado] = useState<EleitorComRelacoes | null>(null);
  const [eleitores, setEleitores] = useState<EleitorComRelacoes[]>([]);
  const [bairros, setBairros] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const [els, bs, ts] = await Promise.all([
        eleitoresService.list({ search, bairro, tagId: tag }),
        catalogosService.bairros(),
        catalogosService.tags(),
      ]);
      setEleitores(els);
      setBairros(bs);
      setTags(ts);
    } catch (e: any) {
      toast.error("Erro ao carregar eleitores: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, bairro, tag]);

  const totalPages = Math.max(1, Math.ceil(eleitores.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => eleitores.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [eleitores, page]
  );

  const exportar = () => {
    if (eleitores.length === 0) {
      toast.error("Não há eleitores para exportar.");
      return;
    }
    const rows = eleitores.map((e) => ({
      Nome: e.nome,
      Telefone: formatPhoneBR(e.telefone),
      CPF: e.cpf ?? "",
      Email: e.email ?? "",
      DataNascimento: e.data_nascimento ?? "",
      Genero: e.genero ?? "",
      CEP: e.cep ?? "",
      Rua: e.rua ?? "",
      Numero: e.numero ?? "",
      Bairro: e.bairro ?? "",
      Cidade: e.cidade ?? "",
      UF: e.uf ?? "",
      Lideranca: e.lideranca?.nome ?? "",
      Cabo: e.cabo?.nome ?? "",
      Tags: e.tags.map((t) => t.nome).join("|"),
      Origem: e.origem,
      ConsentimentoLGPD: e.consentimento_lgpd ? "Sim" : "Não",
      CriadoEm: new Date(e.created_at).toLocaleString("pt-BR"),
    }));
    downloadCSV(`eleitores_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
    toast.success(`${rows.length} eleitores exportados`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Base de Eleitores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {eleitores.length} eleitores {loading ? "carregando..." : "encontrados"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportar} disabled={loading || eleitores.length === 0}>
            <Download className="mr-1.5 h-4 w-4" /> Exportar
          </Button>
          <Button
            onClick={() => navigate("/app/captacao")}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Novo Eleitor
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-elegant-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou CPF..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-10 pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={bairro} onValueChange={(v) => { setBairro(v); setPage(1); }}>
              <SelectTrigger className="h-10 w-[180px]">
                <Filter className="mr-1 h-3.5 w-3.5" />
                <SelectValue placeholder="Bairro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os bairros</SelectItem>
                {bairros.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tag} onValueChange={(v) => { setTag(v); setPage(1); }}>
              <SelectTrigger className="h-10 w-[160px]">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as tags</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Bairro</TableHead>
                <TableHead className="hidden lg:table-cell">Liderança</TableHead>
                <TableHead className="hidden lg:table-cell">Origem</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhum eleitor encontrado.{" "}
                    <button
                      onClick={() => navigate("/app/captacao")}
                      className="font-semibold text-primary hover:underline"
                    >
                      Cadastrar o primeiro
                    </button>
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((e) => (
                  <TableRow
                    key={e.id}
                    onClick={() => setSelecionado(e)}
                    className="cursor-pointer border-border transition-colors hover:bg-secondary/60"
                  >
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{formatPhoneBR(e.telefone)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{e.bairro ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {e.lideranca?.nome ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="secondary" className="font-normal">{e.origem}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {e.tags.slice(0, 2).map((t) => (
                          <Badge key={t.id} className="border-0 bg-primary/10 font-normal text-primary hover:bg-primary/15">
                            {t.nome}
                          </Badge>
                        ))}
                        {e.tags.length > 2 && (
                          <Badge variant="outline" className="font-normal">+{e.tags.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">{pageItems.length}</span> de{" "}
            <span className="font-medium text-foreground">{eleitores.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
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
