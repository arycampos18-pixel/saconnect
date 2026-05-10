-- 1) Tabela unificada
CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  local TEXT,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ,
  tipo TEXT NOT NULL DEFAULT 'Evento',
  categoria TEXT,
  prioridade TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'Planejado',
  responsavel_id UUID,
  origem TEXT NOT NULL DEFAULT 'agenda', -- 'agenda' | 'evento' | 'manual'
  origem_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (origem, origem_id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_company ON public.agenda_eventos(company_id);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_data_inicio ON public.agenda_eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_tipo ON public.agenda_eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_status ON public.agenda_eventos(status);

-- 2) RLS
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agenda_eventos visíveis para autenticados"
  ON public.agenda_eventos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "agenda_eventos: criar autenticado"
  ON public.agenda_eventos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "agenda_eventos: criador ou admin atualiza"
  ON public.agenda_eventos FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "agenda_eventos: criador ou admin remove"
  ON public.agenda_eventos FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "tenant_active_company_guard_agenda_eventos"
  ON public.agenda_eventos AS RESTRICTIVE TO authenticated
  USING (public.is_active_company(company_id))
  WITH CHECK (public.is_active_company(company_id));

CREATE POLICY "tenant_all_agenda_eventos"
  ON public.agenda_eventos TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

-- 3) Triggers utilitários
CREATE TRIGGER set_agenda_eventos_updated_at
  BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_agenda_eventos_set_company
  BEFORE INSERT ON public.agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- 4) Espelhamento de eventos -> agenda_eventos
CREATE OR REPLACE FUNCTION public.mirror_evento_to_agenda_eventos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.agenda_eventos WHERE origem = 'evento' AND origem_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.agenda_eventos (
    company_id, titulo, descricao, local, data_inicio, data_fim,
    tipo, categoria, prioridade, status, responsavel_id,
    origem, origem_id, created_by, created_at, updated_at
  ) VALUES (
    NEW.company_id, NEW.nome, NEW.descricao, NEW.local, NEW.data_hora, NULL,
    COALESCE(NEW.tipo, 'Evento'), NEW.tipo, 'Normal', NEW.status::text, NEW.responsavel_id,
    'evento', NEW.id, NEW.created_by, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (origem, origem_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    titulo = EXCLUDED.titulo,
    descricao = EXCLUDED.descricao,
    local = EXCLUDED.local,
    data_inicio = EXCLUDED.data_inicio,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    status = EXCLUDED.status,
    responsavel_id = EXCLUDED.responsavel_id,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_mirror_evento_to_agenda_eventos
  AFTER INSERT OR UPDATE OR DELETE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.mirror_evento_to_agenda_eventos();

-- 5) Espelhamento de agenda_compromissos -> agenda_eventos
CREATE OR REPLACE FUNCTION public.mirror_compromisso_to_agenda_eventos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prio TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.agenda_eventos WHERE origem = 'compromisso' AND origem_id = OLD.id;
    RETURN OLD;
  END IF;

  v_prio := CASE NEW.prioridade::text
    WHEN 'Baixa' THEN 'Baixa'
    WHEN 'Média' THEN 'Normal'
    WHEN 'Alta' THEN 'Alta'
    ELSE 'Normal'
  END;

  INSERT INTO public.agenda_eventos (
    company_id, titulo, descricao, local, data_inicio, data_fim,
    tipo, categoria, prioridade, status, responsavel_id,
    origem, origem_id, created_by, created_at, updated_at
  ) VALUES (
    NEW.company_id, NEW.titulo, NEW.descricao, NEW.local,
    NEW.data_hora, NEW.data_hora + (NEW.duracao_min || ' minutes')::interval,
    NEW.categoria::text, NEW.categoria::text, v_prio, NEW.status::text, NEW.responsavel_id,
    'compromisso', NEW.id, NEW.created_by, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (origem, origem_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    titulo = EXCLUDED.titulo,
    descricao = EXCLUDED.descricao,
    local = EXCLUDED.local,
    data_inicio = EXCLUDED.data_inicio,
    data_fim = EXCLUDED.data_fim,
    tipo = EXCLUDED.tipo,
    categoria = EXCLUDED.categoria,
    prioridade = EXCLUDED.prioridade,
    status = EXCLUDED.status,
    responsavel_id = EXCLUDED.responsavel_id,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_mirror_compromisso_to_agenda_eventos
  AFTER INSERT OR UPDATE OR DELETE ON public.agenda_compromissos
  FOR EACH ROW EXECUTE FUNCTION public.mirror_compromisso_to_agenda_eventos();

-- 6) Backfill de dados existentes
INSERT INTO public.agenda_eventos (
  company_id, titulo, descricao, local, data_inicio, data_fim,
  tipo, categoria, prioridade, status, responsavel_id,
  origem, origem_id, created_by, created_at, updated_at
)
SELECT
  e.company_id, e.nome, e.descricao, e.local, e.data_hora, NULL,
  COALESCE(e.tipo, 'Evento'), e.tipo, 'Normal', e.status::text, e.responsavel_id,
  'evento', e.id, e.created_by, e.created_at, e.updated_at
FROM public.eventos e
ON CONFLICT (origem, origem_id) DO NOTHING;

INSERT INTO public.agenda_eventos (
  company_id, titulo, descricao, local, data_inicio, data_fim,
  tipo, categoria, prioridade, status, responsavel_id,
  origem, origem_id, created_by, created_at, updated_at
)
SELECT
  c.company_id, c.titulo, c.descricao, c.local,
  c.data_hora, c.data_hora + (c.duracao_min || ' minutes')::interval,
  c.categoria::text, c.categoria::text,
  CASE c.prioridade::text WHEN 'Baixa' THEN 'Baixa' WHEN 'Alta' THEN 'Alta' ELSE 'Normal' END,
  c.status::text, c.responsavel_id,
  'compromisso', c.id, c.created_by, c.created_at, c.updated_at
FROM public.agenda_compromissos c
ON CONFLICT (origem, origem_id) DO NOTHING;