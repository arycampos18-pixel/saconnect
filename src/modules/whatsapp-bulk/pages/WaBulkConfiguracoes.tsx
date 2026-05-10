import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { waBulkService, type WaBulkConfig } from "../services/waBulkService";
import { WaBulkWebhookCard } from "@/modules/integracoes/components/WaBulkWebhookCard";

const DEFAULT: WaBulkConfig = {
  msgs_limite_diario_padrao: 500,
  msgs_limite_horario_padrao: 50,
  intervalo_min_ms: 8000,
  intervalo_max_ms: 15000,
  horario_inicio: "08:00",
  horario_fim: "20:00",
  dias_permitidos: [1, 2, 3, 4, 5],
  aquecimento_ativo: true,
  aquecimento_dia_1_7: 20,
  aquecimento_dia_8_14: 50,
  aquecimento_dia_15_21: 100,
  aquecimento_dia_22_plus: 200,
  taxa_erro_max_pct: 5,
  cooldown_apos_erro_ms: 60000,
  cooldown_apos_3_erros_ms: 1800000,
  cooldown_apos_warning_ms: 3600000,
  max_msgs_mesmo_numero_dia: 3,
  max_tentativas: 3,
  meta_diaria_total: 10000,
};

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function WaBulkConfiguracoes() {
  const [cfg, setCfg] = useState<WaBulkConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    waBulkService.getConfig().then((c) => {
      if (c) setCfg({ ...DEFAULT, ...c });
      setLoading(false);
    });
  }, []);

  const salvar = async () => {
    setSaving(true);
    try {
      await waBulkService.upsertConfig(cfg);
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const toggleDia = (d: number) => {
    setCfg((p) => ({
      ...p,
      dias_permitidos: p.dias_permitidos.includes(d)
        ? p.dias_permitidos.filter((x) => x !== d)
        : [...p.dias_permitidos, d].sort(),
    }));
  };

  if (loading) return <Card className="p-6 text-sm text-muted-foreground">Carregando...</Card>;

  return (
    <div className="space-y-4">
      <WaBulkWebhookCard />

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Limites globais (fallback)</h3>
        <p className="text-xs text-muted-foreground">
          Aplicados às APIs que não têm limite individual.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Meta diária total</Label>
            <Input type="number" value={cfg.meta_diaria_total} onChange={(e) => setCfg({ ...cfg, meta_diaria_total: +e.target.value })} />
          </div>
          <div>
            <Label>Limite/dia por API</Label>
            <Input type="number" value={cfg.msgs_limite_diario_padrao} onChange={(e) => setCfg({ ...cfg, msgs_limite_diario_padrao: +e.target.value })} />
          </div>
          <div>
            <Label>Limite/hora por API</Label>
            <Input type="number" value={cfg.msgs_limite_horario_padrao} onChange={(e) => setCfg({ ...cfg, msgs_limite_horario_padrao: +e.target.value })} />
          </div>
          <div>
            <Label>Intervalo mínimo (ms)</Label>
            <Input type="number" value={cfg.intervalo_min_ms} onChange={(e) => setCfg({ ...cfg, intervalo_min_ms: +e.target.value })} />
          </div>
          <div>
            <Label>Intervalo máximo (ms)</Label>
            <Input type="number" value={cfg.intervalo_max_ms} onChange={(e) => setCfg({ ...cfg, intervalo_max_ms: +e.target.value })} />
          </div>
          <div>
            <Label>Máx. tentativas</Label>
            <Input type="number" value={cfg.max_tentativas} onChange={(e) => setCfg({ ...cfg, max_tentativas: +e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Janela de envio</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Horário início</Label>
            <Input type="time" value={cfg.horario_inicio} onChange={(e) => setCfg({ ...cfg, horario_inicio: e.target.value })} />
          </div>
          <div>
            <Label>Horário fim</Label>
            <Input type="time" value={cfg.horario_fim} onChange={(e) => setCfg({ ...cfg, horario_fim: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Dias permitidos</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIAS.map((nome, idx) => {
              const ativo = cfg.dias_permitidos.includes(idx);
              return (
                <Button
                  key={idx}
                  type="button"
                  size="sm"
                  variant={ativo ? "default" : "outline"}
                  onClick={() => toggleDia(idx)}
                >
                  {nome}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Aquecimento de números novos</h3>
            <p className="text-xs text-muted-foreground">Limites graduais por idade da API.</p>
          </div>
          <Switch checked={cfg.aquecimento_ativo} onCheckedChange={(v) => setCfg({ ...cfg, aquecimento_ativo: v })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Dias 1–7</Label>
            <Input type="number" value={cfg.aquecimento_dia_1_7} onChange={(e) => setCfg({ ...cfg, aquecimento_dia_1_7: +e.target.value })} />
          </div>
          <div>
            <Label>Dias 8–14</Label>
            <Input type="number" value={cfg.aquecimento_dia_8_14} onChange={(e) => setCfg({ ...cfg, aquecimento_dia_8_14: +e.target.value })} />
          </div>
          <div>
            <Label>Dias 15–21</Label>
            <Input type="number" value={cfg.aquecimento_dia_15_21} onChange={(e) => setCfg({ ...cfg, aquecimento_dia_15_21: +e.target.value })} />
          </div>
          <div>
            <Label>Dias 22+</Label>
            <Input type="number" value={cfg.aquecimento_dia_22_plus} onChange={(e) => setCfg({ ...cfg, aquecimento_dia_22_plus: +e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Proteção contra banimentos</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Taxa de erro máxima (%)</Label>
            <Input type="number" value={cfg.taxa_erro_max_pct} onChange={(e) => setCfg({ ...cfg, taxa_erro_max_pct: +e.target.value })} />
          </div>
          <div>
            <Label>Cooldown após erro (ms)</Label>
            <Input type="number" value={cfg.cooldown_apos_erro_ms} onChange={(e) => setCfg({ ...cfg, cooldown_apos_erro_ms: +e.target.value })} />
          </div>
          <div>
            <Label>Cooldown após 3 erros (ms)</Label>
            <Input type="number" value={cfg.cooldown_apos_3_erros_ms} onChange={(e) => setCfg({ ...cfg, cooldown_apos_3_erros_ms: +e.target.value })} />
          </div>
          <div>
            <Label>Cooldown após warning (ms)</Label>
            <Input type="number" value={cfg.cooldown_apos_warning_ms} onChange={(e) => setCfg({ ...cfg, cooldown_apos_warning_ms: +e.target.value })} />
          </div>
          <div>
            <Label>Máx. msgs mesmo número/dia</Label>
            <Input type="number" value={cfg.max_msgs_mesmo_numero_dia} onChange={(e) => setCfg({ ...cfg, max_msgs_mesmo_numero_dia: +e.target.value })} />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar configurações"}</Button>
      </div>
    </div>
  );
}