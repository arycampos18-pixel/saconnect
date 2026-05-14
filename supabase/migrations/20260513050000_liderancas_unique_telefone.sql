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

-- Remove possíveis duplicatas já existentes, mantendo o mais antigo (ROW_NUMBER evita requisitos estritos do DISTINCT ON)
DELETE FROM public.liderancas l
WHERE l.id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY company_id,
                          regexp_replace(coalesce(telefone, ''), '\D', '', 'g')
             ORDER BY created_at ASC NULLS LAST, id ASC
           ) AS rn
    FROM public.liderancas
    WHERE telefone IS NOT NULL
      AND trim(telefone) <> ''
  ) d
  WHERE d.rn > 1
);

-- Índice UNIQUE parcial: só aplica quando telefone não é nulo/vazio
CREATE UNIQUE INDEX IF NOT EXISTS uq_liderancas_company_telefone
  ON public.liderancas (company_id, regexp_replace(telefone, '\D', '', 'g'))
  WHERE telefone IS NOT NULL AND telefone <> '';
