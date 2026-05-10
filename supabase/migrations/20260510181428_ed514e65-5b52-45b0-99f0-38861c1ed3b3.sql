CREATE OR REPLACE FUNCTION public.update_conversa_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_conversas
  SET ultima_mensagem = LEFT(COALESCE(NEW.conteudo, '[' || NEW.tipo::text || ']'), 200),
      ultima_mensagem_em = COALESCE(NEW.enviado_em, NEW.created_at),
      ultima_direcao = NEW.direcao,
      nao_lidas = CASE WHEN NEW.direcao = 'entrada' THEN nao_lidas + 1 ELSE nao_lidas END,
      status = CASE WHEN NEW.direcao = 'entrada' THEN 'Pendente'::public.conversa_status ELSE status END,
      finalizada_em = CASE WHEN NEW.direcao = 'entrada' THEN NULL ELSE finalizada_em END,
      updated_at = now()
  WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$;

UPDATE public.whatsapp_conversas
SET status = 'Pendente'::public.conversa_status,
    finalizada_em = NULL,
    updated_at = now()
WHERE ultima_direcao = 'entrada'
  AND status <> 'Pendente'::public.conversa_status;