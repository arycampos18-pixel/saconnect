-- Campos adicionais de cadastro de liderança (alinhados ao fluxo de eleitor, sem vínculos hierárquicos).

ALTER TABLE public.liderancas
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS genero TEXT,
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'Cadastro Manual';

COMMENT ON COLUMN public.liderancas.cpf IS 'Opcional; apenas dígitos no armazenamento é recomendado pelo app.';
COMMENT ON COLUMN public.liderancas.origem IS 'Origem do cadastro da liderança (ex.: Cadastro Manual).';
