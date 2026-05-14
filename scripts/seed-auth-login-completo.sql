-- =============================================================================
-- LOGIN + SENHA + EMPRESA + PERMISSÕES (Admin + todas as permissions) + super admin
-- Supabase → SQL Editor → cola ESTE FICHEIRO INTEIRO → Run (uma vez).
--
-- CONFIG: edita apenas o bloco INSERT INTO _sa_connect_seed (cinco valores no VALUES).
-- A senha tem de ter no mínimo 8 caracteres. Não commites senha real no Git.
--
-- Se o login na app falhar depois disto: Authentication → Users → Reset password.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DROP TABLE IF EXISTS _sa_connect_seed;
CREATE TEMP TABLE _sa_connect_seed (
  email           text NOT NULL,
  senha           text NOT NULL,
  nome_fantasia   text NOT NULL,
  razao_social    text NOT NULL,
  nome_perfil     text NOT NULL
);

-- ========= APENAS ESTA LINHA: edita os 5 valores entre parêntesis =========
INSERT INTO _sa_connect_seed (email, senha, nome_fantasia, razao_social, nome_perfil)
VALUES (
  'saconnectbr@gmail.com',
  'COLOQUE_A_SENHA_AQUI',
  'SA CONNECT BR',
  'SA CONNECT BR',
  'Master'
);
-- ===========================================================================

DO $$
DECLARE
  r             _sa_connect_seed%ROWTYPE;
  v_user_id     uuid;
  v_company_id  uuid;
  v_admin_profile_id     uuid;
  v_atendente_profile_id uuid;
BEGIN
  SELECT * INTO STRICT r FROM _sa_connect_seed LIMIT 1;

  IF r.senha = 'COLOQUE_A_SENHA_AQUI' OR length(trim(r.senha)) < 8 THEN
    RAISE EXCEPTION 'No INSERT em _sa_connect_seed: troca COLOQUE_A_SENHA_AQUI pela senha (minimo 8 caracteres).';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(r.email)) LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      trim(r.email),
      extensions.crypt(r.senha, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome', r.nome_perfil, 'cargo', 'Administrador'),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', trim(r.email), 'email_verified', true),
      'email',
      v_user_id::text,
      now(), now(), now()
    );
  ELSE
    UPDATE auth.users
    SET
      email = trim(r.email),
      encrypted_password = extensions.crypt(r.senha, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now(),
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb
    WHERE id = v_user_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email') THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', trim(r.email), 'email_verified', true),
      'email',
      v_user_id::text,
      now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (user_id, nome, email, cargo)
  VALUES (v_user_id, r.nome_perfil, trim(r.email), 'Administrador')
  ON CONFLICT (user_id) DO UPDATE
  SET nome = EXCLUDED.nome,
      email = EXCLUDED.email,
      cargo = EXCLUDED.cargo,
      ativo = true,
      updated_at = now();

  UPDATE public.profiles SET ativo = true, updated_at = now() WHERE user_id = v_user_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  DELETE FROM public.user_roles WHERE user_id = v_user_id AND role = 'operador';

  SELECT id INTO v_company_id
  FROM public.settings_companies
  WHERE lower(nome_fantasia) = lower(trim(r.nome_fantasia))
  LIMIT 1;

  IF v_company_id IS NULL THEN
    INSERT INTO public.settings_companies (razao_social, nome_fantasia, status, plan)
    VALUES (r.razao_social, trim(r.nome_fantasia), 'active', 'enterprise')
    RETURNING id INTO v_company_id;

    INSERT INTO public.settings_profiles (company_id, nome, descricao, is_system_default)
    VALUES (v_company_id, 'Admin', 'Administrador com acesso total', true)
    RETURNING id INTO v_admin_profile_id;

    INSERT INTO public.settings_profile_permissions (profile_id, permission_id)
    SELECT v_admin_profile_id, id FROM public.settings_permissions;

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

    INSERT INTO public.settings_global (company_id, system_name, active_modules)
    VALUES (
      v_company_id,
      trim(r.nome_fantasia),
      '["whatsapp","eleitores","disparos","eventos","crm","relatorios","automacoes","departamentos","settings"]'::jsonb
    );
  ELSE
    SELECT id INTO v_admin_profile_id
    FROM public.settings_profiles
    WHERE company_id = v_company_id AND nome = 'Admin'
    LIMIT 1;
    IF v_admin_profile_id IS NULL THEN
      RAISE EXCEPTION 'Empresa % já existe mas sem perfil Admin.', r.nome_fantasia;
    END IF;
  END IF;

  INSERT INTO public.settings_users (id, nome, email, is_super_admin, active_company_id)
  VALUES (v_user_id, r.nome_perfil, trim(r.email), true, v_company_id)
  ON CONFLICT (id) DO UPDATE
  SET nome = EXCLUDED.nome,
      email = EXCLUDED.email,
      is_super_admin = true,
      active_company_id = EXCLUDED.active_company_id,
      updated_at = now();

  UPDATE public.settings_user_companies SET is_default = false WHERE user_id = v_user_id;

  INSERT INTO public.settings_user_companies (user_id, company_id, profile_id, is_default, status)
  VALUES (v_user_id, v_company_id, v_admin_profile_id, true, 'active')
  ON CONFLICT (user_id, company_id) DO UPDATE
  SET profile_id = EXCLUDED.profile_id,
      is_default = true,
      status = 'active';

  RAISE NOTICE 'OK user_id=% company_id=% email=%', v_user_id, v_company_id, trim(r.email);
END $$;

SELECT u.id, u.email, u.email_confirmed_at IS NOT NULL AS confirmado
FROM auth.users u
WHERE lower(u.email) = (SELECT lower(trim(email)) FROM _sa_connect_seed LIMIT 1);
