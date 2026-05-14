-- =============================================================================
-- Cria UMA empresa nova + utilizador master (Auth + settings) vinculado a ela.
-- Executar no Supabase: SQL Editor (como postgres / service role).
--
-- ANTES DE CORRER: edita as 4 linhas em "CONFIG" abaixo (e-mail, senha em
-- claro uma única vez, nomes da empresa). Não commites este ficheiro com senha.
-- Depois de usar, apaga ou reverte a senha no Auth se a colaste em chat.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  -- ========= CONFIG (editar) =========
  v_email          text := 'saconnectbr@gmail.com';
  v_senha_plana    text := 'S@connect1992';
  v_nome_fantasia  text := 'SA CONNECT BR';
  v_razao_social   text := 'SA CONNECT BR';
  v_nome_perfil    text := 'Master';
  -- ===================================

  v_user_id            uuid;
  v_company_id         uuid;
  v_admin_profile_id   uuid;
  v_atendente_profile_id uuid;
BEGIN
  IF v_senha_plana = 'COLOQUE_A_SENHA_AQUI' OR length(trim(v_senha_plana)) < 8 THEN
    RAISE EXCEPTION 'Defina v_senha_plana (mín. 8 caracteres) no bloco CONFIG antes de executar.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email) LIMIT 1;

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
      v_email,
      extensions.crypt(v_senha_plana, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome', v_nome_perfil, 'cargo', 'Administrador'),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email',
      v_user_id::text,
      now(), now(), now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(v_senha_plana, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email') THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email',
      v_user_id::text,
      now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (user_id, nome, email, cargo)
  VALUES (v_user_id, v_nome_perfil, v_email, 'Administrador')
  ON CONFLICT (user_id) DO UPDATE
  SET nome = EXCLUDED.nome, email = EXCLUDED.email, cargo = EXCLUDED.cargo, updated_at = now();

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  DELETE FROM public.user_roles WHERE user_id = v_user_id AND role = 'operador';

  SELECT id INTO v_company_id
  FROM public.settings_companies
  WHERE lower(nome_fantasia) = lower(v_nome_fantasia)
  LIMIT 1;

  IF v_company_id IS NULL THEN
    INSERT INTO public.settings_companies (razao_social, nome_fantasia, status, plan)
    VALUES (v_razao_social, v_nome_fantasia, 'active', 'enterprise')
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
      v_nome_fantasia,
      '["whatsapp","eleitores","disparos","eventos","crm","relatorios","automacoes","departamentos","settings"]'::jsonb
    );
  ELSE
    SELECT id INTO v_admin_profile_id
    FROM public.settings_profiles
    WHERE company_id = v_company_id AND nome = 'Admin'
    LIMIT 1;
    IF v_admin_profile_id IS NULL THEN
      RAISE EXCEPTION 'Empresa % já existe mas sem perfil Admin — corrija manualmente.', v_nome_fantasia;
    END IF;
  END IF;

  INSERT INTO public.settings_users (id, nome, email, is_super_admin, active_company_id)
  VALUES (v_user_id, v_nome_perfil, v_email, true, v_company_id)
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

  RAISE NOTICE 'OK: user_id=% company_id=% email=%', v_user_id, v_company_id, v_email;
END $$;
