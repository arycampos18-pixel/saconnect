
-- =====================================================
-- MÓDULO 1: SETTINGS (SaaS Multi-Tenant)
-- =====================================================

-- 1. Empresas (Tenants)
CREATE TABLE public.settings_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  plan TEXT NOT NULL DEFAULT 'basic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Usuários
CREATE TABLE public.settings_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Perfis (RBAC)
CREATE TABLE public.settings_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Permissões (dicionário global)
CREATE TABLE public.settings_permissions (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  description TEXT NOT NULL
);

-- 5. Vínculo perfil ↔ permissão
CREATE TABLE public.settings_profile_permissions (
  profile_id UUID REFERENCES public.settings_profiles(id) ON DELETE CASCADE,
  permission_id TEXT REFERENCES public.settings_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, permission_id)
);

-- 6. Vínculo usuário ↔ empresa ↔ perfil
CREATE TABLE public.settings_user_companies (
  user_id UUID NOT NULL REFERENCES public.settings_users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.settings_profiles(id),
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

-- 7. Auditoria
CREATE TABLE public.settings_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.settings_users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Configurações por empresa
CREATE TABLE public.settings_global (
  company_id UUID PRIMARY KEY REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  system_name TEXT NOT NULL DEFAULT 'SA CONNECT',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  active_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- FUNÇÕES SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.settings_users WHERE id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.settings_user_companies
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id UUID, _company_id UUID, _permission TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS(
    SELECT 1 FROM public.settings_user_companies uc
    JOIN public.settings_profile_permissions pp ON pp.profile_id = uc.profile_id
    WHERE uc.user_id = _user_id
      AND uc.company_id = _company_id
      AND uc.status = 'active'
      AND pp.permission_id = _permission
  );
$$;

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.settings_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_profile_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_global ENABLE ROW LEVEL SECURITY;

-- Companies
CREATE POLICY "Empresas visiveis para membros ou super admin"
  ON public.settings_companies FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), id));

CREATE POLICY "Apenas super admin cria empresas"
  ON public.settings_companies FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin atualiza empresas"
  ON public.settings_companies FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin remove empresas"
  ON public.settings_companies FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Users
CREATE POLICY "Usuarios visiveis na mesma empresa"
  ON public.settings_users FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR id = auth.uid()
    OR EXISTS(
      SELECT 1 FROM public.settings_user_companies uc1
      JOIN public.settings_user_companies uc2 ON uc1.company_id = uc2.company_id
      WHERE uc1.user_id = auth.uid() AND uc2.user_id = settings_users.id
    )
  );

CREATE POLICY "Super admin gerencia usuarios"
  ON public.settings_users FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR id = auth.uid())
  WITH CHECK (public.is_super_admin(auth.uid()) OR id = auth.uid());

-- Profiles
CREATE POLICY "Perfis visiveis na empresa"
  ON public.settings_profiles FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id IS NULL OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admin de empresa gerencia perfis"
  ON public.settings_profiles FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (company_id IS NOT NULL AND public.user_has_permission(auth.uid(), company_id, 'settings.profiles.manage'))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (company_id IS NOT NULL AND public.user_has_permission(auth.uid(), company_id, 'settings.profiles.manage'))
  );

-- Permissions (dicionário) - leitura para todos autenticados
CREATE POLICY "Permissoes visiveis para autenticados"
  ON public.settings_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Apenas super admin gerencia dicionario"
  ON public.settings_permissions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Profile permissions
CREATE POLICY "Profile_permissions visiveis"
  ON public.settings_profile_permissions FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS(
      SELECT 1 FROM public.settings_profiles p
      WHERE p.id = profile_id AND (p.company_id IS NULL OR public.user_belongs_to_company(auth.uid(), p.company_id))
    )
  );

CREATE POLICY "Admin gerencia profile_permissions"
  ON public.settings_profile_permissions FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS(
      SELECT 1 FROM public.settings_profiles p
      WHERE p.id = profile_id AND p.company_id IS NOT NULL
        AND public.user_has_permission(auth.uid(), p.company_id, 'settings.profiles.manage')
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS(
      SELECT 1 FROM public.settings_profiles p
      WHERE p.id = profile_id AND p.company_id IS NOT NULL
        AND public.user_has_permission(auth.uid(), p.company_id, 'settings.profiles.manage')
    )
  );

-- User companies
CREATE POLICY "Vinculos visiveis"
  ON public.settings_user_companies FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR user_id = auth.uid()
    OR public.user_has_permission(auth.uid(), company_id, 'settings.users.manage')
  );

CREATE POLICY "Admin gerencia vinculos"
  ON public.settings_user_companies FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.user_has_permission(auth.uid(), company_id, 'settings.users.manage')
    OR (user_id = auth.uid())
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.user_has_permission(auth.uid(), company_id, 'settings.users.manage')
    OR (user_id = auth.uid())
  );

-- Audit logs
CREATE POLICY "Logs visiveis na empresa"
  ON public.settings_audit_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Autenticados registram logs"
  ON public.settings_audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Settings global
CREATE POLICY "Config global visivel para membros"
  ON public.settings_global FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admin gerencia config global"
  ON public.settings_global FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.user_has_permission(auth.uid(), company_id, 'settings.global.manage')
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.user_has_permission(auth.uid(), company_id, 'settings.global.manage')
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER trg_settings_companies_updated BEFORE UPDATE ON public.settings_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_settings_users_updated BEFORE UPDATE ON public.settings_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_settings_global_updated BEFORE UPDATE ON public.settings_global
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SEED: Permissões iniciais
-- =====================================================

