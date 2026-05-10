
CREATE TABLE IF NOT EXISTS public.lgpd_consentimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  eleitor_id UUID REFERENCES public.analise_eleitores(id) ON DELETE CASCADE,
  titular_nome TEXT,
  titular_documento TEXT,
  finalidade TEXT NOT NULL,
  base_legal TEXT NOT NULL DEFAULT 'consentimento',
  canal TEXT,
  ip TEXT,
  user_agent TEXT,
  texto_versao TEXT,
  aceite BOOLEAN NOT NULL DEFAULT true,
  revogado_em TIMESTAMPTZ,
  revogado_por UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lgpd_cons_eleitor_idx ON public.lgpd_consentimentos(eleitor_id);
CREATE INDEX IF NOT EXISTS lgpd_cons_company_idx ON public.lgpd_consentimentos(company_id);
ALTER TABLE public.lgpd_consentimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lgpd_cons_select ON public.lgpd_consentimentos;
CREATE POLICY lgpd_cons_select ON public.lgpd_consentimentos FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
DROP POLICY IF EXISTS lgpd_cons_insert ON public.lgpd_consentimentos;
CREATE POLICY lgpd_cons_insert ON public.lgpd_consentimentos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS lgpd_cons_update ON public.lgpd_consentimentos;
CREATE POLICY lgpd_cons_update ON public.lgpd_consentimentos FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

DROP TRIGGER IF EXISTS lgpd_cons_set_company ON public.lgpd_consentimentos;
CREATE TRIGGER lgpd_cons_set_company BEFORE INSERT ON public.lgpd_consentimentos
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

DO $$ BEGIN
  CREATE TYPE public.lgpd_solicitacao_tipo AS ENUM ('exclusao','correcao','exportacao','revogacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.lgpd_solicitacao_status AS ENUM ('aberta','em_analise','aprovada','rejeitada','concluida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.lgpd_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  eleitor_id UUID REFERENCES public.analise_eleitores(id) ON DELETE SET NULL,
  tipo public.lgpd_solicitacao_tipo NOT NULL,
  status public.lgpd_solicitacao_status NOT NULL DEFAULT 'aberta',
  motivo TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  resposta TEXT,
  solicitado_por UUID,
  atendido_por UUID,
  atendido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lgpd_sol_select ON public.lgpd_solicitacoes;
CREATE POLICY lgpd_sol_select ON public.lgpd_solicitacoes FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
DROP POLICY IF EXISTS lgpd_sol_insert ON public.lgpd_solicitacoes;
CREATE POLICY lgpd_sol_insert ON public.lgpd_solicitacoes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS lgpd_sol_update ON public.lgpd_solicitacoes;
CREATE POLICY lgpd_sol_update ON public.lgpd_solicitacoes FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), company_id, 'lgpd.gerenciar'));

DROP TRIGGER IF EXISTS lgpd_sol_set_company ON public.lgpd_solicitacoes;
CREATE TRIGGER lgpd_sol_set_company BEFORE INSERT ON public.lgpd_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

