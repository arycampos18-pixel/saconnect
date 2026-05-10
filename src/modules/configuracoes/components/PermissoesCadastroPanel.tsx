import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type CampoFlag =
  | "can_create_all"
  | "can_create_liderancas"
  | "can_create_cabos"
  | "can_create_departamentos"
  | "can_create_categorias"
  | "can_create_tags"
  | "can_create_tipos_evento";

const COLUNAS: { key: CampoFlag; label: string }[] = [
  { key: "can_create_all",           label: "Tudo" },
  { key: "can_create_liderancas",    label: "Lideranças" },
  { key: "can_create_cabos",         label: "Cabos" },
  { key: "can_create_departamentos", label: "Departamentos" },
  { key: "can_create_categorias",    label: "Categorias" },
  { key: "can_create_tags",          label: "Tags" },
  { key: "can_create_tipos_evento",  label: "Tipos de Evento" },
];

type Linha = {
  user_id: string;
  email: string | null;
  nome: string | null;
  perms: Record<CampoFlag, boolean>;
};

export default function PermissoesCadastroPanel() {
  const [rows, setRows] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    const [usersRes, permsRes] = await Promise.all([
      supabase.from("settings_users").select("user_id, email, nome").order("nome"),
      supabase.from("user_permissions").select("*"),
    ]);
    const permMap = new Map<string, any>();
    (permsRes.data ?? []).forEach((p: any) => permMap.set(p.user_id, p));
    const linhas: Linha[] = (usersRes.data ?? []).map((u: any) => {
      const p = permMap.get(u.user_id) ?? {};
      return {
        user_id: u.user_id,
        email: u.email,
        nome: u.nome,
        perms: COLUNAS.reduce((acc, c) => ({ ...acc, [c.key]: !!p[c.key] }), {} as Record<CampoFlag, boolean>),
      };
    });
    setRows(linhas);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function toggle(linha: Linha, campo: CampoFlag, valor: boolean) {
    setSaving(linha.user_id + campo);
    const novosPerms = { ...linha.perms, [campo]: valor };
    setRows((prev) => prev.map((r) => r.user_id === linha.user_id ? { ...r, perms: novosPerms } : r));
    const payload: any = { user_id: linha.user_id, ...novosPerms };
    const { error } = await supabase.from("user_permissions").upsert(payload, { onConflict: "user_id" });
    if (error) {
      toast.error("Falha ao salvar: " + error.message);
      // rollback
      setRows((prev) => prev.map((r) => r.user_id === linha.user_id ? linha : r));
    } else {
      toast.success("Permissão atualizada");
    }
    setSaving(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Permissões para criar itens em dropdowns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Habilite quais usuários (não-administradores) podem cadastrar novos itens diretamente nos dropdowns dos formulários.
          Administradores sempre têm essa permissão.
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-2">Usuário</th>
                  {COLUNAS.map((c) => <th key={c.key} className="px-2 py-2 text-center">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id} className="border-b hover:bg-muted/40">
                    <td className="px-2 py-2">
                      <div className="font-medium">{r.nome ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    {COLUNAS.map((c) => (
                      <td key={c.key} className="px-2 py-2 text-center">
                        <Switch
                          checked={r.perms[c.key]}
                          onCheckedChange={(v) => toggle(r, c.key, v)}
                          disabled={saving === r.user_id + c.key}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={COLUNAS.length + 1} className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}