// Comparação tolerante de strings/datas para detectar divergências cadastrais.
// IMPORTANTE: telefone NUNCA entra nesta análise (regra do módulo).

function normalize(s?: string | null): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function digits(s?: string | null): string {
  return (s ?? "").replace(/\D/g, "");
}

function nomeMatch(a?: string | null, b?: string | null): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Considera compatível se compartilham primeiro + último nome
  const pa = na.split(" ");
  const pb = nb.split(" ");
  if (pa.length < 2 || pb.length < 2) return na.includes(nb) || nb.includes(na);
  return pa[0] === pb[0] && pa[pa.length - 1] === pb[pb.length - 1];
}

function dataMatch(a?: string | null, b?: string | null): boolean {
  const da = (a ?? "").slice(0, 10);
  const db = (b ?? "").slice(0, 10);
  if (!da || !db) return false;
  return da === db;
}

export type CamposComparaveis = {
  cpf?: string | null;
  nome?: string | null;
  data_nascimento?: string | null;
  nome_mae?: string | null;
};

export type ResultadoDivergencia = {
  score: number; // 0..100
  campos: Record<string, "compatível" | "divergente" | "ausente">;
  divergencias_fortes: string[]; // subset dos critérios fortes
  status_sugerido: "validado" | "pendente revisão" | "incompleto";
  motivo: string | null;
};

const PESOS = { cpf: 30, nome: 20, data_nascimento: 20, nome_mae: 30 } as const;

/**
 * Compara cadastro do eleitor (`base`) com retorno da API (`api`).
 * Telefone é deliberadamente ignorado — nunca gera divergência nem altera score.
 */
export function analisarDivergencia(
  base: CamposComparaveis,
  api: CamposComparaveis,
): ResultadoDivergencia {
  const campos: ResultadoDivergencia["campos"] = {};
  const fortes: string[] = [];
  let score = 0;

  const compara = (
    chave: keyof typeof PESOS,
    igual: boolean,
    temAmbos: boolean,
  ) => {
    if (!temAmbos) {
      campos[chave] = "ausente";
      return;
    }
    if (igual) {
      campos[chave] = "compatível";
      score += PESOS[chave];
    } else {
      campos[chave] = "divergente";
      fortes.push(chave);
    }
  };

  // CPF
  const cpfBase = digits(base.cpf);
  const cpfApi = digits(api.cpf);
  compara("cpf", !!cpfBase && cpfBase === cpfApi, !!cpfBase && !!cpfApi);

  // Nome
  compara(
    "nome",
    nomeMatch(base.nome, api.nome),
    !!normalize(base.nome) && !!normalize(api.nome),
  );

  // Data de nascimento
  compara(
    "data_nascimento",
    dataMatch(base.data_nascimento, api.data_nascimento),
    !!base.data_nascimento && !!api.data_nascimento,
  );

  // Nome da mãe
  compara(
    "nome_mae",
    nomeMatch(base.nome_mae, api.nome_mae),
    !!normalize(base.nome_mae) && !!normalize(api.nome_mae),
  );

  let status_sugerido: ResultadoDivergencia["status_sugerido"];
  let motivo: string | null = null;

  if (fortes.length > 0) {
    status_sugerido = "pendente revisão";
    motivo = `Divergência em: ${fortes.join(", ")}`;
  } else if (score >= 50) {
    status_sugerido = "validado";
  } else {
    status_sugerido = "incompleto";
    motivo = "Dados insuficientes para validar";
  }

  return { score, campos, divergencias_fortes: fortes, status_sugerido, motivo };
}