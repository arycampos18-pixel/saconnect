import { Checkbox } from "@/components/ui/checkbox";
import type { SettingsPermission } from "../services/settingsService";

type Props = {
  grouped: Record<string, SettingsPermission[]>;
  perms: Set<string>;
  onToggle: (permissionId: string) => void;
  canManage: boolean;
  emptyMessage?: string;
};

/**
 * Matriz de permissões por módulo (apenas UI).
 * Dados e persistência ficam na página que compõe este componente.
 */
export function ProfilePermissionsMatrix({
  grouped,
  perms,
  onToggle,
  canManage,
  emptyMessage = "Nenhuma permissão disponível.",
}: Props) {
  const entries = Object.entries(grouped);
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <div className="space-y-6">
      {entries.map(([module, list]) => (
        <div key={module}>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{module}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((p) => (
              <label key={p.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                <Checkbox
                  checked={perms.has(p.id)}
                  onCheckedChange={() => onToggle(p.id)}
                  disabled={!canManage}
                />
                <div className="flex-1">
                  <p className="font-medium">{p.description}</p>
                  <p className="text-xs text-muted-foreground">{p.id}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
