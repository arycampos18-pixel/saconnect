import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { disparosService } from "../services/disparosService";
import { format } from "date-fns";

export default function DisparoOptout() {
  const [list, setList] = useState<any[]>([]);
  const [tel, setTel] = useState("");
  const [motivo, setMotivo] = useState("");

  const carregar = async () => {
    try { setList(await disparosService.listarOptout()); }
    catch (e: any) { toast.error("Erro", { description: e.message }); }
  };
  useEffect(() => { carregar(); }, []);

  const add = async () => {
    try { await disparosService.adicionarOptout(tel, motivo || undefined); setTel(""); setMotivo(""); toast.success("Adicionado"); carregar(); }
    catch (e: any) { toast.error("Erro", { description: e.message }); }
  };
  const rem = async (id: string) => {
    if (!confirm("Remover desta lista?")) return;
    await disparosService.removerOptout(id); carregar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost"><Link to="/app/disparos"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-xl font-bold">Lista de opt-out</h1>
          <p className="text-sm text-muted-foreground">Telefones que não devem receber disparos.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Adicionar telefone</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Telefone (com DDD)" value={tel} onChange={(e) => setTel(e.target.value)} className="max-w-xs" />
            <Input placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="max-w-xs" />
            <Button onClick={add}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{list.length} registros</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? <p className="text-sm text-muted-foreground">Lista vazia.</p> : (
            <div className="rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left"><tr>
                  <th className="p-2">Telefone</th><th className="p-2">Motivo</th><th className="p-2">Origem</th><th className="p-2">Data</th><th></th>
                </tr></thead>
                <tbody>
                  {list.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="p-2 font-mono">{o.telefone_digits}</td>
                      <td className="p-2">{o.motivo ?? "—"}</td>
                      <td className="p-2"><span className="text-xs text-muted-foreground">{o.origem}</span></td>
                      <td className="p-2 text-xs text-muted-foreground">{format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</td>
                      <td className="p-2 text-right"><Button size="icon" variant="ghost" onClick={() => rem(o.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}