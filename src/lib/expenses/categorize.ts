export type CategoryRule = { pattern: string; category: string; priority: number };

export const DEFAULT_CATEGORY = "Otros";

/**
 * Picks a category for a merchant string by the highest-priority rule whose
 * pattern appears in the (accent-insensitive, upper-cased) merchant text.
 * Rules are pre-sorted by priority desc by the caller, but we don't rely on it.
 */
export function categorizeMerchant(merchant: string, rules: CategoryRule[]): string {
  const haystack = normalize(merchant);
  let best: CategoryRule | null = null;
  for (const rule of rules) {
    if (haystack.includes(normalize(rule.pattern))) {
      if (!best || rule.priority > best.priority) best = rule;
    }
  }
  return best?.category ?? DEFAULT_CATEGORY;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .toUpperCase()
    .trim();
}

const PROCESSOR_PREFIX = /^(MERPAGO|MERCADOPAGO|MP|DLO|PAYU|AR|PAGO|DINERS|PVS|UBER)\s*\*\s*/i;

/**
 * Cleans a merchant label by stripping leading payment-processor prefixes
 * (e.g. "MERPAGO*FAUNO" -> "FAUNO", "PAYU*AR*UBER" -> "UBER"), so the stored
 * name and the category rules see the real merchant.
 */
export function normalizeMerchant(raw: string): string {
  let s = raw.trim();
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(PROCESSOR_PREFIX, "").trim();
  }
  return s || raw.trim();
}
