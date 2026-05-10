-- Limpeza: remover tabelas de auditoria e aprovações
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.aprovacoes CASCADE;