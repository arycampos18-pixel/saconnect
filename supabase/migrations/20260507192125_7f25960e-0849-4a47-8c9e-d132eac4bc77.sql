ALTER TABLE public.analise_logs
  ADD COLUMN IF NOT EXISTS eleitor_id uuid,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS idx_analise_logs_eleitor ON public.analise_logs(eleitor_id);
CREATE INDEX IF NOT EXISTS idx_analise_logs_acao ON public.analise_logs(acao);

CREATE OR REPLACE FUNCTION public.analise_eleitores_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diff jsonb := '{}'::jsonb;
  v_uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.analise_logs(company_id, user_id, acao, entidade, entidade_id, eleitor_id, detalhes)
      VALUES (NEW.company_id, v_uid, 'eleitor.criado', 'analise_eleitores', NEW.id, NEW.id,
        jsonb_build_object('nome', NEW.nome, 'cpf', NEW.cpf, 'origem', NEW.origem));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.validado IS DISTINCT FROM NEW.validado AND NEW.validado = true THEN
      INSERT INTO public.analise_logs(company_id, user_id, acao, entidade, entidade_id, eleitor_id, detalhes)
        VALUES (NEW.company_id, v_uid, 'eleitor.validado', 'analise_eleitores', NEW.id, NEW.id,
          jsonb_build_object('validado_por', NEW.validado_por, 'validado_em', NEW.validado_em));
    END IF;
    IF OLD.status_validacao_eleitoral IS DISTINCT FROM NEW.status_validacao_eleitoral THEN
      v_diff := v_diff || jsonb_build_object('status_validacao_eleitoral', jsonb_build_object('de', OLD.status_validacao_eleitoral, 'para', NEW.status_validacao_eleitoral));
    END IF;
    IF OLD.status_cadastro IS DISTINCT FROM NEW.status_cadastro THEN
      v_diff := v_diff || jsonb_build_object('status_cadastro', jsonb_build_object('de', OLD.status_cadastro, 'para', NEW.status_cadastro));
    END IF;
    IF OLD.nome IS DISTINCT FROM NEW.nome THEN
      v_diff := v_diff || jsonb_build_object('nome', jsonb_build_object('de', OLD.nome, 'para', NEW.nome));
    END IF;
    IF OLD.telefone IS DISTINCT FROM NEW.telefone THEN
      v_diff := v_diff || jsonb_build_object('telefone', jsonb_build_object('de', OLD.telefone, 'para', NEW.telefone));
    END IF;
    IF OLD.cpf IS DISTINCT FROM NEW.cpf THEN
      v_diff := v_diff || jsonb_build_object('cpf', jsonb_build_object('de', OLD.cpf, 'para', NEW.cpf));
    END IF;
    IF OLD.lideranca_id IS DISTINCT FROM NEW.lideranca_id THEN
      v_diff := v_diff || jsonb_build_object('lideranca_id', jsonb_build_object('de', OLD.lideranca_id, 'para', NEW.lideranca_id));
    END IF;
    IF v_diff <> '{}'::jsonb THEN
      INSERT INTO public.analise_logs(company_id, user_id, acao, entidade, entidade_id, eleitor_id, detalhes)
        VALUES (NEW.company_id, v_uid, 'eleitor.editado', 'analise_eleitores', NEW.id, NEW.id, v_diff);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.analise_logs(company_id, user_id, acao, entidade, entidade_id, eleitor_id, detalhes)
      VALUES (OLD.company_id, v_uid, 'eleitor.removido', 'analise_eleitores', OLD.id, OLD.id,
        jsonb_build_object('nome', OLD.nome));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_analise_eleitores_audit ON public.analise_eleitores;
CREATE TRIGGER trg_analise_eleitores_audit
AFTER INSERT OR UPDATE OR DELETE ON public.analise_eleitores
FOR EACH ROW EXECUTE FUNCTION public.analise_eleitores_audit();

CREATE OR REPLACE FUNCTION public.analise_log_registrar(
  _acao text,
  _entidade text DEFAULT NULL,
  _entidade_id uuid DEFAULT NULL,
  _eleitor_id uuid DEFAULT NULL,
  _detalhes jsonb DEFAULT '{}'::jsonb,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid; v_company uuid := public.user_default_company(auth.uid());
BEGIN
  INSERT INTO public.analise_logs(company_id, user_id, acao, entidade, entidade_id, eleitor_id, detalhes, ip, user_agent)
    VALUES (v_company, auth.uid(), _acao, _entidade, _entidade_id, _eleitor_id, COALESCE(_detalhes,'{}'::jsonb), _ip, _user_agent)
    RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.analise_eleitor_historico(_eleitor_id uuid)
RETURNS TABLE(
  tipo text,
  titulo text,
  detalhes jsonb,
  user_id uuid,
  ip text,
  user_agent text,
  ocorrido_em timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT 'log'::text AS tipo, l.acao AS titulo, l.detalhes, l.user_id, l.ip, l.user_agent, l.created_at AS ocorrido_em
      FROM public.analise_logs l WHERE l.eleitor_id = _eleitor_id
    UNION ALL
    SELECT 'api'::text, c.api_nome || ':' || c.status, c.metadata, c.user_id, NULL::text, NULL::text, c.created_at
      FROM public.api_consultas_custos c WHERE c.eleitor_id = _eleitor_id
    UNION ALL
    SELECT 'lgpd'::text,
           CASE WHEN g.revogado_em IS NULL THEN 'consentimento.aceito' ELSE 'consentimento.revogado' END,
           jsonb_build_object('finalidade', g.finalidade, 'canal', g.canal, 'texto_versao', g.texto_versao),
           COALESCE(g.revogado_por, g.created_by), g.ip, g.user_agent,
           COALESCE(g.revogado_em, g.created_at)
      FROM public.lgpd_consentimentos g WHERE g.eleitor_id = _eleitor_id
  ) h ORDER BY h.ocorrido_em DESC;
$$;