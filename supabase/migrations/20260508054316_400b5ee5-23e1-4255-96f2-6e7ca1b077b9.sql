-- View: resumo por município/ano/turno a partir de resultados_eleitorais_tse
CREATE OR REPLACE VIEW public.eleicoes_resumo_municipios AS
WITH base AS (
  SELECT
    company_id, ano_eleicao AS ano, turno, uf, municipio, codigo_municipio,
    candidato, partido, cargo,
    SUM(votos)::bigint AS votos_candidato
  FROM public.resultados_eleitorais_tse
  WHERE municipio IS NOT NULL
  GROUP BY company_id, ano_eleicao, turno, uf, municipio, codigo_municipio, candidato, partido, cargo
),
ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY company_id, ano, turno, municipio, cargo ORDER BY votos_candidato DESC) AS rn,
    SUM(votos_candidato) OVER (PARTITION BY company_id, ano, turno, municipio, cargo) AS total_votos_cargo
  FROM base
)
SELECT
  company_id, ano, turno, uf, municipio, codigo_municipio, cargo,
  total_votos_cargo AS total_votos,
  candidato AS candidato_vencedor,
  partido AS partido_vencedor,
  votos_candidato AS votos_vencedor,
  ROUND((votos_candidato::numeric / NULLIF(total_votos_cargo,0)) * 100, 2) AS percentual_vencedor
FROM ranked
WHERE rn = 1;

COMMENT ON VIEW public.eleicoes_resumo_municipios IS
  'Resumo por município/ano/turno/cargo: vencedor, votos do vencedor e total. Derivada de resultados_eleitorais_tse.';