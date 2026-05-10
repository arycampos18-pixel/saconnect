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
    <div className="group card-glass animate-fade-in-up p-4 sm:p-5 md:p-6 h-full">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
          <p className="text-[11px] sm:text-[12px] md:text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground line-clamp-2">
            {title}
          </p>
          <p className="font-[Poppins,Inter,sans-serif] text-[24px] sm:text-[26px] md:text-[30px] lg:text-[32px] font-bold leading-none tracking-[-0.02em] text-foreground">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 pt-0.5 text-[11px] sm:text-xs font-medium text-success">
              <TrendingUp className="h-3 w-3 shrink-0" />
              <span className="truncate">{trend}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
            variants[variant],
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
        </div>
      </div>
    </div>
  );
}