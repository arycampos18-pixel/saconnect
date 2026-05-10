// Shim no-op: módulo de Auditoria foi removido (Limpeza).
// Mantemos uma API mínima para preservar call sites existentes sem efeitos colaterais
// nem leituras ao banco (a tabela audit_logs foi descartada).
export type AuditAcao = "Criar" | "Editar" | "Excluir" | "Ver" | string;

export type AuditLog = {
  id: string;
  acao: AuditAcao;
  entidade?: string | null;
  entidade_id?: string | null;
  descricao?: string | null;
  user_id?: string | null;
  user_nome?: string | null;
  user_email?: string | null;
  user_agent?: string | null;
  created_at: string;
  dados_anteriores?: Record<string, unknown> | null;
  dados_novos?: Record<string, unknown> | null;
};

export const auditoriaService = {
  registrar: (_payload?: Record<string, unknown>): Promise<void> => Promise.resolve(),
  listar: (_opts?: Record<string, unknown>): Promise<AuditLog[]> => Promise.resolve([]),
};