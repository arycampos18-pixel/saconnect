import { useEffect, useMemo, useState } from "react";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analiseService } from "../services/analiseService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart3, Trophy, Users, Vote } from "lucide-react";

const sb: any = supabase;

type EleitorAgg = {
  zona: string | null;
  secao: string | null;
  lideranca_id: string | null;
  total: number;
};

export default function AnaliseComparativo() {
  const [ano, setAno] = useState<number>(2024);
  const [turno, setTurno] = useState<number>(1);
  const [uf, setUf] = useState<string>("");
  const [municipio, setMunicipio] = useState<string>("");
  const [cargo, setCargo] = useState<string>("");
  const [numeroCandidato, setNumeroCandidato] = useState<string>("");

  const [resultados, setResultados] = useState<any[]>([]);
  const [eleitores, setEleitores] = useState<any[]>([]);
  const [liderancas, setLiderancas] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    analiseService.listarLiderancas().then((d) => setLiderancas(d as any));
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      const [tse, { data: eleit }] = await Promise.all([
        analiseService.listarResultadosTSE({
          ano_eleicao: ano,
          uf: uf || null,
          cargo: cargo || null,
          municipio: municipio || null,
          numero_candidato: numeroCandidato || null,
        }),
        sb
          .from("eleitores")
          .select("zona_eleitoral,secao_eleitoral,lideranca_id")
          .limit(10000),
      ]);
      const filtTse = (tse as any[]).filter((r) => !turno || r.turno === turno);
      setResultados(filtTse);
      setEleitores(eleit ?? []);
      toast.success(`${filtTse.length} resultados TSE · ${eleit?.length ?? 0} cadastros carregados`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  // Agrega cadastros por zona/seção
  const cadastrosPorSecao = useMemo(() => {
    const map = new Map<string, EleitorAgg>();
    eleitores.forEach((e) => {
      const z = (e.zona_eleitoral ?? "").toString();
      const s = (e.secao_eleitoral ?? "").toString();
      if (!z || !s) return;
      const key = `${z}|${s}`;
      const cur = map.get(key) ?? { zona: z, secao: s, lideranca_id: e.lideranca_id, total: 0 };
      cur.total += 1;
      map.set(key, cur);
    });
    return map;
  }, [eleitores]);

  // Agrega votos TSE por zona/seção (somando candidatos selecionados)
  const votosPorSecao = useMemo(() => {
    const map = new Map<string, number>();
    resultados.forEach((r) => {
      const z = (r.zona_eleitoral ?? "").toString();
      const s = (r.secao_eleitoral ?? "").toString();
      if (!z || !s) return;
      const key = `${z}|${s}`;
      map.set(key, (map.get(key) ?? 0) + (r.votos ?? 0));
    });
    return map;
  }, [resultados]);

  // Tabela comparativa por seção
  const linhas = useMemo(() => {
    const keys = new Set<string>([...cadastrosPorSecao.keys(), ...votosPorSecao.keys()]);
    const lidNome = new Map(liderancas.map((l) => [l.id, l.nome]));
    const out: {
      zona: string;
      secao: string;
      lideranca: string;
      cadastrados: number;
      votos: number;
      diferenca: number;
      compatibilidade: number;
    }[] = [];
    keys.forEach((k) => {
      const [zona, secao] = k.split("|");
      const cad = cadastrosPorSecao.get(k);
      const cadastrados = cad?.total ?? 0;
      const votos = votosPorSecao.get(k) ?? 0;
      const diferenca = votos - cadastrados;
      const denom = Math.max(cadastrados, votos);
      const compatibilidade = denom > 0 ? Math.round((Math.min(cadastrados, votos) / denom) * 100) : 0;
      out.push({
        zona,
        secao,
        lideranca: cad?.lideranca_id ? lidNome.get(cad.lideranca_id) ?? "—" : "—",
        cadastrados,
        votos,
        diferenca,
        compatibilidade,
      });
    });
    out.sort((a, b) => b.votos - a.votos);
    return out;
  }, [cadastrosPorSecao, votosPorSecao, liderancas]);

  // Ranking por liderança
  const ranking = useMemo(() => {
    const lidNome = new Map(liderancas.map((l) => [l.id, l.nome]));
    const map = new Map<string, { id: string; nome: string; cadastrados: number; votos: number }>();
    cadastrosPorSecao.forEach((agg, key) => {
      const lid = agg.lideranca_id ?? "sem";
      const nome = lidNome.get(lid) ?? "Sem liderança";
      const cur = map.get(lid) ?? { id: lid, nome, cadastrados: 0, votos: 0 };
      cur.cadastrados += agg.total;
      cur.votos += votosPorSecao.get(key) ?? 0;
      map.set(lid, cur);
    });
    return Array.from(map.values())
      .map((r) => {
        const denom = Math.max(r.cadastrados, r.votos);
        const compat = denom > 0 ? Math.round((Math.min(r.cadastrados, r.votos) / denom) * 100) : 0;
        return { ...r, diferenca: r.votos - r.cadastrados, compatibilidade: compat };
      })
      .sort((a, b) => b.votos - a.votos);
  }, [cadastrosPorSecao, votosPorSecao, liderancas]);

  const totalCad = linhas.reduce((s, l) => s + l.cadastrados, 0);
  const totalVotos = linhas.reduce((s, l) => s + l.votos, 0);
  const compatGeral = (() => {
    const denom = Math.max(totalCad, totalVotos);
    return denom > 0 ? Math.round((Math.min(totalCad, totalVotos) / denom) * 100) : 0;
  })();

  return (
    <PageShell
      title="Comparativo Pós-Eleição"
      description="Cruzamento entre eleitores cadastrados e votos oficiais do TSE por zona, seção e liderança."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
            <div>
              <Label>Ano</Label>
              <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
            </div>
            <div>
              <Label>Turno</Label>
              <Select value={String(turno)} onValueChange={(v) => setTurno(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1º turno</SelectItem>
                  <SelectItem value="2">2º turno</SelectItem>
                  <SelectItem value="0">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>UF</Label>
              <Input maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label>Município</Label>
              <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Vereador..." />
            </div>
            <div>
              <Label>Nº Candidato</Label>
              <Input value={numeroCandidato} onChange={(e) => setNumeroCandidato(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={carregar} disabled={loading} className="w-full">
                {loading ? "Carregando…" : "Carregar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4" />Cadastrados</div>
          <div className="mt-1 text-2xl font-semibold">{totalCad.toLocaleString("pt-BR")}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Vote className="h-4 w-4" />Votos (TSE)</div>
          <div className="mt-1 text-2xl font-semibold">{totalVotos.toLocaleString("pt-BR")}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="h-4 w-4" />Diferença</div>
          <div className={`mt-1 text-2xl font-semibold ${totalVotos - totalCad >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {(totalVotos - totalCad).toLocaleString("pt-BR")}
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Trophy className="h-4 w-4" />Compatibilidade</div>
          <div className="mt-1 text-2xl font-semibold">{compatGeral}%</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ranking de Lideranças</CardTitle></CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregue os dados para gerar o ranking.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Liderança</TableHead>
                  <TableHead className="text-right">Cadastrados</TableHead>
                  <TableHead className="text-right">Votos</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead className="text-right">Compatibilidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell className="text-right">{r.cadastrados.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{r.votos.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className={`text-right ${r.diferenca >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {r.diferenca.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.compatibilidade >= 70 ? "default" : r.compatibilidade >= 40 ? "secondary" : "outline"}>
                        {r.compatibilidade}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Comparativo por Zona / Seção</CardTitle></CardHeader>
        <CardContent>
          {linhas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem dados. Ajuste os filtros e clique em "Carregar".</p>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zona</TableHead>
                    <TableHead>Seção</TableHead>
                    <TableHead>Liderança</TableHead>
                    <TableHead className="text-right">Cadastrados</TableHead>
                    <TableHead className="text-right">Votos</TableHead>
                    <TableHead className="text-right">Dif.</TableHead>
                    <TableHead className="text-right">Compat.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.slice(0, 500).map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>{l.zona}</TableCell>
                      <TableCell>{l.secao}</TableCell>
                      <TableCell>{l.lideranca}</TableCell>
                      <TableCell className="text-right">{l.cadastrados}</TableCell>
                      <TableCell className="text-right">{l.votos}</TableCell>
                      <TableCell className={`text-right ${l.diferenca >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{l.diferenca}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={l.compatibilidade >= 70 ? "default" : l.compatibilidade >= 40 ? "secondary" : "outline"}>
                          {l.compatibilidade}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}