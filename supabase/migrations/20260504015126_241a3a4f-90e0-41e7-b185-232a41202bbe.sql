-- ============================================================
-- MÓDULO POLÍTICO — Multi-tenant por company_id
-- ============================================================

-- 1) Helper: empresa padrão do usuário (primeira ativa)
CREATE OR REPLACE FUNCTION public.user_default_company(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.settings_user_companies
  WHERE user_id = _user_id AND status = 'active'
  ORDER BY is_default DESC, created_at ASC LIMIT 1;
$$;

-- 2) Trigger genérico para preencher company_id automaticamente
CREATE OR REPLACE FUNCTION public.set_company_id_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.company_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.company_id := public.user_default_company(auth.uid());
  END IF;
  RETURN NEW;
END $$;

-- 3) Adicionar coluna company_id em todas as tabelas políticas
DO $$
DECLARE
  t TEXT;
  default_company UUID := 'e0df4e88-5055-4c1f-9223-94a5932eae83';
  political_tables TEXT[] := ARRAY[
    'eleitores','eleitor_tags','tags','liderancas','cabos_eleitorais',
    'crm_etapas','crm_oportunidades','crm_interacoes','crm_tarefas',
    'eventos','evento_inscricoes','agenda_compromissos',
    'pesquisas','pesquisa_perguntas','pesquisa_respostas',
    'departamentos','departamento_membros',
    'segmentos','concorrentes','concorrente_atividades',
    'gamificacao_badges','gamificacao_badges_conquistadas',
    'gamificacao_desafios','gamificacao_desafio_progresso','gamificacao_pontuacoes',
    'aniversariantes_config','aniversariantes_log','posts_sociais'
  ];
BEGIN
  FOREACH t IN ARRAY political_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.settings_companies(id) ON DELETE CASCADE', t);
      EXECUTE format('UPDATE public.%I SET company_id = %L WHERE company_id IS NULL', t, default_company);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id)', 'idx_'||t||'_company', t);

      -- trigger BEFORE INSERT (preenche company_id automaticamente)
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_set_company ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_%I_set_company BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user()', t, t);

      -- garantir RLS habilitada
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- limpar políticas antigas e criar política única por tenant
      EXECUTE format('DROP POLICY IF EXISTS "tenant_all_%I" ON public.%I', t, t);
      EXECUTE format($p$
        CREATE POLICY "tenant_all_%I" ON public.%I FOR ALL TO authenticated
        USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
        WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
      $p$, t, t);
    END IF;
  END LOOP;
END $$;