INSERT INTO public.settings_permissions (id, module, description) VALUES
  ('settings.dashboard.view', 'settings', 'Ver dashboard de configurações'),
  ('settings.users.view', 'settings', 'Visualizar usuários'),
  ('settings.users.manage', 'settings', 'Gerenciar usuários (criar/editar/desativar)'),
  ('settings.companies.view', 'settings', 'Visualizar empresas'),
  ('settings.companies.manage', 'settings', 'Gerenciar empresas (super admin)'),
  ('settings.profiles.view', 'settings', 'Visualizar perfis e permissões'),
  ('settings.profiles.manage', 'settings', 'Gerenciar perfis e permissões'),
  ('settings.audit.view', 'settings', 'Visualizar logs de auditoria'),
  ('settings.global.view', 'settings', 'Visualizar configurações gerais'),
  ('settings.global.manage', 'settings', 'Editar configurações gerais'),
  ('eleitores.view', 'eleitores', 'Visualizar eleitores'),
  ('eleitores.manage', 'eleitores', 'Gerenciar eleitores'),
  ('whatsapp.dashboard.view', 'whatsapp', 'Ver dashboard WhatsApp'),
  ('whatsapp.chat.read', 'whatsapp', 'Visualizar conversas'),
  ('whatsapp.chat.send', 'whatsapp', 'Enviar mensagens'),
  ('whatsapp.chat.close', 'whatsapp', 'Encerrar conversas'),
  ('disparos.view', 'disparos', 'Visualizar disparos'),
  ('disparos.manage', 'disparos', 'Criar e gerenciar disparos'),
  ('eventos.view', 'eventos', 'Visualizar eventos'),
  ('eventos.manage', 'eventos', 'Gerenciar eventos'),
  ('crm.view', 'crm', 'Visualizar CRM'),
  ('crm.manage', 'crm', 'Gerenciar CRM'),
  ('relatorios.view', 'relatorios', 'Visualizar relatórios'),
  ('automacoes.view', 'automacoes', 'Visualizar automações'),
  ('automacoes.manage', 'automacoes', 'Gerenciar automações'),
  ('departamentos.view', 'departamentos', 'Ver departamentos'),
  ('departamentos.manage', 'departamentos', 'Gerenciar departamentos');

-- =====================================================
-- SEED: Empresa default + perfil Admin + vínculos
-- =====================================================

DO $$
DECLARE
  v_company_id UUID;
  v_admin_profile_id UUID;
  v_atendente_profile_id UUID;
BEGIN
  -- Empresa default
  INSERT INTO public.settings_companies (razao_social, nome_fantasia, status, plan)
  VALUES ('SA CONNECT (Default)', 'SA CONNECT', 'active', 'enterprise')
  RETURNING id INTO v_company_id;

  -- Perfil Admin (todas permissões)
  INSERT INTO public.settings_profiles (company_id, nome, descricao, is_system_default)
  VALUES (v_company_id, 'Admin', 'Administrador com acesso total', true)
  RETURNING id INTO v_admin_profile_id;

  INSERT INTO public.settings_profile_permissions (profile_id, permission_id)
  SELECT v_admin_profile_id, id FROM public.settings_permissions;

  -- Perfil Atendente (básico)
  INSERT INTO public.settings_profiles (company_id, nome, descricao, is_system_default)
  VALUES (v_company_id, 'Atendente', 'Operador padrão', true)
  RETURNING id INTO v_atendente_profile_id;

  INSERT INTO public.settings_profile_permissions (profile_id, permission_id) VALUES
    (v_atendente_profile_id, 'whatsapp.dashboard.view'),
    (v_atendente_profile_id, 'whatsapp.chat.read'),
    (v_atendente_profile_id, 'whatsapp.chat.send'),
    (v_atendente_profile_id, 'eleitores.view'),
    (v_atendente_profile_id, 'eventos.view'),
    (v_atendente_profile_id, 'crm.view');

  -- Settings global
  INSERT INTO public.settings_global (company_id, system_name, active_modules)
  VALUES (v_company_id, 'SA CONNECT', '["whatsapp","eleitores","disparos","eventos","crm","relatorios","automacoes","departamentos","settings"]'::jsonb);

  -- Migrar usuários existentes
  INSERT INTO public.settings_users (id, nome, email, is_super_admin)
  SELECT
    u.id,
    COALESCE(p.nome, split_part(u.email, '@', 1)),
    u.email,
    EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ON CONFLICT (id) DO NOTHING;

  -- Vincular todos à empresa default como Admin
  INSERT INTO public.settings_user_companies (user_id, company_id, profile_id, is_default, status)
  SELECT id, v_company_id, v_admin_profile_id, true, 'active'
  FROM public.settings_users
  ON CONFLICT (user_id, company_id) DO NOTHING;
END $$;

-- =====================================================
-- TRIGGER: novo usuário → settings_users + vínculo default
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_settings_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company_id UUID;
  v_profile_id UUID;
BEGIN
  INSERT INTO public.settings_users (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  ) ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_company_id FROM public.settings_companies WHERE nome_fantasia = 'SA CONNECT' LIMIT 1;
  IF v_company_id IS NOT NULL THEN
    SELECT id INTO v_profile_id FROM public.settings_profiles
      WHERE company_id = v_company_id AND nome = 'Atendente' LIMIT 1;
    INSERT INTO public.settings_user_companies (user_id, company_id, profile_id, is_default, status)
    VALUES (NEW.id, v_company_id, v_profile_id, true, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_settings_user();
