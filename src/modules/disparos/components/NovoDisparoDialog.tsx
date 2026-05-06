import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { segmentacaoService, type Segmento } from "@/modules/segmentacao/services/segmentacaoService";
import { disparosService } from "../services/disparosService";
import { Hand, Smile } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void; }

export function NovoDisparoDialog({ open, onOpenChange, onCreated }: Props) {
  const nav = useNavigate();
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [templates, setTemplates] = useState<{ id: string; nome: string; conteudo: string }[]>([]);
  const [nome, setNome] = useState("");
  const [template, setTemplate] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [segmentoId, setSegmentoId] = useState("");
  const [apenasLgpd, setApenasLgpd] = useState(true);
  const [respeitarOptout, setRespeitarOptout] = useState(true);
  const [evitarHoras, setEvitarHoras] = useState(24);
  const [cadInicial, setCadInicial] = useState(120);
  const [cadFinal, setCadFinal] = useState(300);
  const [lote, setLote] = useState(20);
  const [pausaA, setPausaA] = useState(50);
  const [pausaSeg, setPausaSeg] = useState(600);
  const [limiteDia, setLimiteDia] = useState(500);
  const [janelaInicio, setJanelaInicio] = useState("");
  const [janelaFim, setJanelaFim] = useState("");
  const [agendado, setAgendado] = useState("");
  const [agendadoFim, setAgendadoFim] = useState("");
  const [falarNome, setFalarNome] = useState(true);
  const [saudacao, setSaudacao] = useState(true);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (!open) return;
    segmentacaoService.listar().then(setSegmentos);
    disparosService.listarTemplates().then(setTemplates);
    disparosService.obterConfig().then((c) => {
      if (!c) return;
      setCadInicial(c.intervalo_min_segundos ?? 120);
      setCadFinal(c.intervalo_max_segundos ?? 300);
      setLote(c.lote_padrao ?? 20);
      setPausaA(c.pausa_a_cada ?? 50);
      setPausaSeg(c.pausa_segundos ?? 600);
      setLimiteDia(c.limite_diario ?? 500);
      setJanelaInicio((c.janela_inicio ?? "").slice(0, 5));
      setJanelaFim((c.janela_fim ?? "").slice(0, 5));
      setSaudacao(!!c.saudacao_padrao);
      setFalarNome(!!c.falar_nome_padrao);
    });
    setNome(""); setTemplate(""); setTemplateId(""); setSegmentoId("");
    setApenasLgpd(true); setRespeitarOptout(true); setEvitarHoras(24);
    setAgendado(""); setAgendadoFim("");
  }, [open]);

  useEffect(() => {
    if (!templateId) return;
    const t = templates.find((x) => x.id === templateId);
    if (t) setTemplate(t.conteudo);
  }, [templateId]);

  const criar = async (iniciar: boolean) => {
    if (!nome.trim() || !template.trim() || !segmentoId) {
      toast.error("Preencha nome, segmento e mensagem"); return;
    }
    if (cadFinal < cadInicial) { toast.error("Cadência final deve ser maior ou igual à inicial"); return; }
    setCriando(true);
    try {
      const { id, total } = await disparosService.criar({
        nome, template, segmento_id: segmentoId,
        apenas_lgpd: apenasLgpd, respeitar_optout: respeitarOptout,
        evitar_duplicatas_horas: evitarHoras,
        intervalo_min_segundos: cadInicial,
        intervalo_max_segundos: cadFinal,
        lote_tamanho: lote,
        janela_inicio: janelaInicio || null, janela_fim: janelaFim || null,
        agendado_para: agendado ? new Date(agendado).toISOString() : null,
        agendado_fim: agendadoFim ? new Date(agendadoFim).toISOString() : null,
        template_id: templateId || null,
        instancia_id: null,
        prepend_saudacao: saudacao,
        prepend_nome: falarNome,
        pausa_a_cada: pausaA,
        pausa_segundos: pausaSeg,
        limite_diario: limiteDia,
      });
      toast.success(`Disparo criado com ${total} destinatários`);
      onOpenChange(false); onCreated();
      if (iniciar && total > 0) {
        await disparosService.iniciar(id);
        toast.success("Disparo iniciado");
      }
      nav(`/app/disparos/${id}`);
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    } finally {
      setCriando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastro de Campanha WhatsApp</DialogTitle>
          <p className="text-xs text-muted-foreground">Configure cadência, janela e personalização para evitar banimento.</p>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome da campanha *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da campanha" /></div>
            <div>
              <Label>Lista (segmento alvo) *</Label>
              <Select value={segmentoId} onValueChange={setSegmentoId}>
                <SelectTrigger><SelectValue placeholder="Selecione a Lista" /></SelectTrigger>
                <SelectContent>
                  {segmentos.map((s) => (<SelectItem key={s.id} value={s.id}>{s.nome} ({s.total_cache})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_140px_140px] md:items-end">
            <div>
              <Label>Modelo de mensagem</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Selecione um modelo (opcional)" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (<SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <ToggleSquare label="Falar nome" icon={Hand} checked={falarNome} onChange={setFalarNome} />
            <ToggleSquare label="Saudação" icon={Smile} checked={saudacao} onChange={setSaudacao} />
            <div>
              <Label>Cadência inicial *</Label>
              <Input type="number" min={1} value={cadInicial} onChange={(e) => setCadInicial(+e.target.value)} />
              <p className="text-[10px] text-muted-foreground">segundos (mín)</p>
            </div>
            <div>
              <Label>Cadência final *</Label>
              <Input type="number" min={1} value={cadFinal} onChange={(e) => setCadFinal(+e.target.value)} />
              <p className="text-[10px] text-muted-foreground">segundos (máx)</p>
            </div>
          </div>

          <div>
            <Label>Mensagem * <span className="text-xs text-muted-foreground">(use {"{nome}"} e {"{primeiro_nome}"})</span></Label>
            <Textarea rows={5} value={template} onChange={(e) => setTemplate(e.target.value)} placeholder="Olá {primeiro_nome}, ..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Agendar início</Label>
              <Input type="datetime-local" value={agendado} onChange={(e) => setAgendado(e.target.value)} />
            </div>
            <div>
              <Label>Agendar final</Label>
              <Input type="datetime-local" value={agendadoFim} onChange={(e) => setAgendadoFim(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-sm font-semibold">Anti-ban e controles avançados</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Lote / execução</Label><Input type="number" min={1} max={200} value={lote} onChange={(e) => setLote(+e.target.value)} /></div>
              <div><Label>Pausar a cada</Label><Input type="number" min={0} value={pausaA} onChange={(e) => setPausaA(+e.target.value)} /><p className="text-[10px] text-muted-foreground">mensagens (0 = off)</p></div>
              <div><Label>Pausa longa (s)</Label><Input type="number" min={0} value={pausaSeg} onChange={(e) => setPausaSeg(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Limite diário</Label><Input type="number" min={0} value={limiteDia} onChange={(e) => setLimiteDia(+e.target.value)} /><p className="text-[10px] text-muted-foreground">0 = ilimitado</p></div>
              <div><Label>Janela início</Label><Input type="time" value={janelaInicio} onChange={(e) => setJanelaInicio(e.target.value)} /></div>
              <div><Label>Janela fim</Label><Input type="time" value={janelaFim} onChange={(e) => setJanelaFim(e.target.value)} /></div>
            </div>
            <div>
              <Label>Anti-duplicata (horas)</Label>
              <Input type="number" min={0} value={evitarHoras} onChange={(e) => setEvitarHoras(+e.target.value)} className="max-w-[160px]" />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm"><Switch checked={apenasLgpd} onCheckedChange={setApenasLgpd} /> Apenas com LGPD</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={respeitarOptout} onCheckedChange={setRespeitarOptout} /> Respeitar opt-out</label>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="secondary" disabled={criando} onClick={() => criar(false)}>Salvar rascunho</Button>
          <Button disabled={criando} onClick={() => criar(true)}>Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleSquare({ label, icon: Icon, checked, onChange }: { label: string; icon: any; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 transition-colors ${checked ? "border-primary bg-primary/5 text-primary" : "border-muted text-muted-foreground"}`}>
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}