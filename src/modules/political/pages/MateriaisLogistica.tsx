 import { useEffect, useState } from "react";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Package, Truck, Plus, History, Loader2 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";

 export default function MateriaisLogistica() {
   const [estoque, setEstoque] = useState<any[]>([]);
   const [distribuicoes, setDistribuicoes] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   const carregar = async () => {
     setLoading(true);
     try {
       const [est, dist] = await Promise.all([
         supabase.from("materiais_estoque").select("*").order("nome"),
         supabase.from("materiais_distribuicao").select("*, materiais_estoque(nome), liderancas(nome), cabos_eleitorais(nome)").order("data_entrega", { ascending: false }).limit(20)
       ]);
       setEstoque(est.data ?? []);
       setDistribuicoes(dist.data ?? []);
     } catch (e: any) {
       toast.error("Erro ao carregar logística: " + e.message);
     } finally {
       setLoading(false);
     }
   };

   useEffect(() => { carregar(); }, []);

   return (
     <div className="space-y-6">
       <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
         <div>
           <h1 className="text-2xl font-bold tracking-tight">Logística de Materiais</h1>
           <p className="text-sm text-muted-foreground">Controle de estoque e distribuição de adesivos, santinhos e outros.</p>
         </div>
         <div className="flex gap-2">
           <Button size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" /> Novo Item</Button>
           <Button size="sm"><Truck className="mr-2 h-4 w-4" /> Registrar Entrega</Button>
         </div>
       </div>

       <div className="grid gap-6 md:grid-cols-3">
         <Card className="md:col-span-1">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Package className="h-5 w-5 text-primary" /> Estoque Atual
             </CardTitle>
           </CardHeader>
           <CardContent>
             {loading ? <Loader2 className="animate-spin" /> : (
               <div className="space-y-4">
                 {estoque.map(item => (
                   <div key={item.id} className="flex items-center justify-between border-b pb-2">
                     <div>
                       <p className="font-medium">{item.nome}</p>
                       <p className="text-xs text-muted-foreground">{item.tipo}</p>
                     </div>
                     <Badge variant={item.quantidade_total < 500 ? "destructive" : "secondary"}>
                       {item.quantidade_total} un
                     </Badge>
                   </div>
                 ))}
                 {estoque.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Estoque vazio.</p>}
               </div>
             )}
           </CardContent>
         </Card>

         <Card className="md:col-span-2">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <History className="h-5 w-5 text-primary" /> Últimas Distribuições
             </CardTitle>
             <CardDescription>Materiais entregues para lideranças e cabos.</CardDescription>
           </CardHeader>
           <CardContent>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Data</TableHead>
                   <TableHead>Material</TableHead>
                   <TableHead>Destino</TableHead>
                   <TableHead className="text-right">Qtd</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {distribuicoes.map(d => (
                   <TableRow key={d.id}>
                     <TableCell className="text-xs">{new Date(d.data_entrega).toLocaleDateString()}</TableCell>
                     <TableCell className="font-medium">{d.materiais_estoque?.nome}</TableCell>
                     <TableCell className="text-xs">
                       {d.liderancas?.nome || d.cabos_eleitorais?.nome}
                     </TableCell>
                     <TableCell className="text-right font-bold">{d.quantidade}</TableCell>
                   </TableRow>
                 ))}
                 {!loading && distribuicoes.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma entrega registrada.</TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 }