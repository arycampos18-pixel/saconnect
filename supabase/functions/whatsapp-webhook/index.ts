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
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messages = value?.messages;
      if (!messages || messages.length === 0) {
        return new Response("OK", { status: 200 });
      }

      const msg = messages[0];
      const contact = value?.contacts?.[0];
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (msg.from === phoneNumberId) return new Response("OK");

      const { data: session } = await supabase
        .from("whatsapp_sessions")
        .select("id, company_id")
        .eq("provider", "meta")
        .contains("credentials", { phone_number_id: phoneNumberId })
        .maybeSingle();
      if (!session) return new Response("OK");

      const companyId = session.company_id;
      const sessionId = session.id;
      const senderPhone = String(msg.from);
      const senderName = contact?.profile?.name ?? senderPhone;
      const messageText =
        msg.type === "text" ? msg.text?.body ?? "" : `[${msg.type}]`;

      // 1) Contato
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

      // 2) Conversa
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
          .update({ last_message: messageText, last_message_at: new Date().toISOString() })
          .eq("id", conversation.id);
      }

      // 3) Mensagem
      await supabase.from("whatsapp_messages").insert({
        company_id: companyId,
        conversation_id: conversation!.id,
        message_id_external: msg.id,
        direction: "inbound",
        type: msg.type ?? "text",
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
