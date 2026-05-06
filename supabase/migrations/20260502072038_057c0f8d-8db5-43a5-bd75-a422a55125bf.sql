CREATE OR REPLACE FUNCTION public.pesquisa_ja_respondeu(_pesquisa_id uuid, _telefone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pesquisa_respostas
    WHERE pesquisa_id = _pesquisa_id
      AND participante_telefone IS NOT NULL
      AND regexp_replace(participante_telefone, '\D', '', 'g') = regexp_replace(_telefone, '\D', '', 'g')
      AND regexp_replace(_telefone, '\D', '', 'g') <> ''
  );
$$;

GRANT EXECUTE ON FUNCTION public.pesquisa_ja_respondeu(uuid, text) TO anon, authenticated;