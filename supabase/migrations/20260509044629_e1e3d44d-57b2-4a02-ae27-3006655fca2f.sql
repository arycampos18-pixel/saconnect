WITH dups AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY ano_eleicao, turno, uf,
        COALESCE(codigo_municipio,''), COALESCE(codigo_cargo,''),
        COALESCE(numero_candidato,''), COALESCE(zona_eleitoral,''),
        COALESCE(secao_eleitoral,'')
      ORDER BY id ASC
    ) AS rn
  FROM public.resultados_eleitorais_tse
)
DELETE FROM public.resultados_eleitorais_tse r
USING dups
WHERE r.id = dups.id AND dups.rn > 1;

ALTER TABLE public.resultados_eleitorais_tse
  DROP CONSTRAINT IF EXISTS res_tse_unique;

ALTER TABLE public.resultados_eleitorais_tse
  ADD CONSTRAINT res_tse_unique
  UNIQUE NULLS NOT DISTINCT
  (ano_eleicao, turno, uf, codigo_municipio, codigo_cargo, numero_candidato, zona_eleitoral, secao_eleitoral);