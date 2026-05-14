/** Mesma regra que `src/lib/telefoneBrasil.ts` — manter em sincronia. */
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
