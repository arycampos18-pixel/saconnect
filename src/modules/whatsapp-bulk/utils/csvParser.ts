// CSV parser leve para importar destinatários de campanhas em massa.
// Aceita vírgula, ponto-e-vírgula ou tab como separador.
// Reconhece header opcional com colunas: telefone, nome, var1..varN

export interface DestinatarioCsv {
  telefone: string;
  nome?: string;
  variaveis?: Record<string, string>;
  _valido: boolean;
  _motivo?: string;
  _linha: number;
}

export interface CsvParseResult {
  total: number;
  validos: number;
  invalidos: number;
  duplicados: number;
  itens: DestinatarioCsv[];
  colunas: string[];
}

const SEP_RE = /[,;\t]/;

function detectarSeparador(linha: string): RegExp {
  const counts = { ",": 0, ";": 0, "\t": 0 } as Record<string, number>;
  for (const c of linha) if (c in counts) counts[c]++;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] === 0) return SEP_RE;
  return new RegExp(top[0] === "\t" ? "\t" : `[${top[0]}]`);
}

function limparTelefone(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

// Aceita 10 a 13 dígitos (Brasil: 10/11 sem DDI; 12/13 com DDI 55)
function telefoneValido(d: string): boolean {
  return d.length >= 10 && d.length <= 13;
}

function normalizarHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_");
}

const ALIASES_TEL = ["telefone", "celular", "fone", "phone", "whatsapp", "numero", "tel"];
const ALIASES_NOME = ["nome", "name", "contato", "cliente"];

export function parseCsv(texto: string): CsvParseResult {
  const linhasRaw = texto.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  if (linhasRaw.length === 0) {
    return { total: 0, validos: 0, invalidos: 0, duplicados: 0, itens: [], colunas: [] };
  }

  const sep = detectarSeparador(linhasRaw[0]);
  const primeira = linhasRaw[0].split(sep).map((c) => c.trim());
  // Detecta header: primeira coluna tem alias conhecido OU primeira coluna não parece telefone
  const primCol = primeira[0] ?? "";
  const primColTel = limparTelefone(primCol);
  const temHeader =
    primeira.some((c) => ALIASES_TEL.includes(normalizarHeader(c))) ||
    (primColTel.length < 8 && /[a-zA-Z]/.test(primCol));

  let header: string[];
  let body: string[];
  if (temHeader) {
    header = primeira.map(normalizarHeader);
    body = linhasRaw.slice(1);
  } else {
    // sem header: assume telefone, nome, var1..
    header = primeira.map((_, i) => (i === 0 ? "telefone" : i === 1 ? "nome" : `var${i - 1}`));
    body = linhasRaw;
  }

  const idxTel = header.findIndex((h) => ALIASES_TEL.includes(h));
  const idxNome = header.findIndex((h) => ALIASES_NOME.includes(h));
  const idxVars = header
    .map((h, i) => ({ h, i }))
    .filter((x) => x.i !== idxTel && x.i !== idxNome);

  const vistos = new Set<string>();
  const itens: DestinatarioCsv[] = [];
  let duplicados = 0;

  body.forEach((linha, idx) => {
    const cols = linha.split(sep).map((c) => c.trim());
    const telRaw = idxTel >= 0 ? cols[idxTel] : cols[0];
    const tel = limparTelefone(telRaw ?? "");
    const nome = idxNome >= 0 ? cols[idxNome] : cols[1];
    const variaveis: Record<string, string> = {};
    idxVars.forEach(({ h, i }) => {
      if (cols[i]) variaveis[h] = cols[i];
    });

    let valido = true;
    let motivo: string | undefined;
    if (!tel) {
      valido = false;
      motivo = "Telefone vazio";
    } else if (!telefoneValido(tel)) {
      valido = false;
      motivo = `Telefone inválido (${tel.length} dígitos)`;
    } else if (vistos.has(tel)) {
      valido = false;
      motivo = "Duplicado";
      duplicados++;
    } else {
      vistos.add(tel);
    }

    itens.push({
      telefone: tel,
      nome: nome || undefined,
      variaveis: Object.keys(variaveis).length ? variaveis : undefined,
      _valido: valido,
      _motivo: motivo,
      _linha: temHeader ? idx + 2 : idx + 1,
    });
  });

  const validos = itens.filter((i) => i._valido).length;
  return {
    total: itens.length,
    validos,
    invalidos: itens.length - validos,
    duplicados,
    itens,
    colunas: header,
  };
}

// Parse a 2D matrix of strings (vindo de XLSX) reusando a mesma lógica do CSV.
export function parseMatrix(rows: string[][]): CsvParseResult {
  const linhas = rows
    .map((r) => r.map((c) => (c == null ? "" : String(c)).trim()).join("\t"))
    .filter((l) => l.replace(/\t/g, "").length > 0);
  return parseCsv(linhas.join("\n"));
}