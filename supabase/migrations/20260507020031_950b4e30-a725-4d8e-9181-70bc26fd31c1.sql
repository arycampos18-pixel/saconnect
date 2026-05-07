
-- METAS DE CAPTAÇÃO
CREATE TABLE public.metas_captacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo_periodo TEXT NOT NULL DEFAULT 'mensal', -- mensal, semanal, campanha
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  quantidade_alvo INTEGER NOT NULL CHECK (quantidade_alvo > 0),
  lideranca_id UUID REFERENCES public.liderancas(id) ON DELETE CASCADE,
  cabo_eleitoral_id UUID REFERENCES public.cabos_eleitorais(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (lideranca_id IS NOT NULL OR cabo_eleitoral_id IS NOT NULL)
);

CREATE INDEX idx_metas_company ON public.metas_captacao(company_id);
CREATE INDEX idx_metas_cabo ON public.metas_captacao(cabo_eleitoral_id);
CREATE INDEX idx_metas_lideranca ON public.metas_captacao(lideranca_id);
CREATE INDEX idx_metas_periodo ON public.metas_captacao(data_inicio, data_fim);

ALTER TABLE public.metas_captacao ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_metas_updated BEFORE UPDATE ON public.metas_captacao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_metas_company BEFORE INSERT ON public.metas_captacao
FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- RLS metas
CREATE POLICY "metas_select_company" ON public.metas_captacao FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR public.user_belongs_to_company(auth.uid(), company_id)
);

CREATE POLICY "metas_insert_admin" ON public.metas_captacao FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.user_has_permission(auth.uid(), company_id, 'eleitores.manage')
);

CREATE POLICY "metas_update_admin" ON public.metas_captacao FOR UPDATE
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_permission(auth.uid(), company_id, 'eleitores.manage')
);

CREATE POLICY "metas_delete_admin" ON public.metas_captacao FOR DELETE
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_permission(auth.uid(), company_id, 'eleitores.manage')
);

-- CATÁLOGO DE BADGES
CREATE TABLE public.badges_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT NOT NULL DEFAULT 'Award', -- nome do ícone lucide
  cor TEXT NOT NULL DEFAULT '#f59e0b', -- HEX
  criterio_tipo TEXT NOT NULL, -- total_eleitores, meta_batida, primeiros_n
  criterio_valor INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_badges_company ON public.badges_catalogo(company_id);
ALTER TABLE public.badges_catalogo ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_badges_updated BEFORE UPDATE ON public.badges_catalogo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_badges_company BEFORE INSERT ON public.badges_catalogo
FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY "badges_select" ON public.badges_catalogo FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR public.user_belongs_to_company(auth.uid(), company_id)
);
CREATE POLICY "badges_admin_all" ON public.badges_catalogo FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_permission(auth.uid(), company_id, 'eleitores.manage')
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.user_has_permission(auth.uid(), company_id, 'eleitores.manage')
);

-- CABO BADGES (conquistas)
CREATE TABLE public.cabo_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  cabo_eleitoral_id UUID NOT NULL REFERENCES public.cabos_eleitorais(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges_catalogo(id) ON DELETE CASCADE,
  conquistado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  contexto JSONB,
  UNIQUE(cabo_eleitoral_id, badge_id)
);

CREATE INDEX idx_cb_cabo ON public.cabo_badges(cabo_eleitoral_id);
CREATE INDEX idx_cb_badge ON public.cabo_badges(badge_id);
ALTER TABLE public.cabo_badges ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_cb_company BEFORE INSERT ON public.cabo_badges
FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY "cb_select_company" ON public.cabo_badges FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR public.user_belongs_to_company(auth.uid(), company_id)
);
CREATE POLICY "cb_insert_admin" ON public.cabo_badges FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.user_has_permission(auth.uid(), company_id, 'eleitores.manage')
);
CREATE POLICY "cb_delete_admin" ON public.cabo_badges FOR DELETE
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_permission(auth.uid(), company_id, 'eleitores.manage')
);
