
ALTER TABLE public.analise_eleitores
  ADD COLUMN IF NOT EXISTS codigo_validacao_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS codigo_expira_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tentativas_validacao INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_validacao_whatsapp TIMESTAMPTZ;
