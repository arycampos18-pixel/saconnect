export function onlyDigitsCEP(v: string): string {
  return (v ?? "").replace(/\D/g, "").slice(0, 8);
}

export function formatCEP(v: string): string {
  const d = onlyDigitsCEP(v);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export type ViaCepResult = {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

export async function buscarCep(cep: string): Promise<ViaCepResult | null> {
  const d = onlyDigitsCEP(cep);
  if (d.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResult;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}