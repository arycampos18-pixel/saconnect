
ALTER TABLE public.liderancas
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS regiao TEXT,
  ADD COLUMN IF NOT EXISTS bairros JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS data_inicio DATE,
  ADD COLUMN IF NOT EXISTS data_fim DATE,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

ALTER TABLE public.cabos_eleitorais
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS zona TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS data_inicio DATE,
  ADD COLUMN IF NOT EXISTS data_fim DATE,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

ALTER TABLE public.eleitores
  ADD COLUMN IF NOT EXISTS cabo_eleitoral_id UUID REFERENCES public.cabos_eleitorais(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_eleitores_cabo ON public.eleitores(cabo_eleitoral_id);

CREATE TABLE IF NOT EXISTS public.cabo_links_captacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  cabo_eleitoral_id UUID NOT NULL REFERENCES public.cabos_eleitorais(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  tipo TEXT NOT NULL DEFAULT 'link' CHECK (tipo IN ('link','qrcode')),
  nome TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  total_cadastros INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cabo_links_cabo ON public.cabo_links_captacao(cabo_eleitoral_id);
CREATE INDEX IF NOT EXISTS idx_cabo_links_token ON public.cabo_links_captacao(token);

DROP TRIGGER IF EXISTS trg_cabo_links_updated ON public.cabo_links_captacao;
CREATE TRIGGER trg_cabo_links_updated
BEFORE UPDATE ON public.cabo_links_captacao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cabo_links_captacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa vê links" ON public.cabo_links_captacao;
CREATE POLICY "Empresa vê links" ON public.cabo_links_captacao
FOR SELECT TO authenticated
USING (public.user_belongs_to_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Cabo gerencia próprios links" ON public.cabo_links_captacao;
CREATE POLICY "Cabo gerencia próprios links" ON public.cabo_links_captacao
FOR ALL TO authenticated
USING (cabo_eleitoral_id IN (SELECT id FROM public.cabos_eleitorais WHERE user_id = auth.uid()))
WITH CHECK (cabo_eleitoral_id IN (SELECT id FROM public.cabos_eleitorais WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins gerenciam links" ON public.cabo_links_captacao;
CREATE POLICY "Admins gerenciam links" ON public.cabo_links_captacao
FOR ALL TO authenticated
USING (public.user_has_permission(auth.uid(), company_id, 'cadastros.usuarios.manage'))
WITH CHECK (public.user_has_permission(auth.uid(), company_id, 'cadastros.usuarios.manage'));

CREATE OR REPLACE FUNCTION public.auto_atribuir_eleitor_ao_cabo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_cabo_id UUID; v_lideranca_id UUID;
BEGIN
  IF NEW.cabo_eleitoral_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT id, lideranca_id INTO v_cabo_id, v_lideranca_id
    FROM public.cabos_eleitorais WHERE user_id = auth.uid() LIMIT 1;
    IF v_cabo_id IS NOT NULL THEN
      NEW.cabo_eleitoral_id := v_cabo_id;
      IF NEW.lideranca_id IS NULL THEN NEW.lideranca_id := v_lideranca_id; END IF;
    END IF;
  END IF;
  IF NEW.lideranca_id IS NULL AND NEW.cabo_eleitoral_id IS NOT NULL THEN
    SELECT lideranca_id INTO NEW.lideranca_id FROM public.cabos_eleitorais WHERE id = NEW.cabo_eleitoral_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_eleitores_auto_atribuir ON public.eleitores;
CREATE TRIGGER trg_eleitores_auto_atribuir
BEFORE INSERT ON public.eleitores
FOR EACH ROW EXECUTE FUNCTION public.auto_atribuir_eleitor_ao_cabo();

DROP POLICY IF EXISTS "Cabo vê seus eleitores" ON public.eleitores;
CREATE POLICY "Cabo vê seus eleitores" ON public.eleitores
FOR SELECT TO authenticated
USING (cabo_eleitoral_id IN (SELECT id FROM public.cabos_eleitorais WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Cabo edita seus eleitores" ON public.eleitores;
CREATE POLICY "Cabo edita seus eleitores" ON public.eleitores
FOR UPDATE TO authenticated
USING (cabo_eleitoral_id IN (SELECT id FROM public.cabos_eleitorais WHERE user_id = auth.uid()))
WITH CHECK (cabo_eleitoral_id IN (SELECT id FROM public.cabos_eleitorais WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Cabo cria eleitores" ON public.eleitores;
CREATE POLICY "Cabo cria eleitores" ON public.eleitores
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.cabos_eleitorais WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Lideranca vê eleitores dos seus cabos" ON public.eleitores;
CREATE POLICY "Lideranca vê eleitores dos seus cabos" ON public.eleitores
FOR SELECT TO authenticated
USING (
  lideranca_id IN (SELECT id FROM public.liderancas WHERE user_id = auth.uid())
  OR cabo_eleitoral_id IN (
    SELECT c.id FROM public.cabos_eleitorais c
    JOIN public.liderancas l ON l.id = c.lideranca_id
    WHERE l.user_id = auth.uid()
  )
);

INSERT INTO public.settings_permissions (id, module, description) VALUES
  ('liderancas.view',      'Lideranças', 'Visualizar lideranças'),
  ('liderancas.manage',    'Lideranças', 'Gerenciar lideranças'),
  ('cabos.view',           'Cabos',      'Visualizar cabos eleitorais'),
  ('cabos.manage',         'Cabos',      'Gerenciar cabos eleitorais'),
  ('cabos.meus_eleitores', 'Cabos',      'Ver / cadastrar próprios eleitores'),
  ('cabos.links_captacao', 'Cabos',      'Gerar links e QR Codes de captação'),
  ('cabos.interacoes',     'Cabos',      'Registrar interações com eleitores')
ON CONFLICT (id) DO NOTHING;

SELECT public.criar_perfil_em_todas_empresas('Liderança', 'Controla cabos eleitorais e eleitores da sua região');
SELECT public.definir_permissoes_perfil_global(
  'Liderança',
  ARRAY['whatsapp.dashboard.view','whatsapp.chat.read','whatsapp.chat.send',
        'eleitores.view','liderancas.view','cabos.view','cabos.manage','cabos.interacoes',
        'eventos.view','crm.view']
);

SELECT public.criar_perfil_em_todas_empresas('Cabo Eleitoral', 'Cadastra e gerencia seus próprios eleitores');
SELECT public.definir_permissoes_perfil_global(
  'Cabo Eleitoral',
  ARRAY['whatsapp.chat.read','whatsapp.chat.send','cabos.meus_eleitores','cabos.links_captacao','cabos.interacoes']
);
