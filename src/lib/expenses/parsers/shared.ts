// Type-only re-export (erased at build) so this module stays free of the
// server-only `extract-text` runtime import and can be unit-tested directly.
export type { PageText, TextItem } from "./page-text";

/** Thrown by a per-issuer parser that hasn't been calibrated to a real sample yet. */
export class CalibrationPendingError extends Error {
  constructor(issuer: string) {
    super(`El lector de resúmenes de ${issuer} todavía no está calibrado. Falta un PDF de ejemplo.`);
    this.name = "CalibrationPendingError";
  }
}

/** Parses an Argentine-formatted amount ("1.234,56" or "-1.234,56" or "1.234,56-"). */
export function parseArsNumber(raw: string): number {
  const s = raw.trim();
  const negative = s.startsWith("-") || s.endsWith("-");
  const digits = s.replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(digits);
  if (Number.isNaN(n)) return NaN;
  return negative ? -n : n;
}

/** Parses "dd/mm/yy" or "dd/mm/yyyy" -> "yyyy-mm-dd" (2-digit years assumed 20xx). */
export function parseDmyDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${month}-${day}`;
}

const SPANISH_MONTHS: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
};

export function spanishMonth(abbrev: string): number | null {
  return SPANISH_MONTHS[abbrev.slice(0, 3).toLowerCase()] ?? null;
}

/** Parses "dd-Mmm-yy" (e.g. "07-Ago-26") -> "yyyy-mm-dd". */
export function parseSpanishAbbrevDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})-([A-Za-zÁÉÍÓÚáéíóú]{3,})-(\d{2,4})$/);
  if (!m) return null;
  const month = spanishMonth(m[2]);
  if (!month) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Parses "d/mmm" Spanish (e.g. "3/jul") -> { day, month }. Year is inferred by the caller. */
export function parseSpanishDayMonth(raw: string): { day: number; month: number } | null {
  const m = raw.trim().match(/^(\d{1,2})\/([A-Za-zÁÉÍÓÚáéíóú]{3,})$/);
  if (!m) return null;
  const month = spanishMonth(m[2]);
  if (!month) return null;
  return { day: Number(m[1]), month };
}

/** Parses "N de <mes>" Spanish (e.g. "1 de agosto") -> { day, month }. */
export function parseSpanishLongDayMonth(raw: string): { day: number; month: number } | null {
  const m = raw.trim().match(/^(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)$/i);
  if (!m) return null;
  const month = spanishMonth(m[2]);
  if (!month) return null;
  return { day: Number(m[1]), month };
}

/**
 * Infers the year for a statement whose PDF omits it, from the close month and
 * "today": the most recent occurrence of that month not more than ~45 days ahead.
 */
export function inferYear(month: number, today = new Date()): number {
  const y = today.getFullYear();
  const candidate = new Date(y, month - 1, 1);
  const cutoff = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);
  return candidate > cutoff ? y - 1 : y;
}

/** Parses a barcode/reference starting with yyyymmdd -> "yyyy-mm-dd". */
export function parseBarcodeDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${y}-${mo}-${d}`;
}

/** Matches an installment marker like "C.03/12", "CUOTA 03/12", "03/12". Returns [current, total]. */
export function parseInstallment(text: string): { current: number; total: number } | null {
  const m = text.match(/(?:C\.?\s*|CUOTA\s*)?(\d{1,2})\s*\/\s*(\d{1,2})/i);
  if (!m) return null;
  const current = Number(m[1]);
  const total = Number(m[2]);
  if (total <= 1 || current > total) return null;
  return { current, total };
}