INSERT INTO public.settings_permissions(id, module, description) VALUES
  ('lgpd.visualizar', 'lgpd', 'Visualizar LGPD - consentimentos e solicitações'),
  ('lgpd.gerenciar', 'lgpd', 'Gerenciar LGPD - atender exclusão/correção/exportação'),
  ('lgpd.exportar', 'lgpd', 'Exportar dados pessoais'),
  ('lgpd.ver_cpf', 'lgpd', 'Ver CPF completo (sem máscara)')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.lgpd_pode_ver_cpf(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.user_has_permission(_user_id, _company_id, 'lgpd.ver_cpf');
$$;

CREATE OR REPLACE FUNCTION public.lgpd_pode_exportar(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.user_has_permission(_user_id, _company_id, 'lgpd.exportar');
$$;

CREATE OR REPLACE FUNCTION public.mask_cpf(_cpf text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _cpf IS NULL OR length(regexp_replace(_cpf,'\D','','g')) <> 11 THEN _cpf
    ELSE '***.' || substring(regexp_replace(_cpf,'\D','','g'),4,3) || '.' || substring(regexp_replace(_cpf,'\D','','g'),7,3) || '-**'
  END;
$$;

CREATE OR REPLACE FUNCTION public.lgpd_registrar_consentimento(
  _eleitor_id uuid, _finalidade text, _texto_versao text DEFAULT NULL,
  _canal text DEFAULT 'sistema', _ip text DEFAULT NULL, _user_agent text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company UUID; v_id UUID; v_nome TEXT; v_doc TEXT;
BEGIN
  SELECT company_id, nome, cpf INTO v_company, v_nome, v_doc
    FROM public.analise_eleitores WHERE id = _eleitor_id;
  INSERT INTO public.lgpd_consentimentos (
    company_id, eleitor_id, titular_nome, titular_documento, finalidade,
    base_legal, canal, ip, user_agent, texto_versao, aceite, created_by
  ) VALUES (
    v_company, _eleitor_id, v_nome, v_doc, _finalidade,
    'consentimento', _canal, _ip, _user_agent, _texto_versao, true, auth.uid()
  ) RETURNING id INTO v_id;
  UPDATE public.analise_eleitores
    SET aceite_lgpd = true, data_aceite_lgpd = now()
    WHERE id = _eleitor_id;
  INSERT INTO public.analise_logs(user_id, acao, entidade, entidade_id, detalhes)
    VALUES (auth.uid(), 'lgpd.consentimento.registrado','lgpd_consentimentos',v_id,
      jsonb_build_object('eleitor_id', _eleitor_id, 'finalidade', _finalidade));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.lgpd_revogar_consentimento(_consentimento_id uuid, _motivo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_eleitor UUID;
BEGIN
  UPDATE public.lgpd_consentimentos
    SET revogado_em = now(), revogado_por = auth.uid(), aceite = false
    WHERE id = _consentimento_id RETURNING eleitor_id INTO v_eleitor;
  IF v_eleitor IS NOT NULL THEN
    UPDATE public.analise_eleitores SET aceite_lgpd = false WHERE id = v_eleitor;
  END IF;
  INSERT INTO public.analise_logs(user_id, acao, entidade, entidade_id, detalhes)
    VALUES (auth.uid(), 'lgpd.consentimento.revogado','lgpd_consentimentos',_consentimento_id,
      jsonb_build_object('motivo', _motivo));
END $$;

CREATE OR REPLACE FUNCTION public.lgpd_anonimizar_eleitor(_eleitor_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company UUID;
BEGIN
  SELECT company_id INTO v_company FROM public.analise_eleitores WHERE id = _eleitor_id;
  IF NOT (public.is_super_admin(auth.uid())
          OR public.user_has_permission(auth.uid(), v_company, 'lgpd.gerenciar')) THEN
    RAISE EXCEPTION 'Sem permissão para anonimizar dados pessoais';
  END IF;
  UPDATE public.analise_eleitores SET
    nome = '[ANONIMIZADO]',
    cpf = NULL, titulo_eleitor = NULL, titulo_eleitoral = NULL,
    nome_mae = NULL, nome_mae_extra = NULL, email = NULL,
    telefone = NULL, telefone_original = NULL, data_nascimento = NULL,
    observacoes = NULL, metadata = '{}'::jsonb,
    aceite_lgpd = false, status_cadastro = 'anonimizado'
  WHERE id = _eleitor_id;
  INSERT INTO public.analise_logs(user_id, acao, entidade, entidade_id, detalhes)
    VALUES (auth.uid(), 'lgpd.anonimizado','analise_eleitores',_eleitor_id,
      jsonb_build_object('motivo', _motivo));
END $$;

CREATE OR REPLACE FUNCTION public.lgpd_atender_solicitacao(
  _id uuid, _status public.lgpd_solicitacao_status, _resposta text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.lgpd_solicitacoes
    SET status = _status, resposta = _resposta,
        atendido_por = auth.uid(), atendido_em = now()
    WHERE id = _id;
  INSERT INTO public.analise_logs(user_id, acao, entidade, entidade_id, detalhes)
    VALUES (auth.uid(), 'lgpd.solicitacao.' || _status::text,'lgpd_solicitacoes',_id,
      jsonb_build_object('resposta', _resposta));
END $$;
