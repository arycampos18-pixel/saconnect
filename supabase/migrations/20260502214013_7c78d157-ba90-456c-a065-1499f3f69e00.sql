
-- SLAs
CREATE TABLE public.whatsapp_slas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  departamento_id uuid REFERENCES public.departamentos(id) ON DELETE SET NULL,
  tempo_resposta_min integer NOT NULL DEFAULT 30,
  tempo_resolucao_horas integer NOT NULL DEFAULT 4,
  prioridade text NOT NULL DEFAULT 'Média',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.whatsapp_slas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SLAs visíveis para autenticados" ON public.whatsapp_slas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam SLAs" ON public.whatsapp_slas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_whatsapp_slas_updated BEFORE UPDATE ON public.whatsapp_slas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tags
CREATE TABLE public.whatsapp_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#EF4444',
  descricao text,
  departamento_id uuid REFERENCES public.departamentos(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.whatsapp_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags visíveis para autenticados" ON public.whatsapp_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam tags" ON public.whatsapp_tags FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_whatsapp_tags_updated BEFORE UPDATE ON public.whatsapp_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notas Internas
CREATE TABLE public.whatsapp_notas_internas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'Padrão',
  titulo text NOT NULL,
  descricao text,
  visibilidade text NOT NULL DEFAULT 'Todos',
  departamento_id uuid REFERENCES public.departamentos(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.whatsapp_notas_internas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notas visíveis para autenticados" ON public.whatsapp_notas_internas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam notas" ON public.whatsapp_notas_internas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_whatsapp_notas_updated BEFORE UPDATE ON public.whatsapp_notas_internas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Horários
CREATE TABLE public.whatsapp_horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana smallint NOT NULL UNIQUE,
  hora_inicio time,
  hora_fim time,
  aberto boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_horarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Horários visíveis para autenticados" ON public.whatsapp_horarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam horários" ON public.whatsapp_horarios FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_whatsapp_horarios_updated BEFORE UPDATE ON public.whatsapp_horarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- seed default schedule
INSERT INTO public.whatsapp_horarios (dia_semana, hora_inicio, hora_fim, aberto) VALUES
  (1, '08:00', '18:00', true),
  (2, '08:00', '18:00', true),
  (3, '08:00', '18:00', true),
  (4, '08:00', '18:00', true),
  (5, '08:00', '18:00', true),
  (6, '09:00', '14:00', true),
  (0, NULL, NULL, false);

-- Feriados
CREATE TABLE public.whatsapp_feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Feriado Nacional',
  mensagem text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.whatsapp_feriados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feriados visíveis para autenticados" ON public.whatsapp_feriados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam feriados" ON public.whatsapp_feriados FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_whatsapp_feriados_updated BEFORE UPDATE ON public.whatsapp_feriados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
