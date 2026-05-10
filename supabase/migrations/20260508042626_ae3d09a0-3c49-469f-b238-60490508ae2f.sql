-- Fase 3 - Passo 3: tabelas para Formulário Público e Relatórios Customizados

CREATE TABLE IF NOT EXISTS public.formularios_publicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  customization JSONB NOT NULL DEFAULT '{}'::jsonb,
  link_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS public.formulario_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES public.formularios_publicos(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.relatorios_customizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('whatsapp','eleitores','eventos','geral')),
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  agendado BOOLEAN NOT NULL DEFAULT false,
  frequencia TEXT CHECK (frequencia IN ('uma_vez','diaria','semanal','mensal')),
  proxima_execucao TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formularios_company ON public.formularios_publicos(company_id);
CREATE INDEX IF NOT EXISTS idx_formulario_respostas_formulario ON public.formulario_respostas(formulario_id);
CREATE INDEX IF NOT EXISTS idx_formulario_respostas_company ON public.formulario_respostas(company_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_customizados_company ON public.relatorios_customizados(company_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_customizados_tipo ON public.relatorios_customizados(tipo);

-- triggers updated_at
DROP TRIGGER IF EXISTS trg_formularios_publicos_updated_at ON public.formularios_publicos;
CREATE TRIGGER trg_formularios_publicos_updated_at
  BEFORE UPDATE ON public.formularios_publicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_relatorios_customizados_updated_at ON public.relatorios_customizados;
CREATE TRIGGER trg_relatorios_customizados_updated_at
  BEFORE UPDATE ON public.relatorios_customizados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto company_id
DROP TRIGGER IF EXISTS trg_formularios_set_company ON public.formularios_publicos;
CREATE TRIGGER trg_formularios_set_company
  BEFORE INSERT ON public.formularios_publicos
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

DROP TRIGGER IF EXISTS trg_relatorios_set_company ON public.relatorios_customizados;
CREATE TRIGGER trg_relatorios_set_company
  BEFORE INSERT ON public.relatorios_customizados
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- RLS
ALTER TABLE public.formularios_publicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_customizados ENABLE ROW LEVEL SECURITY;

-- formularios_publicos: ver/editar quando pertence à empresa do usuário
CREATE POLICY "fp_select_by_company" ON public.formularios_publicos
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "fp_insert_by_company" ON public.formularios_publicos
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "fp_update_by_company" ON public.formularios_publicos
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "fp_delete_by_company" ON public.formularios_publicos
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

-- formulario_respostas: leitura por empresa; insert público (anon) permitido para o link público
CREATE POLICY "fr_select_by_company" ON public.formulario_respostas
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "fr_insert_public" ON public.formulario_respostas
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.formularios_publicos f
      WHERE f.id = formulario_id
        AND f.company_id = formulario_respostas.company_id
        AND f.status = 'active'
    )
  );

CREATE POLICY "fr_delete_by_company" ON public.formulario_respostas
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

-- relatorios_customizados
CREATE POLICY "rc_select_by_company" ON public.relatorios_customizados
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "rc_insert_by_company" ON public.relatorios_customizados
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "rc_update_by_company" ON public.relatorios_customizados
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "rc_delete_by_company" ON public.relatorios_customizados
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

-- Função pública para buscar formulário pelo token (para a página pública)
CREATE OR REPLACE FUNCTION public.public_get_formulario_by_token(_token TEXT)
RETURNS TABLE(id UUID, company_id UUID, name TEXT, description TEXT, fields JSONB, customization JSONB, status TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, company_id, name, description, fields, customization, status
  FROM public.formularios_publicos
  WHERE link_token = _token AND status = 'active'
  LIMIT 1;
$$;