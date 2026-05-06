export type Eleitor = {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cidade: string;
  bairro: string;
  origem: string;
  liderancaResponsavel: string;
  tags: string[];
  consentimentoLGPD: boolean;
  cadastradoEm: string;
};

export type Mensagem = {
  id: string;
  data: string;
  canal: "WhatsApp" | "SMS";
  publicoAlvo: string;
  totalDestinatarios: number;
  conteudo: string;
  status: "Enviada" | "Pendente" | "Falhou";
};

const nomes = [
  "Maria Silva Santos", "João Pedro Oliveira", "Ana Carolina Souza", "Carlos Eduardo Lima",
  "Fernanda Costa Almeida", "Ricardo Pereira Gomes", "Juliana Ferreira Rocha", "Paulo Henrique Martins",
  "Beatriz Carvalho Dias", "Marcos Antônio Ribeiro", "Patrícia Mendes Cardoso", "Rafael Augusto Nunes",
  "Camila Barbosa Teixeira", "Roberto Carlos Moreira", "Larissa Vieira Castro", "Gustavo Henrique Lopes",
  "Aline Cristina Araújo", "Thiago Rodrigues Pinto", "Renata Cavalcanti Melo", "Felipe Augusto Correia",
  "Mariana Andrade Freitas", "Bruno Henrique Silveira", "Letícia Pires Borges", "Daniel Moura Campos",
  "Vanessa Tavares Nogueira", "André Luiz Batista", "Sabrina Duarte Machado", "Eduardo Ramos Faria",
];

const bairros = [
  "Centro", "Vila Mariana", "Jardim das Flores", "Boa Vista", "Santa Mônica",
  "Nova Esperança", "Vila Nova", "Parque Industrial", "Jardim América", "Cidade Alta",
  "Bela Vista", "São José", "Vila Operária", "Morumbi", "Tatuapé",
];

const cidades = ["São Paulo", "Campinas", "Santos", "São Bernardo", "Guarulhos"];
const liderancas = ["Vereador José Almeida", "Equipe Central", "Líder Comunitário Carlos", "Maria Coordenadora", "Pedro Regional"];
const origens = ["Formulário Público", "Cadastro Manual", "Evento Presencial", "Indicação", "Importação CSV"];
const tagsPool = ["Saúde", "Educação", "Apoiador", "Segurança", "Habitação", "Empreendedor", "Idoso", "Jovem", "Mulher", "Trabalhador"];

function gerarTelefone(): string {
  const ddd = 11 + Math.floor(Math.random() * 20);
  const p1 = 90000 + Math.floor(Math.random() * 9999);
  const p2 = 1000 + Math.floor(Math.random() * 8999);
  return `(${ddd}) 9${p1.toString().slice(0, 4)}-${p2}`;
}

function gerarCPF(): string {
  const n = () => Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${n()}.${n()}.${n()}-${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function diasAtras(d: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString();
}

export const mockEleitores: Eleitor[] = nomes.map((nome, i) => ({
  id: `el-${i + 1}`,
  nome,
  telefone: gerarTelefone(),
  cpf: gerarCPF(),
  cidade: cidades[i % cidades.length],
  bairro: bairros[i % bairros.length],
  origem: origens[i % origens.length],
  liderancaResponsavel: liderancas[i % liderancas.length],
  tags: pickN(tagsPool, 1 + Math.floor(Math.random() * 3)),
  consentimentoLGPD: Math.random() > 0.1,
  cadastradoEm: diasAtras(Math.floor(Math.random() * 7)),
}));

export const mockMensagens: Mensagem[] = [
  { id: "m1", data: diasAtras(0), canal: "WhatsApp", publicoAlvo: "Bairro: Centro", totalDestinatarios: 124, conteudo: "Convite para reunião comunitária na próxima quarta-feira às 19h.", status: "Enviada" },
  { id: "m2", data: diasAtras(1), canal: "SMS", publicoAlvo: "Tag: Saúde", totalDestinatarios: 87, conteudo: "Mutirão de saúde gratuito neste sábado no posto central.", status: "Enviada" },
  { id: "m3", data: diasAtras(2), canal: "WhatsApp", publicoAlvo: "Todos", totalDestinatarios: 1284, conteudo: "Boas festas e um próspero ano novo a todos!", status: "Enviada" },
  { id: "m4", data: diasAtras(3), canal: "SMS", publicoAlvo: "Bairro: Vila Mariana", totalDestinatarios: 56, conteudo: "Audiência pública sobre transporte na próxima segunda.", status: "Enviada" },
  { id: "m5", data: diasAtras(5), canal: "WhatsApp", publicoAlvo: "Tag: Educação", totalDestinatarios: 213, conteudo: "Inscrições abertas para o reforço escolar gratuito.", status: "Enviada" },
];

export const cadastrosUltimos7Dias = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    dia: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
    cadastros: 8 + Math.floor(Math.random() * 35),
  };
});

