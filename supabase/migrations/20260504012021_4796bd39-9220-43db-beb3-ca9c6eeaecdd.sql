CREATE TABLE IF NOT EXISTS public.whatsapp_meta_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_id TEXT,
  category TEXT,
  language TEXT DEFAULT 'pt_BR',
  status TEXT DEFAULT 'PENDING',
  components JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_meta_tpl_company ON public.whatsapp_meta_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_wa_meta_tpl_session ON public.whatsapp_meta_templates(session_id);

ALTER TABLE public.whatsapp_meta_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_tpl_select" ON public.whatsapp_meta_templates
  FOR SELECT USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "meta_tpl_insert" ON public.whatsapp_meta_templates
  FOR INSERT WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "meta_tpl_update" ON public.whatsapp_meta_templates
  FOR UPDATE USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "meta_tpl_delete" ON public.whatsapp_meta_templates
  FOR DELETE USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER trg_wa_meta_tpl_updated
  BEFORE UPDATE ON public.whatsapp_meta_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();