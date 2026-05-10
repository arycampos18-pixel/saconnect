import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { WARN_MS } from "@/shared/auth/useIdleSession";

function fmt(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SessionTimer({ remainingMs }: { remainingMs: number }) {
  const warning = remainingMs <= WARN_MS;
  return (
    <div
      role="timer"
      aria-live={warning ? "polite" : "off"}
      aria-label={`Sessão expira em ${fmt(remainingMs)}`}
      title="Tempo restante até logout por inatividade"
      className={cn(
        "hidden items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium tabular-nums shadow-elegant-sm md:inline-flex",
        warning ? "border-destructive/40 text-destructive animate-pulse" : "text-muted-foreground",
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      <span>Sessão {fmt(remainingMs)}</span>
    </div>
  );
}