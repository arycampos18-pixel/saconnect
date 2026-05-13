
-- ============================================================
-- RPCs públicas para o formulário de auto-cadastro via token
-- Acessíveis para anon (sem JWT) via supabase.rpc()
-- ============================================================

-- 1) Validar token e retornar informações do link
CREATE OR REPLACE FUNCTION public.public_get_token_cadastro(_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.tokens_auto_cadastro;
  v_lideranca_nome text := null;
  v_cabo_nome text := null;
BEGIN
  SELECT * INTO v_row
  FROM public.tokens_auto_cadastro
  WHERE token = _token
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Link inválido');
  END IF;

  IF v_row.usado THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Link já utilizado');
  END IF;

  IF v_row.expira_em < now() THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Link expirado');
  END IF;

  IF v_row.lideranca_id IS NOT NULL THEN
    SELECT nome INTO v_lideranca_nome
    FROM public.liderancas WHERE id = v_row.lideranca_id;
  END IF;

  IF v_row.cabo_id IS NOT NULL THEN
    SELECT nome INTO v_cabo_nome
    FROM public.cabos_eleitorais WHERE id = v_row.cabo_id;
  END IF;

  RETURN jsonb_build_object(
    'valido', true,
    'expira_em', v_row.expira_em,
    'tipo', v_row.tipo,
    'telefone_destino', v_row.telefone_destino,
    'lideranca', CASE WHEN v_lideranca_nome IS NOT NULL
                      THEN jsonb_build_object('nome', v_lideranca_nome) ELSE null END,
    'cabo',      CASE WHEN v_cabo_nome IS NOT NULL
                      THEN jsonb_build_object('nome', v_cabo_nome) ELSE null END
  );
END;
$$;

-- 2) Submeter cadastro usando o token
CREATE OR REPLACE FUNCTION public.public_submit_token_cadastro(
  _token      text,
  _nome       text,
  _telefone   text,
  _cpf        text    DEFAULT NULL,
  _email      text    DEFAULT NULL,
  _bairro     text    DEFAULT NULL,
  _cidade     text    DEFAULT NULL,
  _uf         text    DEFAULT NULL,
  _lgpd       boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row      public.tokens_auto_cadastro;
  v_tel      text;
  v_origem   text;
  v_eleitor_id uuid;
BEGIN
  -- Validações básicas
  IF length(trim(coalesce(_nome, ''))) < 3 THEN
    RAISE EXCEPTION 'Nome inválido';
  END IF;

  v_tel := regexp_replace(coalesce(_telefone, ''), '\D', '', 'g');
  IF length(v_tel) < 10 THEN
    RAISE EXCEPTION 'Telefone inválido (DDD + número)';
  END IF;

  IF NOT coalesce(_lgpd, false) THEN
    RAISE EXCEPTION 'Consentimento LGPD obrigatório';
  END IF;

  -- Buscar e validar token
  IF _token IS NOT NULL THEN
    SELECT * INTO v_row
    FROM public.tokens_auto_cadastro
    WHERE token = _token
    LIMIT 1;

    IF v_row.id IS NULL THEN
      RAISE EXCEPTION 'Link inválido';
    END IF;
    IF v_row.usado THEN
      RAISE EXCEPTION 'Link já utilizado';
    END IF;
    IF v_row.expira_em < now() THEN
      RAISE EXCEPTION 'Link expirado';
    END IF;
  END IF;

  -- Origem baseada no tipo do token
  v_origem := CASE
    WHEN v_row.tipo = 'qrcode'   THEN 'QR Code'
    WHEN v_row.tipo = 'whatsapp' THEN 'WhatsApp'
    ELSE 'Auto-cadastro'
  END;

  -- Telefone do destinatário prevalece (quando link foi enviado por WhatsApp)
  IF v_row.telefone_destino IS NOT NULL THEN
    v_tel := regexp_replace(v_row.telefone_destino, '\D', '', 'g');
  END IF;

  -- Inserir eleitor
  INSERT INTO public.eleitores (
    nome, telefone, telefone_original, cpf, email,
    origem, consentimento_lgpd, aceite_lgpd, data_aceite_lgpd,
    cadastrado_via, lideranca_id, lideranca_origem_id,
    cabo_eleitoral_id, cabo_id, cabo_origem_id,
    company_id, token_cadastro_id,
    validado, validado_em,
    status_validacao_eleitoral, status_validacao_whatsapp,
    telefone_validado,
    whatsapp_origem, whatsapp_bloqueado,
    bairro, cidade, uf
  ) VALUES (
    trim(_nome), v_tel, v_tel,
    nullif(regexp_replace(coalesce(_cpf,''),'\D','','g'), ''),
    nullif(trim(coalesce(_email,'')), ''),
    v_origem, true, true, now(),
    v_origem,
    v_row.lideranca_id, v_row.lideranca_id,
    v_row.cabo_id, v_row.cabo_id, v_row.cabo_id,
    v_row.company_id, v_row.id,
    true, now(),
    'validado', 'validado', true,
    v_tel, (v_row.telefone_destino IS NOT NULL),
    nullif(trim(coalesce(_bairro,'')), ''),
    nullif(trim(coalesce(_cidade,'')), ''),
    nullif(trim(coalesce(_uf,'')), '')
  )
  RETURNING id INTO v_eleitor_id;

  -- Marcar token como usado
  IF v_row.id IS NOT NULL THEN
    UPDATE public.tokens_auto_cadastro
    SET usado = true,
        usado_em = now(),
        usado_por_eleitor_id = v_eleitor_id
    WHERE id = v_row.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'eleitor_id', v_eleitor_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- Conceder acesso público (anon = sem login) + autenticado
GRANT EXECUTE ON FUNCTION public.public_get_token_cadastro(text)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.public_submit_token_cadastro(text,text,text,text,text,text,text,text,boolean)
  TO anon, authenticated;
