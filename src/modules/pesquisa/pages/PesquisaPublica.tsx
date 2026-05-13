import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2, Loader2, Vote, Phone, User,
  MessageCircle, KeyRound, ArrowLeft, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { pesquisaService, type Pergunta, type Pesquisa } from "../services/pesquisaService";
import { formatPhoneBR } from "@/shared/utils/phone";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Cliente anon — sem JWT, contorna RESTRICTIVE policy tenant_active_company_guard
const anonSb = createClient(SUPABASE_URL, SUPABASE_KEY) as any;

type Etapa = "identificacao" | "codigo" | "pesquisa";

export default function PesquisaPublica() {
  const { slug } = useParams<{ slug: string }>();

  // Estado da pesquisa
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);

  // Fluxo de verificação
  const [etapa, setEtapa] = useState<Etapa>("identificacao");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [telMascarado, setTelMascarado] = useState("");
  const [codigo, setCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);

  // Formulário da pesquisa
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // ── Carregar pesquisa ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const { data: rpcData, error: rpcErr } = await anonSb
          .rpc("public_get_pesquisa_by_code", { _code: slug });
        if (!rpcErr && rpcData?.encontrado) {
          setPesquisa(rpcData.pesquisa);
          setPerguntas(rpcData.perguntas ?? []);
          return;
        }
        let found: any = null;
        for (const q of [
          anonSb.from("pesquisas").select("*").eq("status", "Ativa").eq("short_code", slug).maybeSingle(),
          anonSb.from("pesquisas").select("*").eq("status", "Ativa").eq("slug", slug).maybeSingle(),
          anonSb.from("pesquisas").select("*").eq("status", "Ativa").like("slug", `${slug}%`).limit(1).maybeSingle(),
        ]) {
          const { data: d } = await q;
          if (d) { found = d; break; }
        }
        if (!found) return;
        const { data: pergs } = await anonSb.from("pesquisa_perguntas").select("*")
          .eq("pesquisa_id", found.id).order("ordem");
        setPesquisa(found as Pesquisa);
        setPerguntas((pergs ?? []).map((p: any) => ({ ...p, opcoes: p.opcoes ?? null })) as Pergunta[]);
      } finally { setLoading(false); }
    })();
  }, [slug]);

  // ── Etapa 1: Enviar OTP ────────────────────────────────────────────────────
  const enviarOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Informe seu nome"); return; }
    const tel = telefone.replace(/\D/g, "");
    if (tel.length < 10) { toast.error("Informe um WhatsApp válido com DDD"); return; }
    setEnviando(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/public-enviar-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
        body: JSON.stringify({ telefone: tel, nome: nome.trim() }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok || !data.ok) {
        toast.error(String(data.error ?? "Falha ao enviar código. Verifique o número."));
        return;
      }
      setOtpId(data.id as string);
      setTelMascarado(data.telefone_mascarado as string ?? `(${tel.slice(0,2)}) ****-${tel.slice(-4)}`);
      setEtapa("codigo");
      toast.success("Código enviado! Verifique seu WhatsApp.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro de rede");
    } finally { setEnviando(false); }
  };

  // ── Etapa 2: Verificar OTP ─────────────────────────────────────────────────
  const verificarOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpId || codigo.replace(/\D/g, "").length !== 6) {
      toast.error("Informe os 6 dígitos do código"); return;
    }
    setVerificando(true);
    try {
      const { data, error } = await anonSb.rpc("public_verificar_otp", {
        _id: otpId,
        _codigo: codigo.trim(),
      });
      if (error || !data?.ok) {
        toast.error(data?.error ?? error?.message ?? "Código incorreto");
        return;
      }
      setEtapa("pesquisa");
      toast.success("WhatsApp verificado! Preencha a pesquisa.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao verificar");
    } finally { setVerificando(false); }
  };

  // ── Etapa 3: Submeter pesquisa ─────────────────────────────────────────────
  const enviarPesquisa = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const p of perguntas) {
      if (!respostas[p.id]?.trim()) { toast.error(`Responda: ${p.texto}`); return; }
    }
    setSubmitting(true);
    try {
      const sessaoId = crypto.randomUUID();
      const respostasArr = perguntas.map((p) => ({
        pergunta_id: p.id, resposta: respostas[p.id].trim(),
      }));
      const tel = telefone.replace(/\D/g, "");

      const { data: rpcData, error: rpcErr } = await anonSb.rpc("public_submit_pesquisa", {
        _pesquisa_id: pesquisa!.id,
        _sessao_id: sessaoId,
        _nome: nome.trim(),
        _telefone: tel,
        _respostas: respostasArr,
      });
      if (!rpcErr && rpcData?.ok) { setDone(true); return; }

      // Fallback inserção direta
      const { data: jaVotou } = await anonSb.rpc("pesquisa_ja_respondeu", {
        _pesquisa_id: pesquisa!.id, _telefone: tel,
      });
      if (jaVotou) throw new Error("Este WhatsApp já respondeu a esta pesquisa.");
      const payload = respostasArr.map((r) => ({
        pesquisa_id: pesquisa!.id, pergunta_id: r.pergunta_id, resposta: r.resposta,
        sessao_id: sessaoId, participante_nome: nome.trim(),
        participante_telefone: tel,
      }));
      const { error: insErr } = await anonSb.from("pesquisa_respostas").insert(payload);
      if (insErr) throw insErr;
      setDone(true);
    } catch (err: any) { toast.error(err.message ?? "Erro ao enviar."); }
    finally { setSubmitting(false); }
  };

  function toggleMulti(perguntaId: string, opcao: string) {
    const atual = (respostas[perguntaId] ?? "").split("|").filter(Boolean);
    const idx = atual.indexOf(opcao);
    if (idx >= 0) atual.splice(idx, 1); else atual.push(opcao);
    setRespostas({ ...respostas, [perguntaId]: atual.join("|") });
  }

  // ── Renders ────────────────────────────────────────────────────────────────
  const Header = () => (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
        <Vote className="h-5 w-5 text-primary-foreground" />
      </div>
      <span className="text-sm font-bold tracking-[0.22em] text-foreground">S A CONNECT</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!pesquisa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent/30 px-4">
        <div className="rounded-xl border bg-card p-8 text-center shadow-elegant-sm">
          <p className="text-lg font-semibold text-foreground">Pesquisa não disponível</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta pesquisa não está mais ativa ou o link é inválido.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent/30 px-4">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-elegant-sm">
          <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-primary" />
          <p className="text-xl font-bold text-foreground">Obrigado, {nome.split(" ")[0]}!</p>
          <p className="mt-2 text-muted-foreground">Sua resposta foi registrada com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent/30 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Header />

        {/* ── ETAPA 1: Identificação ────────────────────────────────────────── */}
        {etapa === "identificacao" && (
          <div className="rounded-xl border bg-card p-6 shadow-elegant-sm sm:p-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
              <h1 className="text-xl font-bold text-foreground">{pesquisa.titulo}</h1>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Para participar, informe seu nome e número de WhatsApp. Enviaremos um código para verificar sua identidade.
            </p>

            <form onSubmit={enviarOtp} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="id-nome">Seu nome completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="id-nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                    className="pl-9 h-11"
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="id-tel">WhatsApp (com DDD) *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="id-tel"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
                    placeholder="(67) 9 8765-4321"
                    className="pl-9 h-11"
                    inputMode="numeric"
                    maxLength={16}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={enviando}>
                {enviando
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando código…</>
                  : <><MessageCircle className="mr-2 h-4 w-4" /> Enviar código no WhatsApp</>}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Shield className="inline h-3 w-3 mr-1" />
              Seus dados são usados apenas para identificar sua participação.
            </p>
          </div>
        )}

        {/* ── ETAPA 2: Verificação de código ───────────────────────────────── */}
        {etapa === "codigo" && (
          <div className="rounded-xl border bg-card p-6 shadow-elegant-sm sm:p-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
              <h2 className="text-xl font-bold text-foreground">Verificar WhatsApp</h2>
            </div>

            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800">
                <MessageCircle className="inline h-4 w-4 mr-1" />
                Enviamos um código de 6 dígitos para o número{" "}
                <strong>{telMascarado}</strong>. Verifique seu WhatsApp.
              </p>
            </div>

            <form onSubmit={verificarOtp} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="otp-codigo">Código de verificação *</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="otp-codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="pl-9 h-11 text-xl tracking-[0.5em] font-mono text-center"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Digite os 6 dígitos recebidos no WhatsApp</p>
              </div>

              <Button type="submit" className="w-full h-11" disabled={verificando || codigo.length !== 6}>
                {verificando
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando…</>
                  : <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar e entrar</>}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setEtapa("identificacao"); setCodigo(""); setOtpId(null); }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Alterar número
              </Button>
            </form>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              Não recebeu? Aguarde até 1 minuto ou volte e tente novamente.
            </p>
          </div>
        )}

        {/* ── ETAPA 3: Formulário da pesquisa ─────────────────────────────── */}
        {etapa === "pesquisa" && (
          <div className="rounded-xl border bg-card p-6 shadow-elegant-sm sm:p-8">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
              <h1 className="text-xl font-bold text-foreground">{pesquisa.titulo}</h1>
            </div>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-700">
                WhatsApp verificado: <strong>{nome}</strong> — {telMascarado}
              </span>
            </div>

            <form onSubmit={enviarPesquisa} className="space-y-6">
              {perguntas.map((p, idx) => (
                <div key={p.id} className="space-y-3">
                  <Label className="text-base font-medium">
                    {idx + 1}. {p.texto}
                  </Label>
                  {p.tipo === "aberta" ? (
                    <Textarea
                      value={respostas[p.id] ?? ""}
                      onChange={(e) => setRespostas({ ...respostas, [p.id]: e.target.value })}
                      maxLength={500} rows={3}
                    />
                  ) : p.tipo === "multipla_varias" ? (
                    <div className="space-y-2">
                      {(p.opcoes ?? []).map((op) => {
                        const marcadas = (respostas[p.id] ?? "").split("|").filter(Boolean);
                        return (
                          <div key={op} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent/40">
                            <Checkbox
                              id={`${p.id}-${op}`}
                              checked={marcadas.includes(op)}
                              onCheckedChange={() => toggleMulti(p.id, op)}
                            />
                            <Label htmlFor={`${p.id}-${op}`} className="flex-1 cursor-pointer font-normal">{op}</Label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <RadioGroup
                      value={respostas[p.id] ?? ""}
                      onValueChange={(v) => setRespostas({ ...respostas, [p.id]: v })}
                    >
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

              <Button type="submit" className="w-full h-11" size="lg" disabled={submitting}>
                {submitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</>
                  : "Enviar respostas"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
