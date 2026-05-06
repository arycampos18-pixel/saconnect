-- Categorias
CREATE TABLE public.ticket_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Filas
CREATE TABLE public.ticket_queues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tickets
CREATE TABLE public.tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  ticket_number SERIAL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  category_id UUID REFERENCES public.ticket_categories(id) ON DELETE SET NULL,
  queue_id UUID REFERENCES public.ticket_queues(id) ON DELETE SET NULL,
  requester_name TEXT,
  requester_email TEXT,
  requester_phone TEXT,
  assigned_to UUID REFERENCES public.settings_users(id) ON DELETE SET NULL,
  sla_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_company ON public.tickets(company_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_assigned ON public.tickets(assigned_to);

-- Mensagens
CREATE TABLE public.ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.settings_users(id) ON DELETE SET NULL,
  sender_type TEXT CHECK (sender_type IN ('agent','customer','system')),
  content TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);

-- Agenda
CREATE TABLE public.ticket_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  agent_id UUID REFERENCES public.settings_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','cancelled')),
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_events_company ON public.ticket_events(company_id);
CREATE INDEX idx_ticket_events_ticket ON public.ticket_events(ticket_id);
CREATE INDEX idx_ticket_events_range ON public.ticket_events(start_datetime, end_datetime);

-- Integração Google Calendar
CREATE TABLE public.ticket_calendar_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.settings_users(id) ON DELETE CASCADE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_calendar_id TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Triggers updated_at
CREATE TRIGGER trg_tickets_upd BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ticket_events_upd BEFORE UPDATE ON public.ticket_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ticket_cal_upd BEFORE UPDATE ON public.ticket_calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Policies (todas baseadas em user_belongs_to_company)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['ticket_categories','ticket_queues','tickets','ticket_messages','ticket_events','ticket_calendar_integrations'])
  LOOP
    EXECUTE format('CREATE POLICY "%s_sel" ON public.%I FOR SELECT USING (public.user_belongs_to_company(auth.uid(), company_id));', t, t);
    EXECUTE format('CREATE POLICY "%s_ins" ON public.%I FOR INSERT WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));', t, t);
    EXECUTE format('CREATE POLICY "%s_upd" ON public.%I FOR UPDATE USING (public.user_belongs_to_company(auth.uid(), company_id));', t, t);
    EXECUTE format('CREATE POLICY "%s_del" ON public.%I FOR DELETE USING (public.user_belongs_to_company(auth.uid(), company_id));', t, t);
  END LOOP;
END $$;