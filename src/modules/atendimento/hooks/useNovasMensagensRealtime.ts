import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

/**
 * Escuta novas conversas Pendentes em tempo real e mostra toast + som.
 * Deve ser montado uma única vez (no AppLayout).
 */
export function useNovasMensagensRealtime() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Beep curto inline (data URI) — sem necessidade de arquivo no bundle
  useEffect(() => {
    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT" +
      "BvT19BQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU" +
      "FBQUFBQUFBQUFBQUFB"
    );
    audioRef.current.volume = 0.4;
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("novas-conversas-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_mensagens" },
        async (payload: any) => {
          const m = payload.new;
          if (m?.direcao !== "entrada") return;

          // Atualiza contadores e listas onde quer que estejam montados
          qc.invalidateQueries({ queryKey: ["conversas"] });
          qc.invalidateQueries({ queryKey: ["conversas-pendentes-count"] });
          qc.invalidateQueries({ queryKey: ["conversas-dashboard"] });

          // Não notifica se já está na tela de atendimento
          if (pathname.startsWith("/app/atendimento")) return;

          try { audioRef.current?.play().catch(() => {}); } catch {}

          toast("Nova mensagem recebida", {
            description: m.conteudo
              ? String(m.conteudo).slice(0, 80)
              : "Conversa pendente no inbox",
            action: {
              label: "Abrir",
              onClick: () => navigate("/app/atendimento"),
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, pathname, qc, navigate]);
}