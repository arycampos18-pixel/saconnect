-- Tabela: módulos liberados por papel (preset editável)
CREATE TABLE public.role_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  modulos text[] NOT NULL DEFAULT '{}',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role_modulos visíveis para autenticados"
  ON public.role_modulos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins gerenciam role_modulos"
  ON public.role_modulos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_role_modulos_updated
  BEFORE UPDATE ON public.role_modulos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: override por usuário (opcional)
CREATE TABLE public.user_modulos_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  modulos text[] NOT NULL DEFAULT '{}',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_modulos_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User_modulos_override visíveis para autenticados"
  ON public.user_modulos_override FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins gerenciam overrides"
  ON public.user_modulos_override FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_user_modulos_override_updated
  BEFORE UPDATE ON public.user_modulos_override
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Presets iniciais
INSERT INTO public.role_modulos (role, modulos) VALUES
  ('admin', ARRAY[
    'dashboard','eleitores','novo-eleitor','eventos','agenda','aniversariantes',
    'pesquisa','mapa','comunicacao','relatorios','predicao','automacao',
    'concorrencia','gamificacao','crm','executivo','segmentacao','campanhas',
    'aprovacoes','auditoria','integracoes','configuracoes','cadastros','perfil'
  ]),
  ('lideranca', ARRAY[
    'dashboard','eleitores','novo-eleitor','eventos','agenda','aniversariantes',
    'pesquisa','mapa','comunicacao','relatorios','predicao','automacao',
    'concorrencia','gamificacao','crm','executivo','segmentacao','campanhas',
    'aprovacoes','perfil'
  ]),
  ('operador', ARRAY[
    'dashboard','eleitores','novo-eleitor','eventos','comunicacao','relatorios',
    'pesquisa','mapa','gamificacao','crm','segmentacao','perfil'
  ])
ON CONFLICT (role) DO NOTHING;