
CREATE TABLE public.analise_duplicidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  eleitor_id UUID NOT NULL REFERENCES public.analise_eleitores(id) ON DELETE CASCADE,
  eleitor_duplicado_id UUID NOT NULL REFERENCES public.analise_eleitores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'possível duplicidade',
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  revisado_por UUID,
  revisado_em TIMESTAMPTZ,
  decisao TEXT,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT analise_dup_unique UNIQUE (eleitor_id, eleitor_duplicado_id, tipo)
);
CREATE INDEX idx_analise_dup_company ON public.analise_duplicidades(company_id, status);
CREATE INDEX idx_analise_dup_eleitor ON public.analise_duplicidades(eleitor_id);

ALTER TABLE public.analise_duplicidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view dup company" ON public.analise_duplicidades
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "manage dup company" ON public.analise_duplicidades
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER trg_analise_dup_updated
BEFORE UPDATE ON public.analise_duplicidades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função/trigger para detectar duplicidade
CREATE OR REPLACE FUNCTION public.analise_eleitores_detectar_duplicidade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing RECORD;
  v_tel TEXT;
BEGIN
  -- 1) CPF idêntico: bloqueia
  IF NEW.cpf IS NOT NULL AND length(trim(NEW.cpf)) > 0 THEN
    SELECT id, nome INTO v_existing
    FROM public.analise_eleitores
    WHERE company_id = NEW.company_id
      AND cpf = NEW.cpf
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;
    IF FOUND THEN
      IF TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'CPF % já cadastrado para o eleitor %', NEW.cpf, v_existing.nome
          USING ERRCODE = 'unique_violation';
      ELSE
        INSERT INTO public.analise_duplicidades (company_id, eleitor_id, eleitor_duplicado_id, tipo, detalhes)
        VALUES (NEW.company_id, NEW.id, v_existing.id, 'cpf',
          jsonb_build_object('valor', NEW.cpf))
        ON CONFLICT (eleitor_id, eleitor_duplicado_id, tipo) DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- 2) Telefone igual: alerta (não bloqueia)
  v_tel := regexp_replace(COALESCE(NEW.telefone_original, NEW.telefone, ''), '\D', '', 'g');
  IF length(v_tel) >= 10 THEN
    FOR v_existing IN
      SELECT id, nome FROM public.analise_eleitores
      WHERE company_id = NEW.company_id
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND regexp_replace(COALESCE(telefone_original, telefone, ''), '\D', '', 'g') = v_tel
      LIMIT 5
    LOOP
      INSERT INTO public.analise_duplicidades (company_id, eleitor_id, eleitor_duplicado_id, tipo, detalhes)
      VALUES (NEW.company_id, COALESCE(NEW.id, gen_random_uuid()), v_existing.id, 'telefone',
        jsonb_build_object('valor', v_tel))
      ON CONFLICT (eleitor_id, eleitor_duplicado_id, tipo) DO NOTHING;
    END LOOP;
  END IF;

  -- 3) Nome + data_nascimento iguais
  IF NEW.nome IS NOT NULL AND NEW.data_nascimento IS NOT NULL THEN
    FOR v_existing IN
      SELECT id, nome FROM public.analise_eleitores
      WHERE company_id = NEW.company_id
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND lower(unaccent(trim(nome))) = lower(unaccent(trim(NEW.nome)))
        AND data_nascimento = NEW.data_nascimento
      LIMIT 5
    LOOP
      INSERT INTO public.analise_duplicidades (company_id, eleitor_id, eleitor_duplicado_id, tipo, detalhes)
      VALUES (NEW.company_id, COALESCE(NEW.id, gen_random_uuid()), v_existing.id, 'nome_nascimento',
        jsonb_build_object('nome', NEW.nome, 'data_nascimento', NEW.data_nascimento))
      ON CONFLICT (eleitor_id, eleitor_duplicado_id, tipo) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN undefined_function THEN
    -- fallback se unaccent não estiver disponível
    RETURN NEW;
END $$;

CREATE TRIGGER trg_analise_eleitores_dup
AFTER INSERT OR UPDATE OF cpf, telefone, telefone_original, nome, data_nascimento
ON public.analise_eleitores
FOR EACH ROW EXECUTE FUNCTION public.analise_eleitores_detectar_duplicidade();

-- Trigger BEFORE INSERT só pra bloquear CPF duplicado com mensagem clara
CREATE OR REPLACE FUNCTION public.analise_eleitores_bloquear_cpf_dup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nome TEXT;
BEGIN
  IF NEW.cpf IS NOT NULL AND length(trim(NEW.cpf)) > 0 THEN
    SELECT nome INTO v_nome FROM public.analise_eleitores
    WHERE company_id = NEW.company_id AND cpf = NEW.cpf LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'CPF % já cadastrado para o eleitor %', NEW.cpf, v_nome
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_analise_eleitores_bloquear_cpf_dup
BEFORE INSERT ON public.analise_eleitores
FOR EACH ROW EXECUTE FUNCTION public.analise_eleitores_bloquear_cpf_dup();

-- RPC para revisão manual
CREATE OR REPLACE FUNCTION public.analise_duplicidade_revisar(
  _id UUID,
  _decisao TEXT,
  _motivo TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status TEXT;
BEGIN
  IF _decisao NOT IN ('confirmada', 'descartada') THEN
    RAISE EXCEPTION 'Decisão inválida';
  END IF;
  v_status := CASE WHEN _decisao = 'confirmada' THEN 'duplicidade confirmada' ELSE 'descartada' END;
  UPDATE public.analise_duplicidades
  SET status = v_status, decisao = _decisao, motivo = _motivo,
      revisado_por = auth.uid(), revisado_em = now()
  WHERE id = _id;
END $$;
