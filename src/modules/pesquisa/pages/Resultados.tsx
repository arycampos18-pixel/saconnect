import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart2, Download, Loader2, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { pesquisaService, type Pergunta, type Pesquisa, type Resposta } from "../services/pesquisaService";
import { CompartilharDialog } from "../components/CompartilharDialog";
import { formatPhoneBR } from "@/shared/utils/phone";

const VBarChart = lazy(() =>
  import("@/shared/components/charts/VBarChart").then((m) => ({ default: m.VBarChart })),
);
const DonutChart = lazy(() =>
  import("@/shared/components/charts/DonutChart").then((m) => ({ default: m.DonutChart })),
);

export default function Resultados() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await pesquisaService.get(id);
        if (!data) { toast.error("Pesquisa não encontrada."); navigate("/app/pesquisas"); return; }
        setPesquisa(data.pesquisa);
        setPerguntas(data.perguntas);
        setRespostas(await pesquisaService.respostas(id));
      } catch (e: any) { toast.error(e.message ?? "Erro"); }
      finally { setLoading(false); }
    })();
  }, [id, navigate]);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!pesquisa) return null;

  const sessoes = new Set(respostas.map((r) => r.sessao_id)).size;

  function exportarCSV() {
    const rows = [["Nome", "Telefone", "Pergunta", "Resposta", "Data"]];
    respostas.forEach((r) => {
      const p = perguntas.find((pp) => pp.id === r.pergunta_id);
      rows.push([
        r.participante_nome ?? "",
        formatPhoneBR(r.participante_telefone ?? ""),
        p?.texto ?? "",
        r.resposta,
        new Date(r.created_at).toLocaleString("pt-BR"),
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pesquisa-${pesquisa!.slug}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/pesquisas")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              <BarChart2 className="h-7 w-7 text-primary" /> {pesquisa.titulo}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline">{pesquisa.tipo}</Badge>
              <Badge className={pesquisa.status === "Ativa" ? "bg-primary text-primary-foreground" : ""}>{pesquisa.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {pesquisa.status === "Ativa" && (
            <Button variant="outline" onClick={() => setShare(true)}><Share2 className="mr-2 h-4 w-4" />Compartilhar</Button>
          )}
          <Button variant="outline" onClick={exportarCSV} disabled={respostas.length === 0}>
            <Download className="mr-2 h-4 w-4" />Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <p className="text-sm text-muted-foreground">Total de respostas</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{sessoes}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <p className="text-sm text-muted-foreground">Perguntas</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{perguntas.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <p className="text-sm text-muted-foreground">Respostas totais</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{respostas.length}</p>
        </div>
      </div>

      <div className="space-y-6">
        {perguntas.map((p, idx) => {
          const respostasPergunta = respostas.filter((r) => r.pergunta_id === p.id);
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-foreground">{idx + 1}. {p.texto}</h3>
                <span className="text-xs text-muted-foreground">{respostasPergunta.length} resposta(s)</span>
              </div>
              {respostasPergunta.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem respostas ainda.</p>
              ) : p.tipo === "aberta" ? (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {respostasPergunta.map((r) => (
                    <div key={r.id} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{r.resposta}</div>
                  ))}
                </div>
              ) : (
                <Grafico
                  tipo={p.tipo === "multipla_varias" ? "barras" : (idx % 2 === 0 ? "barras" : "pizza")}
                  respostas={respostasPergunta}
                  opcoes={p.tipo === "sim_nao" ? ["Sim", "Não"] : (p.opcoes ?? [])}
                  multi={p.tipo === "multipla_varias"}
                />
              )}
            </div>
          );
        })}
      </div>

      <ParticipantesCard respostas={respostas} perguntas={perguntas} />

      <CompartilharDialog pesquisa={pesquisa} open={share} onOpenChange={setShare} />
    </div>
  );
}

function Grafico({
  tipo, respostas, opcoes, multi,
}: { tipo: "barras" | "pizza"; respostas: Resposta[]; opcoes: string[]; multi?: boolean }) {
  const counts: Record<string, number> = {};
  opcoes.forEach((o) => (counts[o] = 0));
  respostas.forEach((r) => {
    const partes = multi ? r.resposta.split("|").filter(Boolean) : [r.resposta];
    partes.forEach((parte) => { counts[parte] = (counts[parte] ?? 0) + 1; });
  });
  const data = Object.entries(counts).map(([label, value]) => ({ label, value }));
  const fallback = (
    <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
      Renderizando…
    </div>
  );
  if (tipo === "pizza") {
    return (
      <Suspense fallback={fallback}>
        <DonutChart data={data} height={280} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={fallback}>
      <VBarChart data={data} height={260} />
    </Suspense>
  );
}

function ParticipantesCard({ respostas, perguntas }: { respostas: Resposta[]; perguntas: Pergunta[] }) {
  // group by sessao_id
  const sessoes = new Map<string, { nome: string; telefone: string; data: string; respostas: Resposta[] }>();
  respostas.forEach((r) => {
    const key = r.sessao_id;
    const cur = sessoes.get(key);
    if (cur) {
      cur.respostas.push(r);
    } else {
      sessoes.set(key, {
        nome: r.participante_nome ?? "—",
        telefone: r.participante_telefone ? formatPhoneBR(r.participante_telefone) : "—",
        data: r.created_at,
        respostas: [r],
      });
    }
  });
  const lista = Array.from(sessoes.values()).sort((a, b) => +new Date(b.data) - +new Date(a.data));

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Participantes ({lista.length})</h3>
      </div>
      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguém respondeu ainda.</p>
      ) : (
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Telefone</th>
                <th className="py-2 pr-3">Data</th>
                <th className="py-2">Respostas</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s, i) => (
                <tr key={i} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-3 font-medium">{s.nome}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{s.telefone}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{new Date(s.data).toLocaleString("pt-BR")}</td>
                  <td className="py-2">
                    <ul className="space-y-1">
                      {s.respostas.map((r) => {
                        const p = perguntas.find((pp) => pp.id === r.pergunta_id);
                        return (
                          <li key={r.id} className="text-xs">
                            <span className="text-muted-foreground">{p?.texto ?? "—"}: </span>
                            <span className="font-medium">{r.resposta.replace(/\|/g, ", ")}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
