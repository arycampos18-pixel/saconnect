import { cn } from "@/lib/utils";

export function SlaIndicator({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return <span className="text-xs text-muted-foreground">—</span>;
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  const diffH = (due - now) / 3_600_000;
  const overdue = diffH < 0;
  const warn = !overdue && diffH < 4;
  const ok = !overdue && !warn;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs",
      overdue && "text-destructive animate-pulse",
      warn && "text-amber-600",
      ok && "text-emerald-600",
    )}>
      <span className={cn("h-2 w-2 rounded-full",
        overdue && "bg-destructive",
        warn && "bg-amber-500",
        ok && "bg-emerald-500",
      )} />
      {new Date(dueAt).toLocaleString()}
    </span>
  );
}
