
CREATE OR REPLACE FUNCTION public.public_get_cabo_link(_token text)
RETURNS TABLE(id uuid, nome text, ativo boolean, expires_at timestamptz, cabo_nome text, company_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.id, l.nome, l.ativo, l.expires_at, c.nome AS cabo_nome, l.company_id
  FROM public.cabo_links_captacao l
  JOIN public.cabos_eleitorais c ON c.id = l.cabo_eleitoral_id
  WHERE l.token = _token
    AND l.ativo = true
    AND (l.expires_at IS NULL OR l.expires_at > now())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.public_submit_cabo_link(
  _token text, _nome text, _telefone text,
  _bairro text DEFAULT NULL, _cidade text DEFAULT NULL, _uf text DEFAULT NULL,
  _cep text DEFAULT NULL, _rua text DEFAULT NULL, _numero text DEFAULT NULL, _complemento text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_link public.cabo_links_captacao;
  v_cabo public.cabos_eleitorais;
  v_id UUID;
BEGIN
  SELECT * INTO v_link FROM public.cabo_links_captacao
   WHERE token = _token AND ativo = true
     AND (expires_at IS NULL OR expires_at > now())
   LIMIT 1;
  IF v_link.id IS NULL THEN RAISE EXCEPTION 'Link inválido ou expirado'; END IF;

  IF length(coalesce(_nome,'')) < 3 THEN RAISE EXCEPTION 'Nome obrigatório'; END IF;
  IF length(regexp_replace(coalesce(_telefone,''), '\D', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'Telefone inválido';
  END IF;

  SELECT * INTO v_cabo FROM public.cabos_eleitorais WHERE id = v_link.cabo_eleitoral_id;

  INSERT INTO public.eleitores (
    nome, telefone, bairro, cidade, uf, cep, rua, numero, complemento,
    origem, consentimento_lgpd, company_id, ativo,
    cabo_eleitoral_id, lideranca_id
  ) VALUES (
    _nome, _telefone, _bairro, _cidade, _uf, _cep, _rua, _numero, _complemento,
    'Link Cabo', true, v_link.company_id, true,
    v_cabo.id, v_cabo.lideranca_id
  ) RETURNING id INTO v_id;

  UPDATE public.cabo_links_captacao
    SET total_cadastros = total_cadastros + 1, updated_at = now()
    WHERE id = v_link.id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_cabo_link(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_cabo_link(text,text,text,text,text,text,text,text,text,text) TO anon, authenticated;
