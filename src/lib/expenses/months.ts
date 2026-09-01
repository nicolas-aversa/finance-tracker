/**
 * Month label helpers for the "yyyy-mm" billing-month keys.
 * Kept out of any "use client" module so both server and client components can
 * call them.
 */

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH_LETTER = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function monthIndex(month: string): number {
  return Number(month.split("-")[1]) - 1;
}

/** "2026-07" -> "julio 2026" */
export function monthDisplay(month: string): string {
  const [y] = month.split("-");
  return `${MONTH_NAMES[monthIndex(month)]} ${y}`;
}

/** "2026-07" -> "Jul" */
export function monthShort(month: string): string {
  const label = MONTH_SHORT[monthIndex(month)] ?? month;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "2026-07" -> "J" — for dense axes where only a hint of the month fits. */
export function monthLetter(month: string): string {
  return MONTH_LETTER[monthIndex(month)] ?? "?";
}
