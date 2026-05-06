-- ============================================================
-- MÓDULO CHATBOT / MENU URA
-- Isolado em prefixo "chatbot_*"
-- ============================================================

-- 1) Fluxos (cada fluxo é uma "árvore" de menu/conversação)
CREATE TABLE public.chatbot_fluxos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT false,
  is_padrao BOOLEAN NOT NULL DEFAULT false,
  no_inicial_id UUID,
  mensagem_invalida TEXT NOT NULL DEFAULT 'Opção inválida. Por favor, escolha uma das opções abaixo:',
  mensagem_timeout TEXT NOT NULL DEFAULT 'Sessão encerrada por inatividade. Envie uma nova mensagem para começar.',
  timeout_minutos INTEGER NOT NULL DEFAULT 30,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Nós do fluxo
-- tipos: 'mensagem' | 'menu' | 'coleta' | 'encaminhar' | 'encerrar'
CREATE TABLE public.chatbot_nos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fluxo_id UUID NOT NULL REFERENCES public.chatbot_fluxos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'menu',
  mensagem TEXT,
  -- Para 'menu': array [{ "tecla":"1","label":"Saúde","proximo_no_id":"...","departamento_id":"...","tag_id":"..." }]
  opcoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Para 'coleta': nome da variável a salvar (ex: 'cpf','email')
  variavel TEXT,
  -- Para 'encaminhar': departamento e/ou tag
  departamento_id UUID,
  proximo_no_id UUID,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK auto-referente (após tabela existir)
ALTER TABLE public.chatbot_fluxos
  ADD CONSTRAINT fk_chatbot_no_inicial
  FOREIGN KEY (no_inicial_id) REFERENCES public.chatbot_nos(id) ON DELETE SET NULL;

ALTER TABLE public.chatbot_nos
  ADD CONSTRAINT fk_chatbot_proximo_no
  FOREIGN KEY (proximo_no_id) REFERENCES public.chatbot_nos(id) ON DELETE SET NULL;

CREATE INDEX idx_chatbot_nos_fluxo ON public.chatbot_nos(fluxo_id);

-- 3) Sessões (estado do bot por conversa)
CREATE TABLE public.chatbot_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL UNIQUE,
  fluxo_id UUID NOT NULL REFERENCES public.chatbot_fluxos(id) ON DELETE CASCADE,
  no_atual_id UUID REFERENCES public.chatbot_nos(id) ON DELETE SET NULL,
  variaveis JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo' | 'finalizado' | 'transferido' | 'expirado'
  ultima_interacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ
);

CREATE INDEX idx_chatbot_sessoes_conversa ON public.chatbot_sessoes(conversa_id);
CREATE INDEX idx_chatbot_sessoes_status ON public.chatbot_sessoes(status);

-- 4) Toggle global no whatsapp_config
ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS chatbot_ativo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chatbot_fluxo_id UUID REFERENCES public.chatbot_fluxos(id) ON DELETE SET NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.chatbot_fluxos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_nos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_sessoes ENABLE ROW LEVEL SECURITY;

-- Fluxos
CREATE POLICY "Fluxos visíveis para autenticados" ON public.chatbot_fluxos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam fluxos" ON public.chatbot_fluxos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Nós
CREATE POLICY "Nós visíveis para autenticados" ON public.chatbot_nos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam nós" ON public.chatbot_nos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Sessões (visíveis a todos atendentes; service-role grava via webhook)
CREATE POLICY "Sessões visíveis para autenticados" ON public.chatbot_sessoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados atualizam sessões" ON public.chatbot_sessoes
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Triggers de timestamp
-- ============================================================
CREATE TRIGGER trg_chatbot_fluxos_updated
  BEFORE UPDATE ON public.chatbot_fluxos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_chatbot_nos_updated
  BEFORE UPDATE ON public.chatbot_nos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();