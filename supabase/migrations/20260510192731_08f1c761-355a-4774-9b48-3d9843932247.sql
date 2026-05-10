DROP TRIGGER IF EXISTS trg_eleitores_enriquecimento_auto ON public.eleitores;
DROP FUNCTION IF EXISTS public.enfileirar_enriquecimento_eleitor() CASCADE;