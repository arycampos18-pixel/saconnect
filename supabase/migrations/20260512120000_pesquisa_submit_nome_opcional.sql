-- Nome opcional na submissão pública da pesquisa (só WhatsApp obrigatório)
CREATE OR REPLACE FUNCTION public.public_submit_pesquisa(
  _pesquisa_id  uuid,
  _sessao_id    uuid,
  _nome         text,
  _telefone     text,
  _respostas    jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_tel  text;
  v_ja   boolean;
  v_nome text;
BEGIN
  v_tel := regexp_replace(coalesce(_telefone, ''), '\D', '', 'g');
  v_nome := trim(coalesce(_nome, ''));

  IF v_nome <> '' AND length(v_nome) < 2 THEN
    RAISE EXCEPTION 'Nome inválido (mínimo 2 caracteres se informar o nome)';
  END IF;
  IF length(v_tel) < 10 THEN RAISE EXCEPTION 'Telefone inválido'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.pesquisa_respostas pr
    WHERE pr.pesquisa_id = _pesquisa_id
      AND regexp_replace(pr.participante_telefone, '\D', '', 'g') = v_tel
  ) INTO v_ja;

  IF v_ja THEN RAISE EXCEPTION 'Este telefone já respondeu a esta pesquisa'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_respostas)
  LOOP
    INSERT INTO public.pesquisa_respostas (
      pesquisa_id, pergunta_id, resposta, sessao_id,
      participante_nome, participante_telefone
    ) VALUES (
      _pesquisa_id,
      (v_item->>'pergunta_id')::uuid,
      v_item->>'resposta',
      _sessao_id,
      v_nome,
      _telefone
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;
