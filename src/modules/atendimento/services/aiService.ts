import { supabase } from "@/integrations/supabase/client";

export type AiAction = "suggest" | "summarize" | "sentiment" | "classify";

export const aiService = {
  async run(action: AiAction, conversaId: string, contextoExtra?: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("whatsapp-ai", {
      body: { action, conversaId, contextoExtra },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data?.result ?? "";
  },
};