/**
 * How members pay the membership fee, exactly as the association gave it (2026-11). The one source
 * for the portal and the reminder email. Every value is text: the CVU keeps its leading zeros.
 * Amounts, due dates and whether someone is up to date are not in the system and are never shown.
 */
export const FEE_PAYMENT = {
  holder: "Asociación Civil Amarí Dul",
  platform: "Mercado Pago",
  alias: "Amaridul.mp",
  /** A CVU (virtual account), not a CBU. */
  cvu: "0000003100037002772495",
  cuit: "30-71843355-6",
  /** A payment link only when the association provides one; it is never built from the alias. */
  link: null as string | null,
} as const;

export const FEE_PAGE = "/qr/cuota";

/** The CUIT's check digit (modulo 11), so a typo in the data above is caught by the tests. */
export function validCuit(cuit: string): boolean {
  const d = cuit.replace(/-/g, "");
  if (!/^\d{11}$/.test(d)) return false;
  const sum = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((s, w, i) => s + w * Number(d[i]), 0);
  const check = 11 - (sum % 11);
  return (check === 11 ? 0 : check === 10 ? 9 : check) === Number(d[10]);
}

/** The two check digits of a CBU or CVU (22 digits). */
export function validCbuOrCvu(value: string): boolean {
  if (!/^\d{22}$/.test(value)) return false;
  const digit = (part: string, weights: number[]) => (10 - (weights.reduce((s, w, i) => s + w * Number(part[i]), 0) % 10)) % 10;
  return digit(value.slice(0, 7), [7, 1, 3, 9, 7, 1, 3]) === Number(value[7]) && digit(value.slice(8, 21), [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === Number(value[21]);
}
