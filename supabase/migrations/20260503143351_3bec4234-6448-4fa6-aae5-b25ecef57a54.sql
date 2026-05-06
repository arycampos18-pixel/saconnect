-- Limpa todo o histórico de conversas WhatsApp para testes
DELETE FROM public.whatsapp_conversa_notas;
DELETE FROM public.chatbot_sessoes;
DELETE FROM public.whatsapp_mensagens;
DELETE FROM public.whatsapp_conversas;
DELETE FROM public.whatsapp_webhook_raw;