-- RG e nome da mãe no cadastro de lideranças.

ALTER TABLE public.liderancas
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS nome_mae TEXT;

COMMENT ON COLUMN public.liderancas.rg IS 'Documento de identidade (texto livre; pode conter letras e pontuação).';
COMMENT ON COLUMN public.liderancas.nome_mae IS 'Nome completo da mãe (opcional).';
