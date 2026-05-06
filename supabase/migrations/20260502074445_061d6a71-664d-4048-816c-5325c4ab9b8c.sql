-- Enums
CREATE TYPE public.compromisso_categoria AS ENUM ('Reunião', 'Visita', 'Evento', 'Audiência', 'Outro');
CREATE TYPE public.compromisso_prioridade AS ENUM ('Baixa', 'Média', 'Alta');
CREATE TYPE public.compromisso_status AS ENUM ('Agendado', 'Concluído', 'Cancelado');

-- Tabela
CREATE TABLE public.agenda_compromissos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  local text,
  data_hora timestamp with time zone NOT NULL,
  duracao_min integer NOT NULL DEFAULT 60,
  categoria public.compromisso_categoria NOT NULL DEFAULT 'Reunião',
  prioridade public.compromisso_prioridade NOT NULL DEFAULT 'Média',
  status public.compromisso_status NOT NULL DEFAULT 'Agendado',
  responsavel_id uuid,
  lembrete_min integer NOT NULL DEFAULT 30,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_agenda_data_hora ON public.agenda_compromissos (data_hora);

-- RLS
ALTER TABLE public.agenda_compromissos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Compromissos visíveis para autenticados"
  ON public.agenda_compromissos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autenticados criam compromissos"
  ON public.agenda_compromissos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Criador ou admin atualiza compromissos"
  ON public.agenda_compromissos FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Criador ou admin remove compromissos"
  ON public.agenda_compromissos FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER set_agenda_updated_at
  BEFORE UPDATE ON public.agenda_compromissos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();