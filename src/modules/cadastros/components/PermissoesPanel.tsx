import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cadastrosService, type AppRole } from "../services/cadastrosService";
import { auditoriaService } from "@/modules/auditoria/services/auditoriaService";

type Usuario = {
  id: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  cargo: string | null;
  roles: string[];
  created_at: string;
};

const ROLES: AppRole[] = ["admin", "lideranca", "operador"];

function roleColor(r: string) {
  if (r === "admin") return "destructive" as const;
  if (r === "lideranca") return "default" as const;
  return "secondary" as const;
}

export function PermissoesPanel() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const u = await cadastrosService.listarUsuarios();
      setUsuarios(u as Usuario[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function alterarRole(u: Usuario, role: AppRole) {
    setSalvando(u.user_id);
    try {
      await cadastrosService.definirRole(u.user_id, role);
      await auditoriaService.registrar({
        acao: "Editar", entidade: "user_role", entidade_id: u.user_id,
        descricao: `Permissão de ${u.nome ?? u.email} alterada para ${role}`,
        modulo: "Cadastros",
      });
      toast.success("Permissão atualizada");
      await carregar();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSalvando(null);
    }
  }

  const filtrados = usuarios.filter((u) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (u.nome ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
        <div>
          <strong>Papel único por usuário.</strong> A cada alteração, o papel anterior é
          substituído. <span className="text-muted-foreground">admin</span> tem acesso total,{" "}
          <span className="text-muted-foreground">lideranca</span> gerencia sua equipe,{" "}
          <span className="text-muted-foreground">operador</span> opera o dia a dia.
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou email..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Papel atual</TableHead>
              <TableHead className="w-[200px]">Alterar para</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando...
              </TableCell></TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell></TableRow>
            ) : filtrados.map((u) => {
              const atual = (u.roles[0] ?? "operador") as AppRole;
              return (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.nome ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    {u.roles.length === 0 ? (
                      <Badge variant="outline">sem papel</Badge>
                    ) : u.roles.map((r) => (
                      <Badge key={r} variant={roleColor(r)} className="mr-1 capitalize">{r}</Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={atual}
                      onValueChange={(v) => alterarRole(u, v as AppRole)}
                      disabled={salvando === u.user_id}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Dica: para revogar acesso administrativo, mude o papel para <strong>operador</strong>.
        A alteração entra em vigor no próximo login do usuário.
      </p>
    </div>
  );
}