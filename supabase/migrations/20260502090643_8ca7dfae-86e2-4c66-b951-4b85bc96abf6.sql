-- Enums
CREATE TYPE public.canal_externo AS ENUM ('WhatsApp', 'SMS', 'Telegram', 'Email');
CREATE TYPE public.mensagem_status AS ENUM ('Pendente', 'Enviado', 'Entregue', 'Falhou', 'Simulado');
CREATE TYPE public.rede_social AS ENUM ('Instagram', 'Facebook', 'X', 'LinkedIn', 'TikTok', 'YouTube', 'Outro');
CREATE TYPE public.post_status AS ENUM ('Rascunho', 'Agendado', 'Publicado', 'Cancelado');

-- Mensagens externas (WhatsApp / SMS)
CREATE TABLE public.mensagens_externas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  canal public.canal_externo NOT NULL,
  destinatario TEXT NOT NULL,
  destinatario_nome TEXT,
  conteudo TEXT NOT NULL,
  status public.mensagem_status NOT NULL DEFAULT 'Pendente',
  provedor TEXT,
  provedor_message_id TEXT,
  erro TEXT,
  enviado_em TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mensagens_externas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver mensagens" ON public.mensagens_externas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar mensagens" ON public.mensagens_externas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Donos podem atualizar mensagens" ON public.mensagens_externas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin pode excluir mensagens" ON public.mensagens_externas
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mensagens_externas_updated_at
  BEFORE UPDATE ON public.mensagens_externas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Posts sociais (planejamento manual)
CREATE TABLE public.posts_sociais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rede public.rede_social NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  link TEXT,
  imagem_url TEXT,
  status public.post_status NOT NULL DEFAULT 'Rascunho',
  agendado_para TIMESTAMPTZ,
  publicado_em TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.posts_sociais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver posts" ON public.posts_sociais
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar posts" ON public.posts_sociais
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Donos/admin podem atualizar posts" ON public.posts_sociais
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Donos/admin podem excluir posts" ON public.posts_sociais
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_posts_sociais_updated_at
  BEFORE UPDATE ON public.posts_sociais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Configurações de integração
CREATE TABLE public.integracoes_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor JSONB NOT NULL DEFAULT '{}'::jsonb,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integracoes_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver config" ON public.integracoes_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia config" ON public.integracoes_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_integracoes_config_updated_at
  BEFORE UPDATE ON public.integracoes_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_mensagens_externas_user ON public.mensagens_externas(user_id);
CREATE INDEX idx_mensagens_externas_canal ON public.mensagens_externas(canal);
CREATE INDEX idx_mensagens_externas_status ON public.mensagens_externas(status);
CREATE INDEX idx_posts_sociais_status ON public.posts_sociais(status);
CREATE INDEX idx_posts_sociais_agendado ON public.posts_sociais(agendado_para);