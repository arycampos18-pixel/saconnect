import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ===== Verificação do Webhook (GET) =====
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (!token) return new Response("Forbidden", { status: 403 });

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("id")
      .eq("provider", "meta")
      .contains("credentials", { webhook_verify_token: token })
      .maybeSingle();

    if (mode === "subscribe" && session) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ===== Recebimento de mensagens (POST) =====
  if (req.method === "POST") {
    try {
      const body = await req.json();
      
      let companyId: string;
      let sessionId: string;
      let senderPhone: string;
      let senderName: string;
      let messageText: string;
      let messageExternalId: string;
      let direction: "inbound" | "outbound" = "inbound";
      let type: string = "text";

      // 1. Identificar Provedor (Z-API vs META)
      if (body.instanceId) {
        // --- PROVEDOR Z-API ---
        const { data: session } = await (supabase as any)
          .from("whatsapp_sessions")
          .select("id, company_id")
          .eq("provider", "zapi")
          .contains("credentials", { instance_id: body.instanceId })
          .maybeSingle();

        if (!session) return new Response("OK"); // Ignora se não encontrar sessão

        companyId = session.company_id;
        sessionId = session.id;
        senderPhone = body.phone;
        senderName = body.senderName || body.chatName || senderPhone;
        messageExternalId = body.messageId;
        direction = body.fromMe ? "outbound" : "inbound";

        if (body.text) {
          messageText = body.text.message;
          type = "text";
        } else if (body.image) {
          messageText = body.image.caption || "[Imagem]";
          type = "image";
        } else if (body.audio) {
          messageText = "[Áudio]";
          type = "audio";
        } else if (body.video) {
          messageText = body.video.caption || "[Vídeo]";
          type = "video";
        } else if (body.document) {
          messageText = body.document.fileName || "[Documento]";
          type = "document";
        } else {
          messageText = `[${body.type || "unknown"}]`;
          type = "other";
        }
      } else {
        // --- PROVEDOR META ---
        const entry = body?.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const messages = value?.messages;
        if (!messages || messages.length === 0) return new Response("OK");

        const msg = messages[0];
        const contact = value?.contacts?.[0];
        const phoneNumberId = value?.metadata?.phone_number_id;
        
        const { data: session } = await (supabase as any)
          .from("whatsapp_sessions")
          .select("id, company_id")
          .eq("provider", "meta")
          .contains("credentials", { phone_number_id: phoneNumberId })
          .maybeSingle();

        if (!session) return new Response("OK");

        companyId = session.company_id;
        sessionId = session.id;
        senderPhone = String(msg.from);
        senderName = contact?.profile?.name ?? senderPhone;
        messageExternalId = msg.id;
        direction = "inbound";
        type = msg.type || "text";
        messageText = type === "text" ? msg.text?.body ?? "" : `[${type}]`;
      }

      if (!senderPhone || !messageText) return new Response("OK");

      // 2. Sincronizar Contato
      let { data: waContact } = await supabase
        .from("whatsapp_contacts")
        .select("id")
        .eq("company_id", companyId)
        .eq("phone", senderPhone)
        .maybeSingle();

      if (!waContact) {
        const { data: created } = await supabase
          .from("whatsapp_contacts")
          .insert({ company_id: companyId, phone: senderPhone, name: senderName })
          .select("id").single();
        waContact = created;
      }

      // 3. Sincronizar Conversa
      let { data: conversation } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("company_id", companyId)
        .eq("session_id", sessionId)
        .eq("contact_id", waContact!.id)
        .maybeSingle();

      if (!conversation) {
        const { data: created } = await supabase
          .from("whatsapp_conversations")
          .insert({
            company_id: companyId,
            session_id: sessionId,
            contact_id: waContact!.id,
            status: "open",
            last_message: messageText,
            last_message_at: new Date().toISOString(),
          })
          .select("id").single();
        conversation = created;
      } else {
        await supabase
          .from("whatsapp_conversations")
          .update({ 
            last_message: messageText, 
            last_message_at: new Date().toISOString(),
            status: "open" // Reabre se estiver fechada
          })
          .eq("id", conversation.id);
      }

      // 4. Inserir Mensagem
      await supabase.from("whatsapp_messages").insert({
        company_id: companyId,
        conversation_id: conversation!.id,
        message_id_external: messageExternalId,
        direction: direction,
        type: type,
        content: messageText,
        status: "delivered",
      });

      return new Response("OK", { status: 200 });
    } catch (e) {
      console.error("whatsapp-webhook error:", e);
      return new Response("Error", { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
