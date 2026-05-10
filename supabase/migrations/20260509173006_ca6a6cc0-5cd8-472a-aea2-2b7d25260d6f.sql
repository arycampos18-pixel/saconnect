
-- Tabela de opt-out
CREATE TABLE IF NOT EXISTS public.wa_bulk_optout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  telefone TEXT NOT NULL,
  telefone_digits TEXT NOT NULL,
  motivo TEXT,
  origem TEXT NOT NULL DEFAULT 'manual', -- manual | palavra_chave | webhook | import
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, telefone_digits)
);

CREATE INDEX IF NOT EXISTS idx_wa_bulk_optout_company_digits
  ON public.wa_bulk_optout(company_id, telefone_digits);

ALTER TABLE public.wa_bulk_optout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_bulk_optout_select"
  ON public.wa_bulk_optout FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "wa_bulk_optout_insert"
  ON public.wa_bulk_optout FOR INSERT
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "wa_bulk_optout_update"
  ON public.wa_bulk_optout FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "wa_bulk_optout_delete"
  ON public.wa_bulk_optout FOR DELETE
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_wa_bulk_optout_updated ON public.wa_bulk_optout;
CREATE TRIGGER trg_wa_bulk_optout_updated
  BEFORE UPDATE ON public.wa_bulk_optout
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Normaliza telefone_digits
CREATE OR REPLACE FUNCTION public.wa_bulk_optout_set_digits()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.telefone_digits := regexp_replace(COALESCE(NEW.telefone,''), '\D', '', 'g');
  IF length(NEW.telefone_digits) < 8 THEN
    RAISE EXCEPTION 'Telefone inválido para opt-out';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wa_bulk_optout_digits ON public.wa_bulk_optout;
CREATE TRIGGER trg_wa_bulk_optout_digits
  BEFORE INSERT OR UPDATE ON public.wa_bulk_optout
  FOR EACH ROW EXECUTE FUNCTION public.wa_bulk_optout_set_digits();

-- Função: verifica opt-out
CREATE OR REPLACE FUNCTION public.wa_bulk_optout_check(_company_id UUID, _telefone TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wa_bulk_optout
    WHERE company_id = _company_id
      AND telefone_digits = regexp_replace(COALESCE(_telefone,''), '\D', '', 'g')
  );
$$;

-- Função: adicionar opt-out (idempotente)
CREATE OR REPLACE FUNCTION public.wa_bulk_optout_add(
  _company_id UUID, _telefone TEXT, _motivo TEXT DEFAULT NULL,
  _origem TEXT DEFAULT 'manual', _observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_digits TEXT;
BEGIN
  v_digits := regexp_replace(COALESCE(_telefone,''), '\D', '', 'g');
  INSERT INTO public.wa_bulk_optout(company_id, telefone, telefone_digits, motivo, origem, observacoes, created_by)
    VALUES (_company_id, _telefone, v_digits, _motivo, COALESCE(_origem,'manual'), _observacoes, auth.uid())
    ON CONFLICT (company_id, telefone_digits)
    DO UPDATE SET motivo = COALESCE(EXCLUDED.motivo, public.wa_bulk_optout.motivo),
                  origem = COALESCE(EXCLUDED.origem, public.wa_bulk_optout.origem),
                  observacoes = COALESCE(EXCLUDED.observacoes, public.wa_bulk_optout.observacoes),
                  updated_at = now()
    RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Trigger na fila: bloqueia inserções de números em opt-out
CREATE OR REPLACE FUNCTION public.wa_bulk_fila_bloquear_optout()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pendente' AND public.wa_bulk_optout_check(NEW.company_id, NEW.destinatario_telefone) THEN
    NEW.status := 'optout';
    NEW.erro_mensagem := 'Destinatário em lista de opt-out';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wa_bulk_fila_optout ON public.wa_bulk_fila_envios;
CREATE TRIGGER trg_wa_bulk_fila_optout
  BEFORE INSERT ON public.wa_bulk_fila_envios
  FOR EACH ROW EXECUTE FUNCTION public.wa_bulk_fila_bloquear_optout();
