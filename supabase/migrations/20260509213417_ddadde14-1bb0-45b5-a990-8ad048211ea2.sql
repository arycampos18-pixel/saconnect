
-- Conversas e mensagens recebidas via webhook do WhatsApp em Massa (Meta Cloud API)
CREATE TABLE IF NOT EXISTS public.wa_bulk_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  api_id uuid REFERENCES public.wa_bulk_apis(id) ON DELETE SET NULL,
  wa_numero text NOT NULL,
  wa_nome text,
  ultima_mensagem text,
  ultima_interacao timestamptz NOT NULL DEFAULT now(),
  ultima_msg_recebida_em timestamptz,
  status text NOT NULL DEFAULT 'aberta',
  nao_lidas integer NOT NULL DEFAULT 0,
  agente_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, api_id, wa_numero)
);

CREATE INDEX IF NOT EXISTS idx_wa_bulk_conv_company ON public.wa_bulk_conversas (company_id, ultima_interacao DESC);
CREATE INDEX IF NOT EXISTS idx_wa_bulk_conv_status ON public.wa_bulk_conversas (company_id, status);

CREATE TABLE IF NOT EXISTS public.wa_bulk_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES public.wa_bulk_conversas(id) ON DELETE CASCADE,
  api_id uuid REFERENCES public.wa_bulk_apis(id) ON DELETE SET NULL,
  direcao text NOT NULL CHECK (direcao IN ('entrada','saida')),
  tipo text NOT NULL DEFAULT 'texto',
  corpo text,
  message_id_meta text,
  status text,
  remetente_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_bulk_msg_conv ON public.wa_bulk_mensagens (conversa_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wa_bulk_msg_meta ON public.wa_bulk_mensagens (message_id_meta);

ALTER TABLE public.wa_bulk_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_bulk_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_bulk_conv_select" ON public.wa_bulk_conversas FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "wa_bulk_conv_update" ON public.wa_bulk_conversas FOR UPDATE TO authenticated
  USING (is_super_admin(auth.uid()) OR user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "wa_bulk_conv_insert" ON public.wa_bulk_conversas FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "wa_bulk_msg_select" ON public.wa_bulk_mensagens FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "wa_bulk_msg_insert" ON public.wa_bulk_mensagens FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER trg_wa_bulk_conv_updated BEFORE UPDATE ON public.wa_bulk_conversas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_bulk_conversas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_bulk_mensagens;
