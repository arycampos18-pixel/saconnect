import { Badge } from "@/components/ui/badge";
const map: Record<string, { v: any; label: string }> = {
  low: { v: "secondary", label: "Baixa" },
  medium: { v: "default", label: "Média" },
  high: { v: "default", label: "Alta" },
  critical: { v: "destructive", label: "Crítica" },
};
export function PriorityBadge({ value }: { value: string }) {
  const m = map[value] ?? { v: "secondary", label: value };
  return <Badge variant={m.v}>{m.label}</Badge>;
}
