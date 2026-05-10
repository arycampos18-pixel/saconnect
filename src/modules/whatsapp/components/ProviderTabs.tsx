import { NavLink, useLocation } from "react-router-dom";
import { Smartphone, Plug } from "lucide-react";

const providers = [
  { to: "/app/whatsapp", label: "Z-API", icon: Smartphone, match: "/app/whatsapp" },
  { to: "/app/wa-meta", label: "Meta Cloud API", icon: Plug, match: "/app/wa-meta" },
];

export function WhatsAppProviderTabs() {
  const { pathname } = useLocation();
  return (
    <div
      role="tablist"
      aria-label="Provedor de WhatsApp"
      className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
    >
      {providers.map((p) => {
        const isActive = pathname === p.match || pathname.startsWith(p.match + "/");
        return (
          <NavLink
            key={p.to}
            to={p.to}
            role="tab"
            aria-selected={isActive}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <p.icon className="h-4 w-4" />
            {p.label}
          </NavLink>
        );
      })}
    </div>
  );
}