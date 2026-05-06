
DROP TABLE IF EXISTS public.whatsapp_meta_templates CASCADE;

CREATE TABLE public.whatsapp_meta_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone_number_id VARCHAR(255) NOT NULL,
  waba_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  app_id VARCHAR(255),
  app_secret TEXT,
  verify_token VARCHAR(255) NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  webhook_url VARCHAR(500),
  webhook_verified_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_meta_session_company_phone UNIQUE (company_id, phone_number_id),
  CONSTRAINT uq_meta_session_verify_token UNIQUE (verify_token)
);
CREATE INDEX idx_meta_sessions_company ON public.whatsapp_meta_sessions(company_id);
CREATE INDEX idx_meta_sessions_status ON public.whatsapp_meta_sessions(status);

CREATE TABLE public.whatsapp_meta_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.whatsapp_meta_sessions(id) ON DELETE CASCADE,
  template_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'MARKETING',
  language VARCHAR(10) NOT NULL DEFAULT 'pt_BR',
  header_type VARCHAR(50),
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_meta_template_session_name UNIQUE (session_id, name, language)
);
CREATE INDEX idx_meta_templates_company ON public.whatsapp_meta_templates(company_id);
CREATE INDEX idx_meta_templates_session ON public.whatsapp_meta_templates(session_id);
CREATE INDEX idx_meta_templates_status ON public.whatsapp_meta_templates(status);

CREATE TABLE public.whatsapp_meta_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.whatsapp_meta_sessions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.whatsapp_meta_templates(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  contact_list_id UUID,
  cadence_initial_seconds INT NOT NULL DEFAULT 600,
  cadence_final_seconds INT NOT NULL DEFAULT 600,
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  total_contacts INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  read_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_cadence CHECK (cadence_initial_seconds > 0 AND cadence_final_seconds > 0)
);
CREATE INDEX idx_meta_campaigns_company ON public.whatsapp_meta_campaigns(company_id);
CREATE INDEX idx_meta_campaigns_session ON public.whatsapp_meta_campaigns(session_id);
CREATE INDEX idx_meta_campaigns_status ON public.whatsapp_meta_campaigns(status);

CREATE TABLE public.whatsapp_meta_campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_meta_campaigns(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  contact_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  message_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_campaign_contact_phone UNIQUE (campaign_id, phone_number)
);
CREATE INDEX idx_meta_campaign_contacts_campaign ON public.whatsapp_meta_campaign_contacts(campaign_id);
CREATE INDEX idx_meta_campaign_contacts_status ON public.whatsapp_meta_campaign_contacts(status);

CREATE TABLE public.whatsapp_meta_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.whatsapp_meta_campaigns(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.whatsapp_meta_sessions(id) ON DELETE SET NULL,
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  interaction_type VARCHAR(50),
  interaction_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  notes TEXT,
  first_interaction_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meta_leads_company ON public.whatsapp_meta_leads(company_id);
CREATE INDEX idx_meta_leads_campaign ON public.whatsapp_meta_leads(campaign_id);
CREATE INDEX idx_meta_leads_status ON public.whatsapp_meta_leads(status);
CREATE INDEX idx_meta_leads_phone ON public.whatsapp_meta_leads(phone_number);

CREATE TRIGGER trg_meta_sessions_updated BEFORE UPDATE ON public.whatsapp_meta_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meta_templates_updated BEFORE UPDATE ON public.whatsapp_meta_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meta_campaigns_updated BEFORE UPDATE ON public.whatsapp_meta_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meta_campaign_contacts_updated BEFORE UPDATE ON public.whatsapp_meta_campaign_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meta_leads_updated BEFORE UPDATE ON public.whatsapp_meta_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_meta_sessions_set_company BEFORE INSERT ON public.whatsapp_meta_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_meta_templates_set_company BEFORE INSERT ON public.whatsapp_meta_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_meta_campaigns_set_company BEFORE INSERT ON public.whatsapp_meta_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_meta_leads_set_company BEFORE INSERT ON public.whatsapp_meta_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

ALTER TABLE public.whatsapp_meta_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_meta_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_meta_campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_meta_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_all_meta_sessions ON public.whatsapp_meta_sessions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY tenant_all_meta_templates ON public.whatsapp_meta_templates FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY tenant_all_meta_campaigns ON public.whatsapp_meta_campaigns FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY tenant_all_meta_campaign_contacts ON public.whatsapp_meta_campaign_contacts FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.whatsapp_meta_campaigns c
      WHERE c.id = campaign_id AND public.user_belongs_to_company(auth.uid(), c.company_id)
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.whatsapp_meta_campaigns c
      WHERE c.id = campaign_id AND public.user_belongs_to_company(auth.uid(), c.company_id)
    )
  );

CREATE POLICY tenant_all_meta_leads ON public.whatsapp_meta_leads FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
