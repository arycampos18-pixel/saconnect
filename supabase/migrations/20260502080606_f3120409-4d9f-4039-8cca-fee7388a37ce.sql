-- Catálogo de badges
CREATE TABLE public.gamificacao_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT NOT NULL DEFAULT 'Award',
  cor TEXT NOT NULL DEFAULT '#2563EB',
  criterio TEXT,
  pontos INTEGER NOT NULL DEFAULT 10,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gamificacao_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges visíveis para autenticados" ON public.gamificacao_badges
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins criam badges" ON public.gamificacao_badges
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins atualizam badges" ON public.gamificacao_badges
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins removem badges" ON public.gamificacao_badges
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_gamificacao_badges_updated
  BEFORE UPDATE ON public.gamificacao_badges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Desafios
CREATE TABLE public.gamificacao_desafios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  meta INTEGER NOT NULL DEFAULT 10,
  metrica TEXT NOT NULL DEFAULT 'eleitores_cadastrados',
  recompensa_pontos INTEGER NOT NULL DEFAULT 50,
  badge_id UUID,
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fim TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gamificacao_desafios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Desafios visíveis para autenticados" ON public.gamificacao_desafios
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins criam desafios" ON public.gamificacao_desafios
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins atualizam desafios" ON public.gamificacao_desafios
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins removem desafios" ON public.gamificacao_desafios
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_gamificacao_desafios_updated
  BEFORE UPDATE ON public.gamificacao_desafios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pontuações (histórico)
CREATE TABLE public.gamificacao_pontuacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pontos INTEGER NOT NULL DEFAULT 0,
  motivo TEXT NOT NULL,
  referencia_tipo TEXT,
  referencia_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gamificacao_pontuacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pontuações visíveis para autenticados" ON public.gamificacao_pontuacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados registram pontos" ON public.gamificacao_pontuacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins removem pontos" ON public.gamificacao_pontuacoes
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_pontuacoes_user ON public.gamificacao_pontuacoes(user_id);

-- Badges conquistadas
CREATE TABLE public.gamificacao_badges_conquistadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL,
  conquistada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE public.gamificacao_badges_conquistadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conquistas visíveis para autenticados" ON public.gamificacao_badges_conquistadas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados registram conquistas" ON public.gamificacao_badges_conquistadas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins removem conquistas" ON public.gamificacao_badges_conquistadas
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Progresso de desafios
CREATE TABLE public.gamificacao_desafio_progresso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  desafio_id UUID NOT NULL,
  progresso INTEGER NOT NULL DEFAULT 0,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, desafio_id)
);

ALTER TABLE public.gamificacao_desafio_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Progresso visível para autenticados" ON public.gamificacao_desafio_progresso
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam progresso" ON public.gamificacao_desafio_progresso
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam progresso" ON public.gamificacao_desafio_progresso
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins removem progresso" ON public.gamificacao_desafio_progresso
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_desafio_progresso_updated
  BEFORE UPDATE ON public.gamificacao_desafio_progresso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds: badges padrão
INSERT INTO public.gamificacao_badges (nome, descricao, icone, cor, criterio, pontos) VALUES
  ('Primeiro Cadastro', 'Cadastrou seu primeiro eleitor', 'UserPlus', '#10B981', '1 eleitor cadastrado', 10),
  ('Cabo Bronze', 'Atingiu 10 eleitores cadastrados', 'Medal', '#CD7F32', '10 eleitores cadastrados', 50),
  ('Cabo Prata', 'Atingiu 50 eleitores cadastrados', 'Medal', '#C0C0C0', '50 eleitores cadastrados', 150),
  ('Cabo Ouro', 'Atingiu 100 eleitores cadastrados', 'Trophy', '#FFD700', '100 eleitores cadastrados', 300),
  ('Mestre da Mobilização', 'Organizou 5 eventos', 'Star', '#8B5CF6', '5 eventos criados', 200);