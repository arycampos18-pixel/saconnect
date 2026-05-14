-- Adiciona coluna bairro em departamento_membros
-- (estava faltando e causava erro ao adicionar membros do gabinete)
ALTER TABLE public.departamento_membros
  ADD COLUMN IF NOT EXISTS bairro TEXT;
