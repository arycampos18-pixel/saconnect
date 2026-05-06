import { Badge } from "@/components/ui/badge";
const map: Record<string, { v: any; label: string }> = {
  open: { v: "default", label: "Aberto" },
  in_progress: { v: "default", label: "Em andamento" },
  waiting: { v: "secondary", label: "Aguardando" },
  resolved: { v: "secondary", label: "Resolvido" },
  closed: { v: "secondary", label: "Fechado" },
};
export function StatusBadge({ value }: { value: string }) {
  const m = map[value] ?? { v: "secondary", label: value };
  return <Badge variant={m.v}>{m.label}</Badge>;
}
