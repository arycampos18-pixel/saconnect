
-- Tabela de sessões activas da aplicação
CREATE TABLE IF NOT EXISTS public.auth_app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_jti text NOT NULL,
  device_label text,
  user_agent text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_reason text
);

CREATE INDEX IF NOT EXISTS auth_app_sessions_user_active_idx
  ON public.auth_app_sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS auth_app_sessions_jti_idx
  ON public.auth_app_sessions(session_jti);

ALTER TABLE public.auth_app_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions"
  ON public.auth_app_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- writes apenas via service role (edge functions)

ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_app_sessions;
ALTER TABLE public.auth_app_sessions REPLICA IDENTITY FULL;

-- Tabela de eventos de segurança
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  company_id uuid,
  event_type text NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_user_idx ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS security_events_company_idx ON public.security_events(company_id);
CREATE INDEX IF NOT EXISTS security_events_type_idx ON public.security_events(event_type);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own security events"
  ON public.security_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view company security events"
  ON public.security_events FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (company_id IS NOT NULL AND public.user_has_permission(auth.uid(), company_id, 'settings.audit.view'))
  );
