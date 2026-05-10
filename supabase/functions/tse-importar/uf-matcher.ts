// Pure helpers used by index.ts — extraídos para permitir testes unitários.

export type UfMatchResult =
  | { matched: true; file: string; bytes: Uint8Array }
  | { matched: false; ufsDisponiveis: string[]; arquivos: string[] };

/**
 * Procura, dentro de um conjunto de arquivos extraídos de um ZIP do TSE,
 * o CSV correspondente à UF solicitada. Quando não encontra, devolve a
 * lista de UFs disponíveis para mensagens de erro claras.
 */
export function selecionarCsvDaUf(
  files: Record<string, Uint8Array>,
  uf: string,
): UfMatchResult {
  const arquivos = Object.keys(files);
  const ufRe = new RegExp(`_${uf}\\.csv$`, "i");

  // 1) preferência por CSV de munzona da UF
  for (const [name, data] of Object.entries(files)) {
    if (ufRe.test(name) && /munzona/i.test(name)) {
      return { matched: true, file: name, bytes: data };
    }
  }
  // 2) qualquer CSV da UF
  for (const [name, data] of Object.entries(files)) {
    if (ufRe.test(name) && /\.csv$/i.test(name)) {
      return { matched: true, file: name, bytes: data };
    }
  }

  const ufsDisponiveis = Array.from(
    new Set(
      arquivos
        .map((n) => n.match(/_([A-Z]{2})\.csv$/i)?.[1]?.toUpperCase())
        .filter(Boolean) as string[],
    ),
  ).sort();

  return { matched: false, ufsDisponiveis, arquivos };
}

export function montarMensagemUfAusente(
  ano: number,
  uf: string,
  ufsDisponiveis: string[],
  arquivos: string[],
): string {
  const detalhe = ufsDisponiveis.length
    ? `UFs disponíveis no arquivo: ${ufsDisponiveis.join(", ")}`
    : `Arquivos no ZIP: ${arquivos.slice(0, 10).join(", ") || "(nenhum)"}`;
  return `O ZIP do TSE para ${ano} não contém o CSV da UF "${uf}". ${detalhe}`;
}