export const todosBairros = bairros;
export const todasTags = tagsPool;

// ============= Hierarquia / Ranking =============

export type CaboEleitoral = {
  id: string;
  nome: string;
  cadastros: number;
  meta: number;
  cadastros7d: number[];
};

export type Lideranca = {
  id: string;
  nome: string;
  meta: number;
  cabos: CaboEleitoral[];
};

export const hierarquia: Lideranca[] = [
  {
    id: "lid-1",
    nome: "Liderança Ana Paula",
    meta: 200,
    cabos: [
      { id: "cab-1-1", nome: "Cabo João Silva", cadastros: 45, meta: 60, cadastros7d: [4, 6, 8, 5, 7, 9, 6] },
      { id: "cab-1-2", nome: "Cabo Marta Lima", cadastros: 38, meta: 50, cadastros7d: [3, 5, 6, 4, 7, 8, 5] },
      { id: "cab-1-3", nome: "Cabo Roberto Dias", cadastros: 67, meta: 80, cadastros7d: [6, 8, 10, 9, 11, 12, 11] },
    ],
  },
  {
    id: "lid-2",
    nome: "Liderança Carlos Mendes",
    meta: 150,
    cabos: [
      { id: "cab-2-1", nome: "Cabo Patrícia Souza", cadastros: 55, meta: 70, cadastros7d: [5, 7, 9, 6, 8, 10, 10] },
      { id: "cab-2-2", nome: "Cabo Felipe Costa", cadastros: 65, meta: 80, cadastros7d: [7, 8, 10, 8, 11, 12, 9] },
    ],
  },
  {
    id: "lid-3",
    nome: "Liderança Beatriz Rocha",
    meta: 120,
    cabos: [
      { id: "cab-3-1", nome: "Cabo Marcos Vieira", cadastros: 38, meta: 50, cadastros7d: [3, 5, 6, 4, 6, 8, 6] },
      { id: "cab-3-2", nome: "Cabo Sandra Pereira", cadastros: 57, meta: 70, cadastros7d: [5, 7, 9, 7, 10, 11, 8] },
    ],
  },
  {
    id: "lid-4",
    nome: "Liderança Eduardo Lima",
    meta: 100,
    cabos: [
      { id: "cab-4-1", nome: "Cabo Júlia Nogueira", cadastros: 32, meta: 50, cadastros7d: [3, 4, 5, 4, 6, 7, 5] },
      { id: "cab-4-2", nome: "Cabo Henrique Alves", cadastros: 41, meta: 60, cadastros7d: [4, 5, 7, 5, 6, 8, 6] },
    ],
  },
];

export type PerfilUsuario = "politico" | "coordenador" | "lideranca" | "cabo";

export const perfilLabels: Record<PerfilUsuario, string> = {
  politico: "Político",
  coordenador: "Coordenador Geral",
  lideranca: "Liderança",
  cabo: "Cabo Eleitoral",
};

export function totalCadastrosLideranca(l: Lideranca): number {
  return l.cabos.reduce((s, c) => s + c.cadastros, 0);
}

export function rankingLiderancas(): (Lideranca & { total: number; posicao: number })[] {
  const enriched = hierarquia.map((l) => ({ ...l, total: totalCadastrosLideranca(l) }));
  enriched.sort((a, b) => b.total - a.total);
  return enriched.map((l, i) => ({ ...l, posicao: i + 1 }));
}