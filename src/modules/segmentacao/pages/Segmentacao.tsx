import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, RefreshCw, Download, Users, Filter } from "lucide-react";
import { toast } from "sonner";
import { segmentacaoService, type Segmento } from "../services/segmentacaoService";
import { SegmentoFormDialog } from "../components/SegmentoFormDialog";
import { exportarCSV } from "@/modules/executivo/services/executivoService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Segmentacao() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Segmento | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      setSegmentos(await segmentacaoService.listar());
    } catch (e: any) {
      toast.error("Erro ao carregar", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const recalcular = async (s: Segmento) => {
    try {
      const total = await segmentacaoService.atualizarTotal(s.id, s.filtros);
      toast.success(`Atualizado: ${total} eleitores`);
      carregar();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    }
  };

  const exportar = async (s: Segmento) => {
    try {
      const eleitores = await segmentacaoService.preview(s.filtros);
      if (!eleitores.length) { toast.warning("Segmento vazio"); return; }
      exportarCSV(`segmento-${s.nome.toLowerCase().replace(/\s+/g, "-")}.csv`, eleitores.map((e: any) => ({
        nome: e.nome,
        telefone: e.telefone,
        email: e.email,
        bairro: e.bairro,
        cidade: e.cidade,
      })));
      toast.success(`${eleitores.length} eleitores exportados`);
    } catch (e: any) {
      toast.error("Erro ao exportar", { description: e.message });
    }
  };

  const remover = async (id: string) => {
    if (!confirm("Remover este segmento?")) return;
    await segmentacaoService.remover(id);
    toast.success("Segmento removido");
    carregar();
  };

  const editar = (s: Segmento) => { setEditing(s); setOpen(true); };
  const novo = () => { setEditing(null); setOpen(true); };

  const descreverFiltros = (s: Segmento) => {
    const f = s.filtros ?? {};
    const partes: string[] = [];
    if (f.bairros?.length) partes.push(`${f.bairros.length} bairro(s)`);
    if (f.cidades?.length) partes.push(`${f.cidades.length} cidade(s)`);
    if (f.tags?.length) partes.push(`${f.tags.length} tag(s)`);
    if (f.origens?.length) partes.push(`origem`);
    if (f.generos?.length) partes.push(`gênero`);
    if (f.idadeMin != null || f.idadeMax != null) partes.push(`idade`);
    if (f.comTelefone != null) partes.push(`telefone`);
    if (f.comEmail != null) partes.push(`email`);
    if (f.consentimentoLgpd != null) partes.push(`LGPD`);
    if (f.liderancaIds?.length) partes.push(`liderança`);
    if (f.caboIds?.length) partes.push(`cabo`);
    return partes.length ? partes.join(" · ") : "Sem filtros (todos os eleitores)";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Segmentação Avançada</h1>
          <p className="text-sm text-muted-foreground">Crie segmentos dinâmicos combinando múltiplos filtros.</p>
        </div>
        <Button onClick={novo}><Plus className="mr-2 h-4 w-4" /> Novo segmento</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : segmentos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum segmento criado ainda.</p>
            <Button className="mt-4" onClick={novo}>Criar primeiro segmento</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {segmentos.map((s) => (
            <Card key={s.id} style={{ borderTop: `3px solid ${s.cor}` }}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{s.nome}</CardTitle>
                    {s.descricao && <CardDescription className="line-clamp-2">{s.descricao}</CardDescription>}
                  </div>
                  <Badge variant="outline" className="gap-1 shrink-0">
                    <Users className="h-3 w-3" /> {s.total_cache}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{descreverFiltros(s)}</p>
                {s.ultima_atualizacao && (
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Atualizado em {format(new Date(s.ultima_atualizacao), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => recalcular(s)}><RefreshCw className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => exportar(s)}><Download className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => editar(s)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => remover(s.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SegmentoFormDialog open={open} onOpenChange={setOpen} segmento={editing} onSaved={carregar} />
    </div>
  );
}