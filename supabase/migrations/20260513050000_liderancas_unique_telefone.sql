-- ============================================================
-- Unicidade de telefone em lideranças (por empresa)
-- ============================================================
-- Garante que o mesmo número de telefone não seja cadastrado
-- mais de uma vez na tabela liderancas dentro da mesma empresa.
-- NULLs são permitidos em múltiplos registros (PostgreSQL não
-- considera NULL = NULL em constraints UNIQUE).

-- Normaliza telefones existentes antes de criar o índice
-- (remove caracteres não numéricos para garantir consistência)
UPDATE public.liderancas
SET telefone = regexp_replace(telefone, '\D', '', 'g')
WHERE telefone IS NOT NULL
  AND telefone <> regexp_replace(telefone, '\D', '', 'g');

-- Remove possíveis duplicatas já existentes, mantendo o mais antigo
DELETE FROM public.liderancas l
WHERE id NOT IN (
  SELECT DISTINCT ON (company_id, regexp_replace(coalesce(telefone,''), '\D', '', 'g'))
    id
  FROM public.liderancas
  WHERE telefone IS NOT NULL AND telefone <> ''
  ORDER BY company_id,
           regexp_replace(telefone, '\D', '', 'g'),
           created_at ASC
)
AND telefone IS NOT NULL AND telefone <> '';

-- Índice UNIQUE parcial: só aplica quando telefone não é nulo/vazio
CREATE UNIQUE INDEX IF NOT EXISTS uq_liderancas_company_telefone
  ON public.liderancas (company_id, regexp_replace(telefone, '\D', '', 'g'))
  WHERE telefone IS NOT NULL AND telefone <> '';
