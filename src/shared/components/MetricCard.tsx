import { LucideIcon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "primary" | "accent" | "success";
};

const variants = {
  primary:
    "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.45)]",
  accent:
    "bg-gradient-to-br from-accent to-secondary text-accent-foreground shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.25)]",
  success:
    "bg-gradient-to-br from-success to-success/70 text-success-foreground shadow-[0_8px_20px_-4px_hsl(var(--success)/0.45)]",
};

export function MetricCard({ title, value, icon: Icon, trend, variant = "primary" }: Props) {
  return (
    <div className="group card-glass animate-fade-in-up p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{title}</p>
          <p className="font-[Poppins,Inter,sans-serif] text-[32px] font-bold leading-none tracking-[-0.02em] text-foreground">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 pt-0.5 text-xs font-medium text-success">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
            variants[variant],
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}