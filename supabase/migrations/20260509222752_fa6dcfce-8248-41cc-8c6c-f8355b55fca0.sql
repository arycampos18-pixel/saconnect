
-- 1. Tabela genérica de catálogos customizáveis (para enums migrados)
CREATE TABLE IF NOT EXISTS public.catalogos_customizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, categoria, nome)
);

CREATE INDEX IF NOT EXISTS idx_catalogos_customizados_cat
  ON public.catalogos_customizados(categoria, ativo);

ALTER TABLE public.catalogos_customizados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Catalogos visíveis para usuários" ON public.catalogos_customizados;
CREATE POLICY "Catalogos visíveis para usuários"
ON public.catalogos_customizados FOR SELECT
USING (
  company_id IS NULL OR public.is_active_company(company_id)
);

DROP POLICY IF EXISTS "Catalogos podem ser criados" ON public.catalogos_customizados;
CREATE POLICY "Catalogos podem ser criados"
ON public.catalogos_customizados FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (company_id IS NULL OR public.is_active_company(company_id))
);

DROP POLICY IF EXISTS "Catalogos podem ser editados" ON public.catalogos_customizados;
CREATE POLICY "Catalogos podem ser editados"
ON public.catalogos_customizados FOR UPDATE
USING (auth.uid() IS NOT NULL AND (company_id IS NULL OR public.is_active_company(company_id)));

DROP POLICY IF EXISTS "Catalogos podem ser removidos" ON public.catalogos_customizados;
CREATE POLICY "Catalogos podem ser removidos"
ON public.catalogos_customizados FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND is_system = false
  AND (company_id IS NULL OR public.is_active_company(company_id))
);

CREATE TRIGGER trg_catalogos_customizados_company
  BEFORE INSERT ON public.catalogos_customizados
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE TRIGGER trg_catalogos_customizados_updated
  BEFORE UPDATE ON public.catalogos_customizados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed inicial com os valores de enums "user-facing"
INSERT INTO public.catalogos_customizados (company_id, categoria, nome, ordem, is_system) VALUES
  (NULL, 'evento_status', 'Planejado', 1, true),
  (NULL, 'evento_status', 'Em Andamento', 2, true),
  (NULL, 'evento_status', 'Finalizado', 3, true),
  (NULL, 'compromisso_categoria', 'Reunião', 1, true),
  (NULL, 'compromisso_categoria', 'Visita', 2, true),
  (NULL, 'compromisso_categoria', 'Evento', 3, true),
  (NULL, 'compromisso_categoria', 'Audiência', 4, true),
  (NULL, 'compromisso_categoria', 'Outro', 5, true),
  (NULL, 'compromisso_prioridade', 'Baixa', 1, true),
  (NULL, 'compromisso_prioridade', 'Média', 2, true),
  (NULL, 'compromisso_prioridade', 'Alta', 3, true),
  (NULL, 'compromisso_status', 'Agendado', 1, true),
  (NULL, 'compromisso_status', 'Concluído', 2, true),
  (NULL, 'compromisso_status', 'Cancelado', 3, true),
  (NULL, 'crm_interacao_tipo', 'Ligação', 1, true),
  (NULL, 'crm_interacao_tipo', 'WhatsApp', 2, true),
  (NULL, 'crm_interacao_tipo', 'Email', 3, true),
  (NULL, 'crm_interacao_tipo', 'Visita', 4, true),
  (NULL, 'crm_interacao_tipo', 'Reunião', 5, true),
  (NULL, 'crm_interacao_tipo', 'Outro', 6, true),
  (NULL, 'crm_prioridade', 'Baixa', 1, true),
  (NULL, 'crm_prioridade', 'Média', 2, true),
  (NULL, 'crm_prioridade', 'Alta', 3, true),
  (NULL, 'pesquisa_tipo', 'Intenção de Voto', 1, true),
  (NULL, 'pesquisa_tipo', 'Satisfação', 2, true),
  (NULL, 'pesquisa_tipo', 'Temas Prioritários', 3, true),
  (NULL, 'post_status', 'Rascunho', 1, true),
  (NULL, 'post_status', 'Agendado', 2, true),
  (NULL, 'post_status', 'Publicado', 3, true),
  (NULL, 'post_status', 'Cancelado', 4, true)
ON CONFLICT DO NOTHING;

-- 3. Converter colunas enum para TEXT (mantém os valores)
ALTER TABLE public.eventos ALTER COLUMN status TYPE TEXT USING status::text;

-- compromissos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='compromissos' AND column_name='categoria') THEN
    EXECUTE 'ALTER TABLE public.compromissos ALTER COLUMN categoria TYPE TEXT USING categoria::text';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='compromissos' AND column_name='prioridade') THEN
    EXECUTE 'ALTER TABLE public.compromissos ALTER COLUMN prioridade TYPE TEXT USING prioridade::text';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='compromissos' AND column_name='status') THEN
    EXECUTE 'ALTER TABLE public.compromissos ALTER COLUMN status TYPE TEXT USING status::text';
  END IF;
END $$;

-- crm_interacoes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_interacoes' AND column_name='tipo') THEN
    EXECUTE 'ALTER TABLE public.crm_interacoes ALTER COLUMN tipo TYPE TEXT USING tipo::text';
  END IF;
END $$;

-- crm_oportunidades / crm_leads (prioridade)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_oportunidades' AND column_name='prioridade') THEN
    EXECUTE 'ALTER TABLE public.crm_oportunidades ALTER COLUMN prioridade TYPE TEXT USING prioridade::text';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_leads' AND column_name='prioridade') THEN
    EXECUTE 'ALTER TABLE public.crm_leads ALTER COLUMN prioridade TYPE TEXT USING prioridade::text';
  END IF;
END $$;

-- pesquisas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pesquisas' AND column_name='tipo') THEN
    EXECUTE 'ALTER TABLE public.pesquisas ALTER COLUMN tipo TYPE TEXT USING tipo::text';
  END IF;
END $$;

-- posts (status)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='posts' AND column_name='status') THEN
    EXECUTE 'ALTER TABLE public.posts ALTER COLUMN status TYPE TEXT USING status::text';
  END IF;
END $$;

-- 4. Adicionar permissão para criar valores em catálogos customizados
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_permissions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_permissions' AND column_name='can_create_catalogos') THEN
      EXECUTE 'ALTER TABLE public.user_permissions ADD COLUMN can_create_catalogos BOOLEAN NOT NULL DEFAULT true';
    END IF;
  END IF;
END $$;

-- atualiza can_user_create para aceitar 'catalogo_<categoria>'
CREATE OR REPLACE FUNCTION public.can_user_create(_user uuid, _campo text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = _user
        AND (
          up.can_create_all
          OR (_campo = 'liderancas'    AND up.can_create_liderancas)
          OR (_campo = 'cabos'         AND up.can_create_cabos)
          OR (_campo = 'departamentos' AND up.can_create_departamentos)
          OR (_campo = 'categorias'    AND up.can_create_categorias)
          OR (_campo = 'tags'          AND up.can_create_tags)
          OR (_campo = 'tipos_evento'  AND up.can_create_tipos_evento)
          OR (_campo LIKE 'catalogo_%' AND COALESCE(up.can_create_catalogos, true))
        )
    );
$function$;
