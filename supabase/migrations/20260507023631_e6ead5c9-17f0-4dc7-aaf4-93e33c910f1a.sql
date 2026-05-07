-- 1. Departamentos/Filas de Atendimento
CREATE TABLE IF NOT EXISTS public.wa_filas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    cor TEXT DEFAULT '#7c3aed',
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Conversas (Sessões de Atendimento)
CREATE TABLE IF NOT EXISTS public.wa_conversas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    protocolo SERIAL,
    wa_id TEXT NOT NULL, -- ID do contato no WhatsApp
    wa_nome TEXT,
    wa_numero TEXT NOT NULL,
    status TEXT DEFAULT 'pendente', -- pendente, em_atendimento, fechada
    fila_id UUID REFERENCES public.wa_filas(id),
    agente_id UUID REFERENCES auth.users(id),
    eleitor_id UUID REFERENCES public.eleitores(id),
    ultima_mensagem TEXT,
    ultima_interacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Histórico de Mensagens
CREATE TABLE IF NOT EXISTS public.wa_mensagens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversa_id UUID REFERENCES public.wa_conversas(id) ON DELETE CASCADE,
    remetente_id UUID REFERENCES auth.users(id), -- NULL se for o contato
    corpo TEXT NOT NULL,
    tipo TEXT DEFAULT 'texto', -- texto, imagem, audio, nota_interna
    direcao TEXT NOT NULL, -- entrada, saida
    status TEXT DEFAULT 'enviada', -- enviada, entregue, lida
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Segurança RLS
ALTER TABLE public.wa_filas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para autenticados" ON public.wa_filas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso total para autenticados" ON public.wa_conversas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso total para autenticados" ON public.wa_mensagens FOR ALL USING (auth.role() = 'authenticated');

-- Inserir filas padrão
INSERT INTO public.wa_filas (nome, descricao, cor) VALUES 
('Gabinete', 'Atendimento geral do gabinete', '#7c3aed'),
('Jurídico', 'Demandas jurídicas e auxílio', '#ef4444'),
('Saúde', 'Solicitações de saúde e exames', '#10b981')
ON CONFLICT DO NOTHING;