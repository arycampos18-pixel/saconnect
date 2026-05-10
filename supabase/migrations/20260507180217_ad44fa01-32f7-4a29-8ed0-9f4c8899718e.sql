
-- ============================================================
-- PROMPT 02 — Novos campos do cadastro de eleitor
-- ============================================================

ALTER TABLE public.analise_eleitores
  ADD COLUMN IF NOT EXISTS telefone_original TEXT,
  ADD COLUMN IF NOT EXISTS telefone_validado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nome_mae_extra TEXT, -- mantemos nome_mae existente; coluna extra disponível p/ futuras divergências
  ADD COLUMN IF NOT EXISTS titulo_eleitoral TEXT,
  ADD COLUMN IF NOT EXISTS zona_eleitoral TEXT,
  ADD COLUMN IF NOT EXISTS secao_eleitoral TEXT,
  ADD COLUMN IF NOT EXISTS local_votacao TEXT,
  ADD COLUMN IF NOT EXISTS municipio_eleitoral TEXT,
  ADD COLUMN IF NOT EXISTS uf_eleitoral TEXT,
  ADD COLUMN IF NOT EXISTS status_validacao_eleitoral TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS status_validacao_whatsapp TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS status_cadastro TEXT NOT NULL DEFAULT 'incompleto',
  ADD COLUMN IF NOT EXISTS score_confianca INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_ultima_consulta TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_divergencia TEXT,
  ADD COLUMN IF NOT EXISTS aceite_lgpd BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_aceite_lgpd TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lideranca_id UUID;

-- Migração leve: copiar telefone -> telefone_original quando vazio (preserva valor oficial)
UPDATE public.analise_eleitores
   SET telefone_original = telefone
 WHERE telefone_original IS NULL AND telefone IS NOT NULL;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_analise_eleitores_titulo ON public.analise_eleitores(titulo_eleitoral);
CREATE INDEX IF NOT EXISTS idx_analise_eleitores_lideranca ON public.analise_eleitores(lideranca_id);
CREATE INDEX IF NOT EXISTS idx_analise_eleitores_status_cad ON public.analise_eleitores(status_cadastro);
CREATE INDEX IF NOT EXISTS idx_analise_eleitores_status_val ON public.analise_eleitores(status_validacao_eleitoral);

-- ============================================================
-- Validação estrutural de CPF + proteção do telefone_original
-- ============================================================
CREATE OR REPLACE FUNCTION public.analise_eleitores_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_cpf TEXT;
  v_digits TEXT;
  v_sum INT;
  v_d1 INT;
  v_d2 INT;
  i INT;
BEGIN
  -- Valida CPF estruturalmente (somente quando informado)
  IF NEW.cpf IS NOT NULL AND length(trim(NEW.cpf)) > 0 THEN
    v_digits := regexp_replace(NEW.cpf, '\D', '', 'g');

    IF length(v_digits) <> 11 THEN
      RAISE EXCEPTION 'CPF inválido: deve conter 11 dígitos';
    END IF;

    -- rejeita sequências repetidas (000... 111... 999...)
    IF v_digits ~ '^(\d)\1{10}$' THEN
      RAISE EXCEPTION 'CPF inválido: sequência repetida';
    END IF;

    -- 1º dígito verificador
    v_sum := 0;
    FOR i IN 1..9 LOOP
      v_sum := v_sum + substr(v_digits, i, 1)::int * (11 - i);
    END LOOP;
    v_d1 := (v_sum * 10) % 11;
    IF v_d1 = 10 THEN v_d1 := 0; END IF;
    IF v_d1 <> substr(v_digits, 10, 1)::int THEN
      RAISE EXCEPTION 'CPF inválido: dígito verificador incorreto';
    END IF;

    -- 2º dígito verificador
    v_sum := 0;
    FOR i IN 1..10 LOOP
      v_sum := v_sum + substr(v_digits, i, 1)::int * (12 - i);
    END LOOP;
    v_d2 := (v_sum * 10) % 11;
    IF v_d2 = 10 THEN v_d2 := 0; END IF;
    IF v_d2 <> substr(v_digits, 11, 1)::int THEN
      RAISE EXCEPTION 'CPF inválido: dígito verificador incorreto';
    END IF;

    -- normaliza para somente dígitos
    NEW.cpf := v_digits;
  END IF;

  -- telefone_original: definir uma única vez e nunca permitir alteração por update
  IF TG_OP = 'INSERT' THEN
    IF NEW.telefone_original IS NULL OR length(trim(NEW.telefone_original)) = 0 THEN
      NEW.telefone_original := NEW.telefone;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Bloqueia qualquer alteração no telefone oficial
    IF OLD.telefone_original IS NOT NULL
       AND NEW.telefone_original IS DISTINCT FROM OLD.telefone_original THEN
      NEW.telefone_original := OLD.telefone_original;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_analise_eleitores_validate ON public.analise_eleitores;
CREATE TRIGGER trg_analise_eleitores_validate
  BEFORE INSERT OR UPDATE ON public.analise_eleitores
  FOR EACH ROW EXECUTE FUNCTION public.analise_eleitores_validate();
