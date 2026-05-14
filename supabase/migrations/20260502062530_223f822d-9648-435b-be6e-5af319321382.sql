-- crypt / gen_salt vêm do pgcrypto (Supabase: schema extensions)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  new_user_id uuid;
  existing_user_id uuid;
BEGIN
  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@saconnect.com';

  IF existing_user_id IS NULL THEN
    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'admin@saconnect.com',
      extensions.crypt('Admin@123456', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome','Administrador','cargo','Administrador'),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', 'admin@saconnect.com', 'email_verified', true),
      'email',
      new_user_id::text,
      now(), now(), now()
    );
  ELSE
    new_user_id := existing_user_id;
    UPDATE auth.users
      SET encrypted_password = extensions.crypt('Admin@123456', extensions.gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = new_user_id;
  END IF;

  -- Garante perfil
  INSERT INTO public.profiles (user_id, nome, email, cargo)
  VALUES (new_user_id, 'Administrador', 'admin@saconnect.com', 'Administrador')
  ON CONFLICT DO NOTHING;

  -- Garante papel admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
