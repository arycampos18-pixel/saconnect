import { useEffect, useState, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ShortcutsCtx = { open: () => void };
const Ctx = createContext<ShortcutsCtx>({ open: () => {} });

export const useShortcutsHelp = () => useContext(Ctx);

const SHORTCUTS: Array<{ keys: string; label: string; path?: string }> = [
  { keys: "g d", label: "Ir para o Painel", path: "/app/dashboard" },
  { keys: "g p", label: "Ir para Político", path: "/app/political/dashboard" },
  { keys: "g w", label: "Ir para WhatsApp", path: "/app/whatsapp" },
  { keys: "g r", label: "Ir para Relatórios", path: "/app/relatorios" },
  { keys: "g t", label: "Ir para Tickets", path: "/app/tickets" },
  { keys: "g a", label: "Ir para a Agenda", path: "/app/agenda" },
  { keys: "g c", label: "Ir para Configurações", path: "/app/configuracoes" },
  { keys: "n", label: "Novo eleitor", path: "/app/captacao" },
  { keys: "?", label: "Mostrar atalhos" },
];

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.tagName === "SELECT")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) { e.preventDefault(); setHelpOpen(true); return; }

      if (pending === "g") {
        const map: Record<string, string> = {
          d: "/app/dashboard",
          p: "/app/political/dashboard",
          w: "/app/whatsapp",
          r: "/app/relatorios",
          t: "/app/tickets",
          a: "/app/agenda",
          c: "/app/configuracoes",
        };
        if (map[e.key]) { e.preventDefault(); navigate(map[e.key]); }
        setPending(null);
        return;
      }
      if (e.key === "g") {
        setPending("g");
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setPending(null), 1200);
        return;
      }
      if (e.key === "n") { e.preventDefault(); navigate("/app/captacao"); }
    }
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(timer); };
  }, [navigate, pending]);

  return (
    <Ctx.Provider value={{ open: () => setHelpOpen(true) }}>
      {children}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Atalhos de teclado</DialogTitle></DialogHeader>
          <ul className="space-y-2 text-sm">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                <span className="text-foreground">{s.label}</span>
                <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">{s.keys}</kbd>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Sequências como <kbd className="rounded border bg-muted px-1 font-mono">g</kbd> + <kbd className="rounded border bg-muted px-1 font-mono">d</kbd> devem ser pressionadas em até 1,2s.</p>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}