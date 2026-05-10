-- Fila de jobs
CREATE TABLE IF NOT EXISTS public.analise_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  tipo text NOT NULL,
  chave text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente',
  prioridade int NOT NULL DEFAULT 5,
  tentativas int NOT NULL DEFAULT 0,
  max_tentativas int NOT NULL DEFAULT 3,
  proximo_em timestamptz NOT NULL DEFAULT now(),
  iniciado_em timestamptz,
  concluido_em timestamptz,
  resultado jsonb,
  erro text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analise_jobs_status_prox ON public.analise_jobs(status, prioridade, proximo_em);
CREATE INDEX IF NOT EXISTS idx_analise_jobs_company ON public.analise_jobs(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_analise_jobs_ativo ON public.analise_jobs(company_id, tipo, chave)
  WHERE status IN ('pendente','processando');

ALTER TABLE public.analise_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analise_jobs_select" ON public.analise_jobs FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "analise_jobs_insert" ON public.analise_jobs FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER trg_analise_jobs_company BEFORE INSERT ON public.analise_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_analise_jobs_updated BEFORE UPDATE ON public.analise_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cache de consultas externas
CREATE TABLE IF NOT EXISTS public.analise_cache_consultas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  fonte text NOT NULL,
  chave text NOT NULL,
  resultado jsonb NOT NULL,
  expira_em timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_analise_cache ON public.analise_cache_consultas(company_id, fonte, chave);
CREATE INDEX IF NOT EXISTS idx_analise_cache_exp ON public.analise_cache_consultas(expira_em);

ALTER TABLE public.analise_cache_consultas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analise_cache_select" ON public.analise_cache_consultas FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "analise_cache_insert" ON public.analise_cache_consultas FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER trg_analise_cache_company BEFORE INSERT ON public.analise_cache_consultas
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- Enfileirar job (idempotente: ignora duplicado ativo)
CREATE OR REPLACE FUNCTION public.analise_job_enfileirar(
  _tipo text,
  _chave text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb,
  _prioridade int DEFAULT 5,
  _max_tentativas int DEFAULT 3
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_company uuid := public.user_default_company(auth.uid());
BEGIN
  INSERT INTO public.analise_jobs(company_id, user_id, tipo, chave, payload, prioridade, max_tentativas)
    VALUES (v_company, auth.uid(), _tipo, _chave, COALESCE(_payload,'{}'::jsonb), _prioridade, _max_tentativas)
    ON CONFLICT (company_id, tipo, chave) WHERE status IN ('pendente','processando')
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
    RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Reservar próximo job com lock (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.analise_job_reservar(_lote int DEFAULT 1)
RETURNS SETOF public.analise_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT id FROM public.analise_jobs
     WHERE status = 'pendente' AND proximo_em <= now()
     ORDER BY prioridade ASC, proximo_em ASC
     FOR UPDATE SKIP LOCKED
     LIMIT _lote
  )
  UPDATE public.analise_jobs j
     SET status = 'processando', iniciado_em = now(), tentativas = tentativas + 1, updated_at = now()
   FROM cte WHERE j.id = cte.id
  RETURNING j.*;
END $$;

-- Concluir/falhar job (com retry exponencial)
CREATE OR REPLACE FUNCTION public.analise_job_concluir(
  _id uuid, _sucesso boolean, _resultado jsonb DEFAULT NULL, _erro text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r RECORD; v_delay int;
BEGIN
  SELECT * INTO r FROM public.analise_jobs WHERE id = _id;
  IF NOT FOUND THEN RETURN; END IF;
  IF _sucesso THEN
    UPDATE public.analise_jobs SET status='sucesso', concluido_em=now(),
      resultado=_resultado, erro=NULL, updated_at=now() WHERE id=_id;
  ELSIF r.tentativas >= r.max_tentativas THEN
    UPDATE public.analise_jobs SET status='erro', concluido_em=now(),
      erro=_erro, updated_at=now() WHERE id=_id;
  ELSE
    v_delay := POWER(2, r.tentativas)::int * 30; -- 30s, 60s, 120s...
    UPDATE public.analise_jobs SET status='pendente',
      proximo_em = now() + (v_delay || ' seconds')::interval,
      erro=_erro, updated_at=now() WHERE id=_id;
  END IF;
END $$;

-- Cache get/set
CREATE OR REPLACE FUNCTION public.analise_cache_obter(_fonte text, _chave text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT resultado FROM public.analise_cache_consultas
   WHERE company_id = public.user_default_company(auth.uid())
     AND fonte = _fonte AND chave = _chave AND expira_em > now()
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.analise_cache_salvar(
  _fonte text, _chave text, _resultado jsonb, _ttl_segundos int DEFAULT 86400
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company uuid := public.user_default_company(auth.uid());
BEGIN
  INSERT INTO public.analise_cache_consultas(company_id, fonte, chave, resultado, expira_em)
    VALUES (v_company, _fonte, _chave, _resultado, now() + (_ttl_segundos || ' seconds')::interval)
    ON CONFLICT (company_id, fonte, chave)
    DO UPDATE SET resultado = EXCLUDED.resultado, expira_em = EXCLUDED.expira_em;
END $$;

-- Limpeza de cache expirado
CREATE OR REPLACE FUNCTION public.analise_cache_limpar()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE n int;
BEGIN
  DELETE FROM public.analise_cache_consultas WHERE expira_em < now() - interval '1 day';
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;