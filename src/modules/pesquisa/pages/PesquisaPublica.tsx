import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Loader2, Vote } from "lucide-react";
import { toast } from "sonner";
import { pesquisaService, type Pergunta, type Pesquisa } from "../services/pesquisaService";
import { formatPhoneBR, isValidPhoneBR } from "@/shared/utils/phone";

// Cliente SEM JWT — usa role 'anon', contorna a política RESTRICTIVE tenant_active_company_guard
// que bloqueia utilizadores autenticados de acederem a dados de outras empresas.
const anonSb = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
) as any;

export default function PesquisaPublica() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        // 1) Tenta via RPC SECURITY DEFINER (sem JWT, bypassa RLS)
        const { data: rpcData, error: rpcErr } = await anonSb
          .rpc("public_get_pesquisa_by_code", { _code: slug });
        if (!rpcErr && rpcData?.encontrado) {
          setPesquisa(rpcData.pesquisa);
          setPerguntas(rpcData.perguntas ?? []);
          return;
        }

        // 2) Fallback direto com cliente anon (sem JWT = sem RESTRICTIVE policy)
        //    Tenta: short_code exato → slug exato → slug LIKE prefix
        let found: any = null;
        const tentativas = [
          anonSb.from("pesquisas").select("*").eq("status", "Ativa").eq("short_code", slug).maybeSingle(),
          anonSb.from("pesquisas").select("*").eq("status", "Ativa").eq("slug", slug).maybeSingle(),
          anonSb.from("pesquisas").select("*").eq("status", "Ativa").like("slug", `${slug}%`).limit(1).maybeSingle(),
        ];
        for (const q of tentativas) {
          const { data: d } = await q;
          if (d) { found = d; break; }
        }
        if (!found) { setLoading(false); return; }

        const { data: pergs } = await anonSb
          .from("pesquisa_perguntas")
          .select("*")
          .eq("pesquisa_id", found.id)
          .order("ordem");

        setPesquisa(found as Pesquisa);
        setPerguntas((pergs ?? []).map((p: any) => ({ ...p, opcoes: p.opcoes ?? null })) as Pergunta[]);
      } finally { setLoading(false); }
    })();
  }, [slug]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!pesquisa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent/30 px-4">
        <div className="rounded-xl border bg-card p-8 text-center shadow-elegant-sm">
          <p className="text-lg font-semibold text-foreground">Pesquisa não disponível</p>
          <p className="mt-2 text-sm text-muted-foreground">Esta pesquisa não está mais ativa ou o link é inválido.</p>
        </div>
      </div>
    );
  }
  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent/30 px-4">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-elegant-sm">
          <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-primary" />
          <p className="text-xl font-bold text-foreground">Obrigado!</p>
          <p className="mt-2 text-muted-foreground">Sua resposta foi registrada.</p>
        </div>
      </div>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Informe seu nome."); return; }
    if (!isValidPhoneBR(telefone)) { toast.error("Informe um telefone válido com DDD."); return; }
    for (const p of perguntas) {
      if (!respostas[p.id]?.trim()) { toast.error(`Responda: ${p.texto}`); return; }
    }
    setSubmitting(true);
    try {
      const sessaoId = crypto.randomUUID();
      const respostasArr = perguntas.map((p) => ({
        pergunta_id: p.id,
        resposta: respostas[p.id].trim(),
      }));

      // Tenta via RPC pública (sem JWT)
      const { data: rpcData, error: rpcErr } = await anonSb.rpc(
        "public_submit_pesquisa",
        {
          _pesquisa_id: pesquisa!.id,
          _sessao_id:   sessaoId,
          _nome:        nome.trim(),
          _telefone:    telefone.trim(),
          _respostas:   respostasArr,
        }
      );
      if (!rpcErr && rpcData?.ok) { setDone(true); return; }

      // Fallback: inserção direta via anon (se RPC não existir ainda)
      const { data: jaVotou } = await anonSb.rpc("pesquisa_ja_respondeu", {
        _pesquisa_id: pesquisa!.id,
        _telefone: telefone.trim(),
      });
      if (jaVotou) throw new Error("Este telefone já respondeu a esta pesquisa.");
      const payload = respostasArr.map((r) => ({
        pesquisa_id: pesquisa!.id,
        pergunta_id: r.pergunta_id,
        resposta: r.resposta,
        sessao_id: sessaoId,
        participante_nome: nome.trim(),
        participante_telefone: telefone.trim(),
      }));
      const { error: insErr } = await anonSb.from("pesquisa_respostas").insert(payload);
      if (insErr) throw insErr;
      setDone(true);
    } catch (err: any) { toast.error(err.message ?? "Erro ao enviar."); }
    finally { setSubmitting(false); }
  }

  function toggleMulti(perguntaId: string, opcao: string) {
    const atual = (respostas[perguntaId] ?? "").split("|").filter(Boolean);
    const idx = atual.indexOf(opcao);
    if (idx >= 0) atual.splice(idx, 1); else atual.push(opcao);
    setRespostas({ ...respostas, [perguntaId]: atual.join("|") });
  }

  return (
    <div className="min-h-screen bg-accent/30 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary"><Vote className="h-5 w-5 text-primary-foreground" /></div>
          <span className="text-sm font-bold tracking-[0.22em] text-foreground">S A CONNECT</span>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-elegant-sm sm:p-8">
          <h1 className="text-2xl font-bold text-foreground">{pesquisa.titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pesquisa.tipo}</p>

          <form onSubmit={enviar} className="mt-6 space-y-6">
            {perguntas.map((p, idx) => (
              <div key={p.id} className="space-y-3">
                <Label className="text-base font-medium">{idx + 1}. {p.texto}</Label>
                {p.tipo === "aberta" ? (
                  <Textarea value={respostas[p.id] ?? ""} onChange={(e) => setRespostas({ ...respostas, [p.id]: e.target.value })} maxLength={500} rows={3} />
                ) : p.tipo === "multipla_varias" ? (
                  <div className="space-y-2">
                    {(p.opcoes ?? []).map((op) => {
                      const marcadas = (respostas[p.id] ?? "").split("|").filter(Boolean);
                      const checked = marcadas.includes(op);
                      return (
                        <div key={op} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent/40">
                          <Checkbox id={`${p.id}-${op}`} checked={checked} onCheckedChange={() => toggleMulti(p.id, op)} />
                          <Label htmlFor={`${p.id}-${op}`} className="flex-1 cursor-pointer font-normal">{op}</Label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <RadioGroup value={respostas[p.id] ?? ""} onValueChange={(v) => setRespostas({ ...respostas, [p.id]: v })}>
                    {(p.tipo === "sim_nao" ? ["Sim", "Não"] : (p.opcoes ?? [])).map((op) => (
                      <div key={op} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent/40">
                        <RadioGroupItem value={op} id={`${p.id}-${op}`} />
                        <Label htmlFor={`${p.id}-${op}`} className="flex-1 cursor-pointer font-normal">{op}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ))}

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-foreground">Identificação <span className="text-destructive">*</span></p>
              <p className="text-xs text-muted-foreground">Para evitar votos duplicados, precisamos do seu nome e telefone.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="nome" className="text-xs">Seu nome *</Label>
                  <Input id="nome" required placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="tel" className="text-xs">Telefone (WhatsApp) *</Label>
                  <Input
                    id="tel"
                    required
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
                    inputMode="tel"
                    maxLength={16}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar respostas
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
