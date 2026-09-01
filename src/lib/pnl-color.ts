/** Text color class for a signed P&L value: green up, red down, neutral otherwise. */
export function pnlTextClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "text-neutral-500 dark:text-neutral-400";
  return value > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
}

/** Pill/badge background+text for a signed value. */
export function pnlPillClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0)
    return "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";
  return value > 0
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400";
}

/** "+" / "−" / "" prefix hint for a value (used with an already-formatted number). */
export function signArrow(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "";
  return value > 0 ? "▲" : "▼";
}
