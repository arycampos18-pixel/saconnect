/**
 * Brazilian phone formatting utilities.
 * Accepts any input, normalizes to digits, and formats as:
 *   (XX) XXXXX-XXXX  for 11 digits (mobile)
 *   (XX) XXXX-XXXX   for 10 digits (landline)
 * Falls back gracefully for partial input while typing.
 */
export function onlyDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

export function formatPhoneBR(value: string | null | undefined): string {
  let d = onlyDigits(value ?? "");
  // Remove DDI 55 do Brasil quando vier no formato 55DDDNNNN...
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidPhoneBR(value: string | null | undefined): boolean {
  const d = onlyDigits(value ?? "");
  return d.length === 10 || d.length === 11;
}