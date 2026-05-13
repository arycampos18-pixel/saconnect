/**
 * Redirecionador universal de links curtos.
 *
 * Rotas atendidas:
 *   /l/:codigo  → qualquer URL / formulário / download
 *   /w/:codigo  → WhatsApp direto
 *
 * Fluxo:
 *   1. Chama RPC pública `public_resolver_link`
 *   2. Redireciona para a URL resolvida via window.location.replace
 *   3. Fallback: mostra erro amigável
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function LinkRedirect() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<"carregando" | "redirecionando" | "nao_encontrado" | "erro">(
    "carregando"
  );
  const [urlDestino, setUrlDestino] = useState<string | null>(null);
  const [titulo, setTitulo] = useState<string | null>(null);

  useEffect(() => {
    if (!codigo) { setEstado("nao_encontrado"); return; }
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc(
          "public_resolver_link",
          { _codigo: codigo.toLowerCase() }
        );
        if (error || !data?.encontrado) {
          setEstado("nao_encontrado");
          return;
        }
        setTitulo(data.titulo ?? null);
        const url: string = data.url;
        setUrlDestino(url);
        setEstado("redirecionando");

        // Redirecionar após breve instante (para mostrar "Redirecionando...")
        setTimeout(() => {
          if (url.startsWith("http") || url.startsWith("https")) {
            window.location.replace(url);
          } else {
            // Link interno (ex: /cadastro-publico?token=...)
            navigate(url, { replace: true });
          }
        }, 800);
      } catch {
        setEstado("erro");
      }
    })();
  }, [codigo, navigate]);

  if (estado === "carregando" || estado === "redirecionando") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            {estado === "carregando" ? "Carregando…" : "Redirecionando…"}
          </p>
          {titulo && (
            <p className="mt-1 text-sm text-muted-foreground">{titulo}</p>
          )}
          {urlDestino && estado === "redirecionando" && (
            <p className="mt-2 text-xs text-muted-foreground/70 break-all max-w-xs">
              {urlDestino}
            </p>
          )}
        </div>
        {urlDestino && estado === "redirecionando" && (
          <a
            href={urlDestino}
            className="text-sm text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Clique aqui se não for redirecionado automaticamente
          </a>
        )}
      </div>
    );
  }

  if (estado === "nao_encontrado") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Link não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            Este link pode ter expirado, sido desativado ou nunca ter existido.
          </p>
          <p className="mt-1 text-xs font-mono text-muted-foreground/60">
            código: {codigo}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ExternalLink className="h-4 w-4 mr-2" /> Ir para a página inicial
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-lg font-semibold">Erro ao processar o link</p>
      <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
    </div>
  );
}
