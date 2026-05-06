-- Departamentos
CREATE TABLE public.departamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#2563EB',
  icone TEXT NOT NULL DEFAULT 'Building2',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departamentos visíveis para autenticados"
  ON public.departamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins criam departamentos"
  ON public.departamentos FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins atualizam departamentos"
  ON public.departamentos FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins removem departamentos"
  ON public.departamentos FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_departamentos_updated
BEFORE UPDATE ON public.departamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Membros de departamento
CREATE TABLE public.departamento_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (departamento_id, user_id)
);
ALTER TABLE public.departamento_membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros visíveis para autenticados"
  ON public.departamento_membros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam membros"
  ON public.departamento_membros FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seeds básicos
INSERT INTO public.departamentos (nome, descricao, cor, icone) VALUES
  ('Saúde', 'Demandas de saúde', '#10B981', 'Heart'),
  ('Educação', 'Demandas de educação', '#3B82F6', 'GraduationCap'),
  ('Ação Social', 'Cesta básica e assistência', '#F59E0B', 'HandHeart'),
  ('Infraestrutura', 'Obras e serviços urbanos', '#6B7280', 'Hammer'),
  ('Geral', 'Atendimento geral', '#8B5CF6', 'MessageCircle');

-- Status enums
CREATE TYPE public.conversa_status AS ENUM ('Pendente', 'Em atendimento', 'Atendido');
CREATE TYPE public.mensagem_direcao AS ENUM ('entrada', 'saida');
CREATE TYPE public.mensagem_tipo AS ENUM ('texto', 'imagem', 'audio', 'video', 'documento', 'localizacao', 'contato', 'outro');

-- Conversas
CREATE TABLE public.whatsapp_conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone TEXT NOT NULL,
  telefone_digits TEXT NOT NULL,
  contato_nome TEXT,
  eleitor_id UUID REFERENCES public.eleitores(id) ON DELETE SET NULL,
  atendente_id UUID,
  departamento_id UUID REFERENCES public.departamentos(id) ON DELETE SET NULL,
  status public.conversa_status NOT NULL DEFAULT 'Pendente',
  ultima_mensagem TEXT,
  ultima_mensagem_em TIMESTAMPTZ,
  ultima_direcao public.mensagem_direcao,
  nao_lidas INTEGER NOT NULL DEFAULT 0,
  instancia TEXT,
  assumida_em TIMESTAMPTZ,
  finalizada_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (telefone_digits)
);
CREATE INDEX idx_conversas_status ON public.whatsapp_conversas(status);
CREATE INDEX idx_conversas_atendente ON public.whatsapp_conversas(atendente_id);
CREATE INDEX idx_conversas_dep ON public.whatsapp_conversas(departamento_id);
CREATE INDEX idx_conversas_ultima ON public.whatsapp_conversas(ultima_mensagem_em DESC);

ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conversas visíveis para autenticados"
  ON public.whatsapp_conversas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam conversas"
  ON public.whatsapp_conversas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam conversas"
  ON public.whatsapp_conversas FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins removem conversas"
  ON public.whatsapp_conversas FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_conversas_updated
BEFORE UPDATE ON public.whatsapp_conversas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mensagens
CREATE TABLE public.whatsapp_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID NOT NULL REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  direcao public.mensagem_direcao NOT NULL,
  tipo public.mensagem_tipo NOT NULL DEFAULT 'texto',
  conteudo TEXT,
  midia_url TEXT,
  midia_mime TEXT,
  provedor_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'Recebido',
  enviado_por UUID,
  enviado_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  lido_em TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_msg_conversa ON public.whatsapp_mensagens(conversa_id, created_at DESC);
CREATE INDEX idx_msg_provider ON public.whatsapp_mensagens(provedor_message_id);

ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mensagens visíveis para autenticados"
  ON public.whatsapp_mensagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam mensagens"
  ON public.whatsapp_mensagens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam mensagens"
  ON public.whatsapp_mensagens FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins removem mensagens"
  ON public.whatsapp_mensagens FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger: atualizar conversa ao inserir mensagem
CREATE OR REPLACE FUNCTION public.update_conversa_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_conversas
  SET ultima_mensagem = LEFT(COALESCE(NEW.conteudo, '[' || NEW.tipo::text || ']'), 200),
      ultima_mensagem_em = COALESCE(NEW.enviado_em, NEW.created_at),
      ultima_direcao = NEW.direcao,
      nao_lidas = CASE WHEN NEW.direcao = 'entrada' THEN nao_lidas + 1 ELSE nao_lidas END,
      updated_at = now()
  WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_msg_update_conversa
AFTER INSERT ON public.whatsapp_mensagens
FOR EACH ROW EXECUTE FUNCTION public.update_conversa_on_message();

-- Trigger: auto-vincular eleitor pelo telefone ao criar conversa
CREATE OR REPLACE FUNCTION public.link_eleitor_to_conversa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eleitor_id UUID;
BEGIN
  NEW.telefone_digits := regexp_replace(NEW.telefone, '\D', '', 'g');

  IF NEW.eleitor_id IS NULL AND length(NEW.telefone_digits) >= 10 THEN
    SELECT id INTO v_eleitor_id
    FROM public.eleitores
    WHERE regexp_replace(telefone, '\D', '', 'g') = NEW.telefone_digits
       OR regexp_replace(telefone, '\D', '', 'g') = right(NEW.telefone_digits, 11)
    LIMIT 1;
    IF v_eleitor_id IS NOT NULL THEN
      NEW.eleitor_id := v_eleitor_id;
      IF NEW.contato_nome IS NULL THEN
        SELECT nome INTO NEW.contato_nome FROM public.eleitores WHERE id = v_eleitor_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_conversa_link_eleitor
BEFORE INSERT OR UPDATE OF telefone ON public.whatsapp_conversas
FOR EACH ROW EXECUTE FUNCTION public.link_eleitor_to_conversa();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_mensagens;
ALTER TABLE public.whatsapp_conversas REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_mensagens REPLICA IDENTITY FULL;