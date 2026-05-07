-- 1. Geolocalização e Check-ins de Visitas
CREATE TABLE IF NOT EXISTS public.eleitor_visitas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    eleitor_id UUID NOT NULL REFERENCES public.eleitores(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    observacoes TEXT,
    data_visita TIMESTAMP WITH TIME ZONE DEFAULT now(),
    check_in_realizado BOOLEAN DEFAULT true
);

-- 2. Evolução do Perfil do Eleitor (Inteligência)
ALTER TABLE public.eleitores 
ADD COLUMN IF NOT EXISTS score_fidelidade INTEGER DEFAULT 50, -- 0 a 100
ADD COLUMN IF NOT EXISTS ultima_interacao TIMESTAMP WITH TIME ZONE;

-- 3. Logística de Materiais
CREATE TABLE IF NOT EXISTS public.materiais_estoque (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT, -- 'adesivo', 'santinho', 'bandeira', etc.
    quantidade_total INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.materiais_distribuicao (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES public.materiais_estoque(id),
    lideranca_id UUID REFERENCES public.liderancas(id),
    cabo_id UUID REFERENCES public.cabos_eleitorais(id),
    quantidade INTEGER NOT NULL,
    data_entrega TIMESTAMP WITH TIME ZONE DEFAULT now(),
    recebido_por TEXT
);

-- 4. Segurança (RLS)
ALTER TABLE public.eleitor_visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais_distribuicao ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Visitas são visíveis por admins e lideranças relacionadas" ON public.eleitor_visitas;
CREATE POLICY "Visitas são visíveis por admins e lideranças relacionadas"
ON public.eleitor_visitas
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
        AND (
            p.cargo = 'admin' OR
            EXISTS (
                SELECT 1 FROM public.liderancas l
                WHERE l.user_id = auth.uid()
                AND l.id IN (
                    SELECT lideranca_id FROM public.eleitores e WHERE e.id = eleitor_visitas.eleitor_id
                )
            )
        )
    )
);

-- Trigger para atualizar última interação no eleitor ao registrar visita
CREATE OR REPLACE FUNCTION public.update_eleitor_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.eleitores
    SET ultima_interacao = NEW.data_visita
    WHERE id = NEW.eleitor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_eleitor_last_interaction ON public.eleitor_visitas;
CREATE TRIGGER tr_update_eleitor_last_interaction
AFTER INSERT ON public.eleitor_visitas
FOR EACH ROW EXECUTE FUNCTION public.update_eleitor_last_interaction();