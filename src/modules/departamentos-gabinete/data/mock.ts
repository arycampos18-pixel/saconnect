export type DepStatus = "Ativo" | "Inativo";
export type FuncaoMembro = "Membro" | "Coordenador" | "Voluntário";
export type StatusMembro = "Ativo" | "Inativo";
export type TipoInteracao = "Contato" | "Atendimento" | "Evento" | "Doação";

export interface DepartamentoGab {
  id: string;
  nome: string;
  descricao: string;
  responsavel: string;
  objetivo?: string;
  area?: string;
  telefone?: string;
  email?: string;
  status: DepStatus;
  criadoEm: string; // ISO
}

export interface MembroDep {
  id: string;
  departamentoId: string;
  nome: string;
  telefone: string;
  email?: string;
  cpf?: string;
  bairro?: string;
  funcao: FuncaoMembro;
  entradaEm: string;
  status: StatusMembro;
}

export interface InteracaoDep {
  id: string;
  departamentoId: string;
  dataHora: string;
  tipo: TipoInteracao;
  descricao: string;
  responsavel: string;
  status: "Concluído" | "Pendente" | "Em andamento";
}

export const RESPONSAVEIS = [
  "Ana Paula", "Carlos Mendes", "Beatriz Rocha", "Eduardo Lima", "Marina Costa",
  "Roberto Silva", "Fernanda Oliveira", "Lucas Ferreira", "Gustavo Alves", "Juliana Santos",
];

export const DEPARTAMENTOS_MOCK: DepartamentoGab[] = [
  { id: "d1",  nome: "Ação Social",      descricao: "Doação de Cesta Básica",    responsavel: "Ana Paula",         status: "Ativo", criadoEm: "2026-01-15" },
  { id: "d2",  nome: "Saúde",            descricao: "Campanhas de Saúde",        responsavel: "Carlos Mendes",     status: "Ativo", criadoEm: "2026-01-20" },
  { id: "d3",  nome: "Educação",         descricao: "Bolsas de Estudo",          responsavel: "Beatriz Rocha",     status: "Ativo", criadoEm: "2026-01-25" },
  { id: "d4",  nome: "Jurídico",         descricao: "Orientação Jurídica",       responsavel: "Eduardo Lima",      status: "Ativo", criadoEm: "2026-02-01" },
  { id: "d5",  nome: "Assistência Social",descricao: "Auxílio Emergencial",      responsavel: "Marina Costa",      status: "Ativo", criadoEm: "2026-02-05" },
  { id: "d6",  nome: "Esportes",         descricao: "Projetos Esportivos",       responsavel: "Roberto Silva",     status: "Ativo", criadoEm: "2026-02-10" },
  { id: "d7",  nome: "Cultura",          descricao: "Eventos Culturais",         responsavel: "Fernanda Oliveira", status: "Ativo", criadoEm: "2026-02-12" },
  { id: "d8",  nome: "Meio Ambiente",    descricao: "Sustentabilidade",          responsavel: "Lucas Ferreira",    status: "Ativo", criadoEm: "2026-02-15" },
  { id: "d9",  nome: "Segurança",        descricao: "Segurança Pública",         responsavel: "Gustavo Alves",     status: "Ativo", criadoEm: "2026-02-18" },
  { id: "d10", nome: "Saúde Mental",     descricao: "Apoio Psicológico",         responsavel: "Juliana Santos",    status: "Ativo", criadoEm: "2026-02-20" },
];

export const TOTAIS_MOCK: Record<string, number> = {
  d1: 45, d2: 32, d3: 28, d4: 15, d5: 38, d6: 22, d7: 18, d8: 25, d9: 19, d10: 12,
};

export const MEMBROS_MOCK: MembroDep[] = [
  { id: "m1", departamentoId: "d1", nome: "João Silva",       telefone: "(62) 98765-4321", email: "joao@email.com",   funcao: "Membro",      entradaEm: "2026-01-15", status: "Ativo" },
  { id: "m2", departamentoId: "d1", nome: "Maria Santos",     telefone: "(62) 99876-5432", email: "maria@email.com",  funcao: "Coordenador", entradaEm: "2026-01-20", status: "Ativo" },
  { id: "m3", departamentoId: "d1", nome: "Pedro Oliveira",   telefone: "(62) 97654-3210", email: "pedro@email.com",  funcao: "Voluntário",  entradaEm: "2026-01-25", status: "Ativo" },
  { id: "m4", departamentoId: "d1", nome: "Ana Costa",        telefone: "(62) 96543-2109", email: "ana@email.com",    funcao: "Membro",      entradaEm: "2026-02-01", status: "Ativo" },
  { id: "m5", departamentoId: "d1", nome: "Carlos Ferreira",  telefone: "(62) 95432-1098", email: "carlos@email.com", funcao: "Membro",      entradaEm: "2026-02-05", status: "Inativo" },
];

export const INTERACOES_MOCK: InteracaoDep[] = [
  { id: "i1", departamentoId: "d1", dataHora: "2026-05-01T14:30", tipo: "Contato",     descricao: "João Silva recebeu cesta básica",      responsavel: "Ana Paula", status: "Concluído" },
  { id: "i2", departamentoId: "d1", dataHora: "2026-04-30T10:15", tipo: "Atendimento", descricao: "Maria Santos orientada sobre programa", responsavel: "Ana Paula", status: "Concluído" },
  { id: "i3", departamentoId: "d1", dataHora: "2026-04-28T16:45", tipo: "Evento",      descricao: "Distribuição de cestas no bairro Centro", responsavel: "Ana Paula", status: "Concluído" },
  { id: "i4", departamentoId: "d1", dataHora: "2026-04-25T09:00", tipo: "Doação",      descricao: "Pedro Oliveira doou 10 cestas",        responsavel: "Ana Paula", status: "Concluído" },
  { id: "i5", departamentoId: "d1", dataHora: "2026-04-20T13:20", tipo: "Contato",     descricao: "Seguimento com membros",               responsavel: "Ana Paula", status: "Concluído" },
];