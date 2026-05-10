
ALTER TABLE public.eleitores
  ADD COLUMN IF NOT EXISTS titulo_eleitoral             text,
  ADD COLUMN IF NOT EXISTS zona_eleitoral               text,
  ADD COLUMN IF NOT EXISTS secao_eleitoral              text,
  ADD COLUMN IF NOT EXISTS local_votacao                text,
  ADD COLUMN IF NOT EXISTS municipio_eleitoral          text,
  ADD COLUMN IF NOT EXISTS uf_eleitoral                 text,
  ADD COLUMN IF NOT EXISTS nome_mae                     text,
  ADD COLUMN IF NOT EXISTS telefone_original            text,
  ADD COLUMN IF NOT EXISTS telefone_validado            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_validacao_eleitoral   text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS status_validacao_whatsapp    text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS status_cadastro              text NOT NULL DEFAULT 'incompleto',
  ADD COLUMN IF NOT EXISTS score_confianca              integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_divergencia           text,
  ADD COLUMN IF NOT EXISTS data_ultima_consulta         timestamptz,
  ADD COLUMN IF NOT EXISTS codigo_validacao_whatsapp    text,
  ADD COLUMN IF NOT EXISTS codigo_expira_em             timestamptz,
  ADD COLUMN IF NOT EXISTS tentativas_validacao         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_validacao_whatsapp      timestamptz,
  ADD COLUMN IF NOT EXISTS aceite_lgpd                  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_aceite_lgpd             timestamptz,
  ADD COLUMN IF NOT EXISTS validado                     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validado_em                  timestamptz,
  ADD COLUMN IF NOT EXISTS validado_por                 uuid;

CREATE INDEX IF NOT EXISTS idx_eleitores_titulo            ON public.eleitores (titulo_eleitoral);
CREATE INDEX IF NOT EXISTS idx_eleitores_status_val_elei   ON public.eleitores (status_validacao_eleitoral);
CREATE INDEX IF NOT EXISTS idx_eleitores_status_cadastro   ON public.eleitores (status_cadastro);

DROP VIEW IF EXISTS public.vw_eleitores_consolidado;
CREATE VIEW public.vw_eleitores_consolidado
WITH (security_invoker = true)
AS
SELECT
  e.*,
  COALESCE(c.consultas_total, 0)             AS consultas_total,
  COALESCE(c.consultas_custo_centavos, 0)    AS consultas_custo_centavos,
  c.ultima_consulta_em
FROM public.eleitores e
LEFT JOIN LATERAL (
  SELECT count(*)::int                                    AS consultas_total,
         COALESCE(sum(custo_total_centavos), 0)::bigint   AS consultas_custo_centavos,
         max(created_at)                                  AS ultima_consulta_em
  FROM public.api_consultas_custos a
  WHERE a.eleitor_id = e.id
) c ON true;

COMMENT ON VIEW public.vw_eleitores_consolidado IS
  'Eleitores + métricas de custo de consultas API. Fase 2 da consolidação.';
