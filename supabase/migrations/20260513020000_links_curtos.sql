-- ============================================================
-- Sistema de Links Curtos / Redirecionamento
-- /l/:codigo  → qualquer URL
-- /w/:codigo  → WhatsApp direto
-- /form/:cod  → formulário público
-- ============================================================

CREATE TABLE IF NOT EXISTS public.links_curtos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      TEXT NOT NULL UNIQUE,
  tipo        TEXT NOT NULL DEFAULT 'url'
                CHECK (tipo IN ('url','whatsapp','formulario','download')),
  titulo      TEXT,
  destino     TEXT,         -- URL completa de destino (para tipo=url/download)
  telefone    TEXT,         -- somente para tipo=whatsapp (ex: 5567999998080)
  mensagem    TEXT,         -- mensagem pré-preenchida no WhatsApp
  token_ref   TEXT,         -- referência a token de formulário (tipo=formulario)
  cliques     INTEGER NOT NULL DEFAULT 0,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  company_id  UUID REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_links_curtos_codigo ON public.links_curtos (codigo);
CREATE INDEX IF NOT EXISTS idx_links_curtos_company ON public.links_curtos (company_id);

ALTER TABLE public.links_curtos ENABLE ROW LEVEL SECURITY;

-- Utilizadores veem links da sua empresa
CREATE POLICY "links_curtos_select"
  ON public.links_curtos FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

-- Utilizadores da empresa criam/editam
CREATE POLICY "links_curtos_write"
  ON public.links_curtos FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

-- Trigger updated_at
CREATE TRIGGER trg_links_curtos_upd
  BEFORE UPDATE ON public.links_curtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RPC pública (anon pode resolver um link) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.public_resolver_link(_codigo text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.links_curtos;
  v_url  text;
BEGIN
  SELECT * INTO v_link
  FROM public.links_curtos
  WHERE codigo = lower(trim(_codigo)) AND ativo = true
  LIMIT 1;

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('encontrado', false);
  END IF;

  -- Montar URL de destino
  CASE v_link.tipo
    WHEN 'whatsapp' THEN
      v_url := 'https://wa.me/' || v_link.telefone
               || CASE WHEN v_link.mensagem IS NOT NULL AND v_link.mensagem <> ''
                        THEN '?text=' || encode(v_link.mensagem::bytea, 'escape')
                        ELSE '' END;
    WHEN 'formulario' THEN
      v_url := '/cadastro-publico?token=' || coalesce(v_link.token_ref, '');
    ELSE
      v_url := v_link.destino;
  END CASE;

  -- Incrementar contador de cliques (async - não bloqueia)
  UPDATE public.links_curtos SET cliques = cliques + 1 WHERE id = v_link.id;

  RETURN jsonb_build_object(
    'encontrado', true,
    'tipo',  v_link.tipo,
    'url',   v_url,
    'titulo', v_link.titulo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_resolver_link(text) TO anon, authenticated;
