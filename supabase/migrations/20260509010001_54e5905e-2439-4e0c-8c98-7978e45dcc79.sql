
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.agenda_notificacoes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  telefone TEXT,
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'pendente',
  total_compromissos INT NOT NULL DEFAULT 0,
  data_referencia DATE NOT NULL,
  mensagem TEXT,
  erro TEXT,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_notif_log_user ON public.agenda_notificacoes_log(user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_notif_log_data ON public.agenda_notificacoes_log(data_referencia DESC);

ALTER TABLE public.agenda_notificacoes_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin ve todos logs notif" ON public.agenda_notificacoes_log;
CREATE POLICY "Super admin ve todos logs notif"
  ON public.agenda_notificacoes_log FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()) OR user_id = auth.uid());
