-- ============================================================
-- Metadados de sessão coletados no browser durante pesquisa pública
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pesquisa_sessao_metadata (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id     UUID NOT NULL REFERENCES public.pesquisas(id) ON DELETE CASCADE,
  sessao_id       UUID NOT NULL,
  telefone        TEXT,
  nome            TEXT,

  -- Rede / IP (preenchido pelo backend/edge)
  ip_address      TEXT,

  -- Fingerprint (FingerprintJS)
  fingerprint_id  TEXT,

  -- Navegação
  url_pagina      TEXT,
  url_origem      TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,

  -- Dispositivo / Browser
  user_agent      TEXT,
  idioma          TEXT,
  plataforma      TEXT,
  timezone        TEXT,
  touch           BOOLEAN,
  online          BOOLEAN,
  cookies         BOOLEAN,
  memoria_gb      NUMERIC,
  nucleos_cpu     INTEGER,

  -- Tela
  tela_largura    INTEGER,
  tela_altura     INTEGER,
  tela_cor_depth  INTEGER,

  -- Localização (só com permissão do usuário)
  geo_latitude    NUMERIC,
  geo_longitude   NUMERIC,
  geo_precisao    NUMERIC,

  -- Timestamps
  data_hora_local TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psm_pesquisa   ON public.pesquisa_sessao_metadata (pesquisa_id);
CREATE INDEX IF NOT EXISTS idx_psm_sessao     ON public.pesquisa_sessao_metadata (sessao_id);
CREATE INDEX IF NOT EXISTS idx_psm_telefone   ON public.pesquisa_sessao_metadata (telefone);
CREATE INDEX IF NOT EXISTS idx_psm_fp         ON public.pesquisa_sessao_metadata (fingerprint_id);

ALTER TABLE public.pesquisa_sessao_metadata ENABLE ROW LEVEL SECURITY;

-- Anon pode inserir (formulário público)
CREATE POLICY "psm_insert_anon" ON public.pesquisa_sessao_metadata
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Usuários autenticados podem ler metadados das pesquisas da sua empresa
CREATE POLICY "psm_select_auth" ON public.pesquisa_sessao_metadata
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.pesquisas p
      WHERE p.id = pesquisa_id
    )
  );

-- ── Atualiza public_submit_pesquisa para aceitar metadados ──────────────────

CREATE OR REPLACE FUNCTION public.public_submit_pesquisa(
  _pesquisa_id  uuid,
  _sessao_id    uuid,
  _nome         text,
  _telefone     text,
  _respostas    jsonb,
  _metadata     jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item  jsonb;
  v_tel   text;
  v_ja    boolean;
  v_nome  text;
  v_ip    text;
  v_m     jsonb;
BEGIN
  v_tel  := regexp_replace(coalesce(_telefone, ''), '\D', '', 'g');
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
      v_nome,
      _telefone
    );
  END LOOP;

  -- Inserir metadados de sessão (se fornecido)
  IF _metadata IS NOT NULL THEN
    v_m := _metadata;
    INSERT INTO public.pesquisa_sessao_metadata (
      pesquisa_id, sessao_id, telefone, nome,
      ip_address, fingerprint_id,
      url_pagina, url_origem, utm_source, utm_medium, utm_campaign,
      user_agent, idioma, plataforma, timezone, touch, online, cookies,
      memoria_gb, nucleos_cpu,
      tela_largura, tela_altura, tela_cor_depth,
      geo_latitude, geo_longitude, geo_precisao,
      data_hora_local
    ) VALUES (
      _pesquisa_id, _sessao_id, _telefone, v_nome,
      v_m->>'ip_address',
      v_m->>'fingerprint_id',
      v_m->>'url',
      v_m->>'origem',
      v_m->>'utm_source',
      v_m->>'utm_medium',
      v_m->>'utm_campaign',
      v_m->>'navegador',
      v_m->>'idioma',
      v_m->>'plataforma',
      v_m->>'timezone',
      (v_m->>'touch')::boolean,
      (v_m->>'online')::boolean,
      (v_m->>'cookies')::boolean,
      (v_m->>'memoria')::numeric,
      (v_m->>'cpu')::integer,
      (v_m->>'larguraTela')::integer,
      (v_m->>'alturaTela')::integer,
      (v_m->>'profundidadeCor')::integer,
      (v_m #>> '{localizacao,latitude}')::numeric,
      (v_m #>> '{localizacao,longitude}')::numeric,
      (v_m #>> '{localizacao,precisao}')::numeric,
      (v_m->>'dataHora')::timestamptz
    );
  END IF;

  RETURN jsonb_build_object('ok', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_submit_pesquisa(uuid, uuid, text, text, jsonb, jsonb)
  TO anon, authenticated;
