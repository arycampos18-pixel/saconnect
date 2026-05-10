ALTER TABLE public.disparos
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'disparo_rapido';

-- Atualiza registros existentes que já têm agendamento como "agendada"
UPDATE public.disparos
   SET tipo = 'agendada'
 WHERE agendado_para IS NOT NULL AND tipo = 'disparo_rapido';

CREATE INDEX IF NOT EXISTS idx_disparos_tipo ON public.disparos(tipo);
CREATE INDEX IF NOT EXISTS idx_disparos_agendado_para ON public.disparos(agendado_para);