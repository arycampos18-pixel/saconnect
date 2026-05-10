import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, ShieldCheck, Save } from "lucide-react";
import { analiseService } from "../services/analiseService";

const fmtBRL = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function LimiteProvedorCard({ provedor = "assertiva" }: { provedor?: string }) {
  const qc = useQueryClient();
  const { data: uso, refetch } = useQuery({
    queryKey: ["provedor-uso", provedor],
    queryFn: () => analiseService.obterUsoProvedor(provedor),
    refetchInterval: 30_000,
  });
  const { data: limite } = useQuery({
    queryKey: ["provedor-limite", provedor],
    queryFn: () => analiseService.obterLimiteProvedor(provedor),
  });

  const [orcamento, setOrcamento] = useState("");
  const [cota, setCota] = useState("");
  const [cotaMes, setCotaMes] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alertaMostrado, setAlertaMostrado] = useState<string | null>(null);

  useEffect(() => {
    if (limite) {
      setOrcamento(((limite.orcamento_mensal_centavos ?? 0) / 100).toFixed(2));
      setCota(String(limite.cota_diaria_consultas ?? 0));
      setCotaMes(String((limite as any).cota_mensal_consultas ?? 0));
      setAtivo(!!limite.ativo);
    }
  }, [limite]);

  // Alertas em 80% e 100% (orçamento OU cota)
  useEffect(() => {
    if (!uso || !uso.ativo) return;
    const pctOrc = uso.orcamento_mensal_centavos > 0
      ? (uso.gasto_mes_centavos / uso.orcamento_mensal_centavos) * 100 : 0;
    const pctCota = uso.cota_diaria_consultas > 0
      ? (uso.consultas_dia / uso.cota_diaria_consultas) * 100 : 0;
    const pctCotaMes = uso.cota_mensal_consultas > 0
      ? (uso.consultas_mes / uso.cota_mensal_consultas) * 100 : 0;
    const pico = Math.max(pctOrc, pctCota, pctCotaMes);
    const chave = pico >= 100 ? "100" : pico >= 80 ? "80" : null;
    if (chave && chave !== alertaMostrado) {
      setAlertaMostrado(chave);
      if (chave === "100") {
        toast.error("Limite SA Connect Data atingido — consultas bloqueadas até liberar o teto.");
      } else {
        toast.warning("Atenção: 80% do limite SA Connect Data já consumido.");
      }
    }
  }, [uso, alertaMostrado]);

  const salvar = async () => {
    setSalvando(true);
    try {
      const orcCent = Math.round(parseFloat(orcamento.replace(",", ".") || "0") * 100);
      const cotaInt = Math.max(0, parseInt(cota || "0", 10));
      const cotaMesInt = Math.max(0, parseInt(cotaMes || "0", 10));
      await analiseService.salvarLimiteProvedor({
        provedor,
        orcamento_mensal_centavos: isFinite(orcCent) ? orcCent : 0,
        cota_diaria_consultas: cotaInt,
        cota_mensal_consultas: cotaMesInt,
        ativo,
      });
      toast.success("Limites salvos.");
      qc.invalidateQueries({ queryKey: ["provedor-limite", provedor] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  const orcCent = uso?.orcamento_mensal_centavos ?? 0;
  const gasto = uso?.gasto_mes_centavos ?? 0;
  const pctOrc = orcCent > 0 ? Math.min(100, (gasto / orcCent) * 100) : 0;
  const pctCota = (uso?.cota_diaria_consultas ?? 0) > 0
    ? Math.min(100, (uso.consultas_dia / uso.cota_diaria_consultas) * 100) : 0;
  const cotaMesLim = uso?.cota_mensal_consultas ?? 0;
  const pctCotaMes = cotaMesLim > 0
    ? Math.min(100, ((uso?.consultas_mes ?? 0) / cotaMesLim) * 100) : 0;
  const bloqueado = uso?.bloqueado_orcamento || uso?.bloqueado_cota || uso?.bloqueado_cota_mensal;

  return (
    <Card className={bloqueado ? "border-destructive/50" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {bloqueado ? <AlertCircle className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
              Limites de consumo · SA Connect Data
            </CardTitle>
            <CardDescription>
              {bloqueado
                ? "Consultas BLOQUEADAS — limite atingido."
                : "Defina um teto para evitar estouro de orçamento."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ativo" className="text-xs">Ativo</Label>
            <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="orc">Orçamento mensal (R$)</Label>
            <Input id="orc" inputMode="decimal" placeholder="0,00"
              value={orcamento} onChange={(e) => setOrcamento(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">0 = sem limite</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cotaMes">Limite mensal (consultas)</Label>
            <Input id="cotaMes" inputMode="numeric" placeholder="0"
              value={cotaMes} onChange={(e) => setCotaMes(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">0 = sem limite</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cota">Cota diária (consultas)</Label>
            <Input id="cota" inputMode="numeric" placeholder="0"
              value={cota} onChange={(e) => setCota(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">0 = sem limite</p>
          </div>
        </div>

        {orcCent > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Gasto do mês</span>
              <span className="font-medium">{fmtBRL(gasto)} / {fmtBRL(orcCent)} ({pctOrc.toFixed(0)}%)</span>
            </div>
            <Progress value={pctOrc} className={pctOrc >= 100 ? "[&>div]:bg-destructive" : pctOrc >= 80 ? "[&>div]:bg-amber-500" : ""} />
          </div>
        )}
        {(uso?.cota_diaria_consultas ?? 0) > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Consultas hoje</span>
              <span className="font-medium">{uso.consultas_dia} / {uso.cota_diaria_consultas} ({pctCota.toFixed(0)}%)</span>
            </div>
            <Progress value={pctCota} className={pctCota >= 100 ? "[&>div]:bg-destructive" : pctCota >= 80 ? "[&>div]:bg-amber-500" : ""} />
          </div>
        )}
        {cotaMesLim > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Consultas no mês</span>
              <span className="font-medium">{uso?.consultas_mes ?? 0} / {cotaMesLim} ({pctCotaMes.toFixed(0)}%)</span>
            </div>
            <Progress value={pctCotaMes} className={pctCotaMes >= 100 ? "[&>div]:bg-destructive" : pctCotaMes >= 80 ? "[&>div]:bg-amber-500" : ""} />
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={salvar} disabled={salvando}>
            <Save className="h-4 w-4 mr-2" />
            {salvando ? "Salvando…" : "Salvar limites"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}