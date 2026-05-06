import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { disparosService } from "../services/disparosService";

export default function DisparoConfig() {
  const [c, setC] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => disparosService.obterConfig().then(setC).catch((e) => toast.error("Erro", { description: e.message }));
  useEffect(() => { load(); }, []);

  const salvar = async () => {
    if (!c) return;
    if (c.intervalo_max_segundos < c.intervalo_min_segundos) {
      toast.error("Cadência máxima deve ser ≥ mínima"); return;
    }
    setSaving(true);
    try {
      await disparosService.salvarConfig(c.id, {
        intervalo_min_segundos: c.intervalo_min_segundos,
        intervalo_max_segundos: c.intervalo_max_segundos,
        lote_padrao: c.lote_padrao,
        janela_inicio: c.janela_inicio,
        janela_fim: c.janela_fim,
        pausa_a_cada: c.pausa_a_cada,
        pausa_segundos: c.pausa_segundos,
        limite_diario: c.limite_diario,
        saudacao_padrao: c.saudacao_padrao,
        falar_nome_padrao: c.falar_nome_padrao,
      });
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e.message });
    } finally { setSaving(false); }
  };

  if (!c) return <div className="p-6"><p className="text-sm text-muted-foreground">Carregando...</p></div>;

  const set = (k: string, v: any) => setC({ ...c, [k]: v });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost"><Link to="/app/disparos"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Configurações de disparo</h1>
          <p className="text-sm text-muted-foreground">Padrões anti-ban aplicados a novos disparos.</p>
        </div>
        <Button onClick={salvar} disabled={saving}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> Cadência (anti-banimento)</CardTitle>
          <CardDescription>Tempo entre cada mensagem é randomizado entre os valores mínimo e máximo para parecer humano.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div><Label>Cadência mínima (s)</Label><Input type="number" min={1} value={c.intervalo_min_segundos} onChange={(e) => set("intervalo_min_segundos", +e.target.value)} /></div>
          <div><Label>Cadência máxima (s)</Label><Input type="number" min={1} value={c.intervalo_max_segundos} onChange={(e) => set("intervalo_max_segundos", +e.target.value)} /></div>
          <div><Label>Lote por execução</Label><Input type="number" min={1} max={200} value={c.lote_padrao} onChange={(e) => set("lote_padrao", +e.target.value)} /></div>
          <div><Label>Pausar a cada</Label><Input type="number" min={0} value={c.pausa_a_cada} onChange={(e) => set("pausa_a_cada", +e.target.value)} /><p className="text-[10px] text-muted-foreground">mensagens (0 = off)</p></div>
          <div><Label>Duração da pausa (s)</Label><Input type="number" min={0} value={c.pausa_segundos} onChange={(e) => set("pausa_segundos", +e.target.value)} /></div>
          <div><Label>Limite diário</Label><Input type="number" min={0} value={c.limite_diario} onChange={(e) => set("limite_diario", +e.target.value)} /><p className="text-[10px] text-muted-foreground">0 = ilimitado</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Janela de envio padrão</CardTitle>
          <CardDescription>Disparos só executam dentro deste horário (UTC-3).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div><Label>Início</Label><Input type="time" value={(c.janela_inicio ?? "").slice(0, 5)} onChange={(e) => set("janela_inicio", e.target.value)} /></div>
          <div><Label>Fim</Label><Input type="time" value={(c.janela_fim ?? "").slice(0, 5)} onChange={(e) => set("janela_fim", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personalização padrão</CardTitle>
          <CardDescription>Aplicado por padrão em novos disparos (pode ser desativado por campanha).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between rounded border p-3">
            <div><p className="font-medium text-sm">Adicionar saudação</p><p className="text-xs text-muted-foreground">Inclui "Bom dia/Boa tarde/Boa noite" automaticamente.</p></div>
            <Switch checked={c.saudacao_padrao} onCheckedChange={(v) => set("saudacao_padrao", v)} />
          </label>
          <label className="flex items-center justify-between rounded border p-3">
            <div><p className="font-medium text-sm">Falar o nome</p><p className="text-xs text-muted-foreground">Adiciona o primeiro nome no início da mensagem.</p></div>
            <Switch checked={c.falar_nome_padrao} onCheckedChange={(v) => set("falar_nome_padrao", v)} />
          </label>
        </CardContent>
      </Card>
    </div>
  );
}