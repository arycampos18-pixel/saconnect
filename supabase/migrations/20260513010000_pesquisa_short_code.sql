-- Adiciona código curto às pesquisas (7 chars base36: letras minúsculas + números)
-- Gerado a partir dos primeiros chars do slug (UUID-hex, sem hífens)

ALTER TABLE public.pesquisas
  ADD COLUMN IF NOT EXISTS short_code TEXT;

-- Gera short_code para pesquisas existentes usando os primeiros 7 chars do slug
UPDATE public.pesquisas
  SET short_code = lower(left(slug, 7))
  WHERE short_code IS NULL;

-- Garante unicidade
DO $$
DECLARE dup TEXT;
BEGIN
  -- Corrige eventuais colisões (muito improvável com UUID-base)
  FOR dup IN
    SELECT short_code FROM public.pesquisas
    GROUP BY short_code HAVING count(*) > 1
  LOOP
    -- Para colisões, usa 7 chars a partir do meio do slug
    UPDATE public.pesquisas
      SET short_code = lower(substring(slug FROM 8 FOR 7))
      WHERE short_code = dup
        AND id = (
          SELECT id FROM public.pesquisas WHERE short_code = dup ORDER BY created_at DESC LIMIT 1
        );
  END LOOP;
END $$;

-- Constraint única
ALTER TABLE public.pesquisas
  ADD CONSTRAINT pesquisas_short_code_unique UNIQUE (short_code);

-- NOT NULL agora que todos têm valor
ALTER TABLE public.pesquisas
  ALTER COLUMN short_code SET NOT NULL;

-- Trigger para pesquisas novas — gera short_code automaticamente
CREATE OR REPLACE FUNCTION public.pesquisa_gerar_short_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tentativa TEXT;
  i INT := 0;
BEGIN
  IF NEW.short_code IS NULL OR NEW.short_code = '' THEN
    LOOP
      tentativa := lower(left(replace(gen_random_uuid()::text, '-', ''), 7));
      IF NOT EXISTS (SELECT 1 FROM public.pesquisas WHERE short_code = tentativa) THEN
        NEW.short_code := tentativa;
        EXIT;
      END IF;
      i := i + 1;
      IF i > 20 THEN
        NEW.short_code := lower(left(replace(gen_random_uuid()::text, '-', ''), 10));
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pesquisa_short_code ON public.pesquisas;
CREATE TRIGGER trg_pesquisa_short_code
  BEFORE INSERT ON public.pesquisas
  FOR EACH ROW EXECUTE FUNCTION public.pesquisa_gerar_short_code();

-- RPC pública para buscar pesquisa por short_code (sem JWT)
CREATE OR REPLACE FUNCTION public.public_get_pesquisa_by_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pesquisa public.pesquisas;
  v_perguntas jsonb;
BEGIN
  SELECT * INTO v_pesquisa
  FROM public.pesquisas
  WHERE (short_code = lower(_code) OR slug = _code)
    AND status = 'Ativa'
  LIMIT 1;

  IF v_pesquisa.id IS NULL THEN
    RETURN jsonb_build_object('encontrado', false);
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'texto', texto,
      'tipo', tipo,
      'opcoes', opcoes,
      'ordem', ordem
    ) ORDER BY ordem
  )
  INTO v_perguntas
  FROM public.pesquisa_perguntas
  WHERE pesquisa_id = v_pesquisa.id;

  RETURN jsonb_build_object(
    'encontrado', true,
    'pesquisa', jsonb_build_object(
      'id',          v_pesquisa.id,
      'titulo',      v_pesquisa.titulo,
      'tipo',        v_pesquisa.tipo,
      'status',      v_pesquisa.status,
      'slug',        v_pesquisa.slug,
      'short_code',  v_pesquisa.short_code
    ),
    'perguntas', coalesce(v_perguntas, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_pesquisa_by_code(text) TO anon, authenticated;

-- RPC pública para submeter respostas (sem JWT)
CREATE OR REPLACE FUNCTION public.public_submit_pesquisa(
  _pesquisa_id  uuid,
  _sessao_id    uuid,
  _nome         text,
  _telefone     text,
  _respostas    jsonb  -- array de {pergunta_id, resposta}
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_tel  text;
  v_ja   boolean;
BEGIN
  v_tel := regexp_replace(coalesce(_telefone, ''), '\D', '', 'g');
  IF length(trim(coalesce(_nome,''))) < 2 THEN RAISE EXCEPTION 'Nome inválido'; END IF;
  IF length(v_tel) < 10 THEN RAISE EXCEPTION 'Telefone inválido'; END IF;

  -- Verificar se já respondeu
  SELECT EXISTS(
    SELECT 1 FROM public.pesquisa_respostas pr
    WHERE pr.pesquisa_id = _pesquisa_id
      AND regexp_replace(pr.participante_telefone, '\D','','g') = v_tel
  ) INTO v_ja;

  IF v_ja THEN RAISE EXCEPTION 'Este telefone já respondeu a esta pesquisa'; END IF;

  -- Inserir respostas
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
      trim(_nome),
      _telefone
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_submit_pesquisa(uuid, uuid, text, text, jsonb)
  TO anon, authenticated;
