
-- =============== TABELAS ===============
CREATE TABLE public.liderancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  cidade text,
  meta integer NOT NULL DEFAULT 100,
  ativo boolean NOT NULL DEFAULT true,
  user_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cabos_eleitorais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lideranca_id uuid NOT NULL REFERENCES public.liderancas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  meta integer NOT NULL DEFAULT 50,
  ativo boolean NOT NULL DEFAULT true,
  user_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#2563EB',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.eleitores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  cpf text,
  email text,
  data_nascimento date,
  genero text,
  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  origem text NOT NULL DEFAULT 'Cadastro Manual',
  observacoes text,
  consentimento_lgpd boolean NOT NULL DEFAULT false,
  lideranca_id uuid REFERENCES public.liderancas(id) ON DELETE SET NULL,
  cabo_id uuid REFERENCES public.cabos_eleitorais(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.eleitor_tags (
  eleitor_id uuid NOT NULL REFERENCES public.eleitores(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (eleitor_id, tag_id)
);

CREATE INDEX idx_eleitores_created_at ON public.eleitores(created_at DESC);
CREATE INDEX idx_eleitores_lideranca ON public.eleitores(lideranca_id);
CREATE INDEX idx_eleitores_cabo ON public.eleitores(cabo_id);
CREATE INDEX idx_eleitores_bairro ON public.eleitores(bairro);
CREATE INDEX idx_cabos_lideranca ON public.cabos_eleitorais(lideranca_id);

-- =============== TRIGGERS DE updated_at ===============
CREATE TRIGGER trg_liderancas_upd BEFORE UPDATE ON public.liderancas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cabos_upd BEFORE UPDATE ON public.cabos_eleitorais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_eleitores_upd BEFORE UPDATE ON public.eleitores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== Trigger handle_new_user ===============
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============== RLS ===============
ALTER TABLE public.liderancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabos_eleitorais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleitores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleitor_tags ENABLE ROW LEVEL SECURITY;

-- LIDERANCAS
CREATE POLICY "Lideranças visíveis para autenticados" ON public.liderancas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins criam lideranças" ON public.liderancas
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins atualizam lideranças" ON public.liderancas
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins removem lideranças" ON public.liderancas
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- CABOS
CREATE POLICY "Cabos visíveis para autenticados" ON public.cabos_eleitorais
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins criam cabos" ON public.cabos_eleitorais
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins atualizam cabos" ON public.cabos_eleitorais
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins removem cabos" ON public.cabos_eleitorais
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- TAGS
CREATE POLICY "Tags visíveis para autenticados" ON public.tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins criam tags" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins atualizam tags" ON public.tags
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins removem tags" ON public.tags
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ELEITORES
CREATE POLICY "Eleitores visíveis para autenticados" ON public.eleitores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam eleitores" ON public.eleitores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Criador ou admin atualiza eleitores" ON public.eleitores
  FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Criador ou admin remove eleitores" ON public.eleitores
  FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ELEITOR_TAGS
CREATE POLICY "Eleitor_tags visíveis para autenticados" ON public.eleitor_tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados associam tags" ON public.eleitor_tags
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.eleitores e WHERE e.id = eleitor_id
            AND (e.created_by = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Autenticados removem associações" ON public.eleitor_tags
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.eleitores e WHERE e.id = eleitor_id
            AND (e.created_by = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );

-- =============== SEED ===============
INSERT INTO public.tags (nome, cor) VALUES
  ('Saúde','#2563EB'), ('Educação','#1E40AF'), ('Apoiador','#1D4ED8'),
  ('Segurança','#3B82F6'), ('Habitação','#60A5FA'), ('Empreendedor','#0EA5E9'),
  ('Idoso','#0284C7'), ('Jovem','#0369A1'), ('Mulher','#075985'),
  ('Trabalhador','#0C4A6E')
ON CONFLICT (nome) DO NOTHING;

WITH lid AS (
  INSERT INTO public.liderancas (nome, cidade, meta) VALUES
    ('Liderança Ana Paula','São Paulo',200),
    ('Liderança Carlos Mendes','Campinas',150),
    ('Liderança Beatriz Rocha','Santos',120),
    ('Liderança Eduardo Lima','Guarulhos',100)
  RETURNING id, nome
)
INSERT INTO public.cabos_eleitorais (lideranca_id, nome, meta)
SELECT id, c.nome, c.meta FROM lid
JOIN (VALUES
  ('Liderança Ana Paula','Cabo João Silva',60),
  ('Liderança Ana Paula','Cabo Marta Lima',50),
  ('Liderança Ana Paula','Cabo Roberto Dias',80),
  ('Liderança Carlos Mendes','Cabo Patrícia Souza',70),
  ('Liderança Carlos Mendes','Cabo Felipe Costa',80),
  ('Liderança Beatriz Rocha','Cabo Marcos Vieira',50),
  ('Liderança Beatriz Rocha','Cabo Sandra Pereira',70),
  ('Liderança Eduardo Lima','Cabo Júlia Nogueira',50),
  ('Liderança Eduardo Lima','Cabo Henrique Alves',60)
) AS c(lid_nome, nome, meta) ON c.lid_nome = lid.nome;
