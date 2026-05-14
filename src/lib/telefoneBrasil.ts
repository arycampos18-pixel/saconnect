/**
 * Normaliza telefone brasileiro para dígitos com prefixo 55 (canónico para deduplicação).
 * Alinha com a lógica do webhook Z-API (nono dígito em celulares com 10 dígitos nacionais).
 */
export function normalizarTelefoneDigitsBR(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return digits;

  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);

  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    const firstDigit = parseInt(rest[0] ?? "0", 10);
    if (firstDigit >= 6) {
      digits = ddd + "9" + rest;
    }
  }

  return "55" + digits;
}

/** E.164 para exibição / envio ao Z-API quando precisar de + */
export function telefoneE164Br(digits55: string): string {
  const d = digits55.replace(/\D/g, "");
  return d ? `+${d}` : "";
}
