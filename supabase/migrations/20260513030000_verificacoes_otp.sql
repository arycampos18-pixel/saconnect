-- ============================================================
-- OTP de verificação de WhatsApp para formulários públicos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.verificacoes_otp (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone    TEXT NOT NULL,
  nome        TEXT,
  codigo      TEXT NOT NULL,
  tentativas  INTEGER NOT NULL DEFAULT 0,
  verificado  BOOLEAN NOT NULL DEFAULT false,
  expira_em   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verificacoes_otp_telefone
  ON public.verificacoes_otp (telefone, verificado, expira_em);

ALTER TABLE public.verificacoes_otp ENABLE ROW LEVEL SECURITY;

-- Anon pode inserir (para criar OTP) e SELECT só pelo próprio ID
CREATE POLICY "otp_insert_anon" ON public.verificacoes_otp
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── RPCs públicas (SECURITY DEFINER = bypassa RLS) ───────────────────────────

-- 1) Gera um OTP de 6 dígitos e devolve o ID da verificação
CREATE OR REPLACE FUNCTION public.public_criar_otp(_telefone text, _nome text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tel  text;
  v_cod  text;
  v_id   uuid;
BEGIN
  v_tel := regexp_replace(coalesce(_telefone,''), '\D', '', 'g');
  IF length(v_tel) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Telefone inválido');
  END IF;

  -- Invalidar OTPs anteriores do mesmo telefone
  UPDATE public.verificacoes_otp
    SET expira_em = now() - interval '1 second'
    WHERE telefone = v_tel AND verificado = false AND expira_em > now();

  -- Código aleatório de 6 dígitos
  v_cod := lpad(floor(random() * 1000000)::text, 6, '0');

  INSERT INTO public.verificacoes_otp (telefone, nome, codigo, expira_em)
  VALUES (v_tel, trim(coalesce(_nome,'')), v_cod, now() + interval '10 minutes')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'codigo', v_cod, 'telefone', v_tel);
END;
$$;

-- 2) Verifica o código informado pelo utilizador
CREATE OR REPLACE FUNCTION public.public_verificar_otp(_id uuid, _codigo text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.verificacoes_otp;
BEGIN
  SELECT * INTO v_row FROM public.verificacoes_otp WHERE id = _id;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código não encontrado');
  END IF;
  IF v_row.verificado THEN
    RETURN jsonb_build_object('ok', true, 'ja_verificado', true,
      'nome', v_row.nome, 'telefone', v_row.telefone);
  END IF;
  IF v_row.expira_em < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código expirado. Solicite um novo.');
  END IF;
  IF v_row.tentativas >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Muitas tentativas. Solicite um novo código.');
  END IF;

  -- Incrementar tentativas
  UPDATE public.verificacoes_otp SET tentativas = tentativas + 1 WHERE id = _id;

  IF v_row.codigo <> trim(_codigo) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código incorreto.',
      'tentativas_restantes', 5 - v_row.tentativas - 1);
  END IF;

  -- Marcar como verificado
  UPDATE public.verificacoes_otp
    SET verificado = true WHERE id = _id;

  RETURN jsonb_build_object('ok', true, 'nome', v_row.nome, 'telefone', v_row.telefone);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_criar_otp(text, text)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_verificar_otp(uuid, text) TO anon, authenticated;
