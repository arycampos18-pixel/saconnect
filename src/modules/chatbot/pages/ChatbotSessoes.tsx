import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ListChecks, Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { chatbotService } from "../services/chatbotService";

const STATUS_VARIANT: Record<string, any> = {
  ativo: "default", finalizado: "secondary", transferido: "outline", expirado: "destructive",
};

export default function ChatbotSessoes() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: sessoes, isLoading } = useQuery({
    queryKey: ["chatbot-sessoes"], queryFn: () => chatbotService.listarSessoes(),
    refetchInterval: 10000,
  });

  const finalizar = async (id: string) => {
    try {
      await chatbotService.finalizarSessao(id);
      toast.success("Sessão finalizada");
      qc.invalidateQueries({ queryKey: ["chatbot-sessoes"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/chatbot")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ListChecks className="h-5 w-5" /> Sessões do Chatbot
          </h1>
          <p className="text-xs text-muted-foreground">Conversas atualmente em fluxo automatizado.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-sm">Últimas 200 sessões</CardTitle></CardHeader>
          <CardContent>
            {(sessoes ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma sessão registrada</p>
            ) : (
              <div className="space-y-2">
                {(sessoes ?? []).map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 rounded border p-3">
                    <Badge variant={STATUS_VARIANT[s.status] ?? "secondary"}>{s.status}</Badge>
                    <div className="flex-1 text-xs">
                      <div className="font-mono">conversa {String(s.conversa_id).slice(0, 8)}</div>
                      <div className="text-muted-foreground">
                        {Object.keys(s.variaveis ?? {}).length > 0
                          ? `Variáveis: ${JSON.stringify(s.variaveis)}`
                          : "Sem variáveis coletadas"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.ultima_interacao).toLocaleString("pt-BR")}
                    </div>
                    {s.status === "ativo" && (
                      <Button size="sm" variant="outline" onClick={() => finalizar(s.id)}>
                        <X className="mr-1 h-3 w-3" /> Finalizar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}