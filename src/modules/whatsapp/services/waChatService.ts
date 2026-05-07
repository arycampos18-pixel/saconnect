 import { supabase } from "@/integrations/supabase/client";

 export interface WAConversa {
   id: string;
   protocolo: number;
   wa_nome: string;
   wa_numero: string;
   status: 'pendente' | 'em_atendimento' | 'fechada';
   ultima_mensagem: string;
   ultima_interacao: string;
   eleitor_id: string | null;
   fila_id: string | null;
   agente_id: string | null;
   eleitor?: {
     nome: string;
     bairro: string;
     score_fidelidade: number;
   };
 }

 export interface WAMensagem {
   id: string;
   conversa_id: string;
   corpo: string;
   tipo: 'texto' | 'imagem' | 'audio' | 'nota_interna';
   direcao: 'entrada' | 'saida';
   status: string;
   created_at: string;
   remetente_id: string | null;
 }

 export const waChatService = {
   async listarConversas(filtros: { status?: string } = {}) {
     let q = supabase
       .from('wa_conversas')
       .select('*, eleitor:eleitores(nome, bairro, score_fidelidade)')
       .order('ultima_interacao', { ascending: false });

     if (filtros.status) q = q.eq('status', filtros.status);

     const { data, error } = await q;
     if (error) throw error;
     return data as WAConversa[];
   },

   async buscarMensagens(conversaId: string) {
     const { data, error } = await supabase
       .from('wa_mensagens')
       .select('*')
       .eq('conversa_id', conversaId)
       .order('created_at', { ascending: true });
     if (error) throw error;
     return data as WAMensagem[];
   },

   async enviarMensagem(conversaId: string, corpo: string, tipo: WAMensagem['tipo'] = 'texto'): Promise<WAMensagem> {
     const { data: u } = await supabase.auth.getUser();
     const { data, error } = await supabase
       .from('wa_mensagens')
       .insert({
         conversa_id: conversaId,
         corpo,
         tipo,
         direcao: 'saida',
         remetente_id: u.user?.id
       })
       .select()
       .single();
     if (error) throw error;

     // Atualiza última interação da conversa
     await supabase
       .from('wa_conversas')
       .update({ ultima_mensagem: corpo, ultima_interacao: new Date().toISOString() })
       .eq('id', conversaId);

     return data;
   }
 };