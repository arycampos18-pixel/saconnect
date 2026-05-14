import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { metaService } from "@/modules/whatsapp-meta/services/whatsappMetaService";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { publicAppOrigin } from "@/shared/utils/publicAppOrigin";

export default function MetaOAuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Processando autenticação Meta…");

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const sessionId = state ?? sessionStorage.getItem("meta_oauth_session_id");
      const redirect = sessionStorage.getItem("meta_oauth_redirect") ?? `${publicAppOrigin()}/app/wa-meta/oauth-callback`;
      if (!code || !sessionId) {
        setMsg("Código ou sessão ausente.");
        return;
      }
      try {
        await metaService.exchangeOAuthCode(sessionId, code, redirect);
        toast.success("Sessão Meta autenticada");
        navigate("/app/wa-meta/sessions", { replace: true });
      } catch (e: any) {
        setMsg(`Erro: ${e.message ?? "falha"}`);
      }
    })();
  }, [navigate]);

  return (
    <Card className="p-8 text-center">
      <p>{msg}</p>
    </Card>
  );
}