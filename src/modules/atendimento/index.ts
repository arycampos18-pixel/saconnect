export { atendimentoService } from "./services/atendimentoService";
export { departamentoService } from "./services/departamentoService";
export { templateService } from "./services/templateService";
export type {
  Conversa, Mensagem, Departamento,
  ConversaStatus, MensagemDirecao, MensagemTipo,
} from "./services/atendimentoService";
export type { Template } from "./services/templateService";
export { default as Atendimento } from "./pages/Atendimento";
export { default as AtendimentoDashboard } from "./pages/AtendimentoDashboard";
export { default as Departamentos } from "./pages/Departamentos";
export { default as Templates } from "./pages/Templates";
export { default as WebhookLogs } from "./pages/WebhookLogs";
export { default as Roteamento } from "./pages/Roteamento";
export { default as ConfiguracoesWhatsApp } from "./pages/Configuracoes";
export { default as RelatoriosAtendimento } from "./pages/Relatorios";
export { default as KanbanAtendimento } from "./pages/Kanban";
export { default as ConfiguracoesAvancadasAtendimento } from "./pages/ConfiguracoesAvancadas";
export { default as HistoricoAtendimento } from "./pages/Historico";