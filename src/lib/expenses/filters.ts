import { EXPENSE_SOURCES, type ExpenseSource } from "@/lib/db/schema";
import { isSpend, spendArs } from "./aggregate";
import type { DomainExpense } from "./types";

export type SortKey = "fecha" | "monto";
export type SortDir = "asc" | "desc";

const SORT_KEYS: SortKey[] = ["fecha", "monto"];
const SORT_DIRS: SortDir[] = ["asc", "desc"];

/** Every filter the movements list understands. All of it lives in the URL. */
export type ExpenseFilters = {
  month: string | null; // null = "resumen" (every month)
  categories: string[];
  sources: ExpenseSource[];
  sort: SortKey;
  dir: SortDir;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_FILTERS: ExpenseFilters = {
  month: null,
  categories: [],
  sources: [],
  sort: "fecha",
  dir: "desc",
};

/** A repeated query param arrives as string[]; a single one as string. Normalize both. */
function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).map((v) => v.trim()).filter(Boolean);
}

function toSingle(value: string | string[] | undefined): string {
  const [first] = toList(value);
  return first ?? "";
}

/**
 * Reads filters out of the URL. Never throws: anything unrecognized falls back
 * to its default, so a hand-edited or stale link still renders a valid page.
 * `valid` scopes categories and months to what actually exists in the data.
 */
export function parseExpenseFilters(
  raw: RawSearchParams,
  valid: { months: string[]; categories: string[] }
): ExpenseFilters {
  const mes = toSingle(raw.mes);
  const month = mes && mes !== "resumen" && valid.months.includes(mes) ? mes : null;

  const validCategories = new Set(valid.categories);
  const categories = [...new Set(toList(raw.cat))].filter((c) => validCategories.has(c));

  const validSources = new Set<string>(EXPENSE_SOURCES);
  const sources = [...new Set(toList(raw.tarjeta))].filter((s): s is ExpenseSource =>
    validSources.has(s)
  );

  const sortRaw = toSingle(raw.orden) as SortKey;
  const dirRaw = toSingle(raw.dir) as SortDir;

  return {
    month,
    categories,
    sources,
    sort: SORT_KEYS.includes(sortRaw) ? sortRaw : DEFAULT_FILTERS.sort,
    dir: SORT_DIRS.includes(dirRaw) ? dirRaw : DEFAULT_FILTERS.dir,
  };
}

/** Serializes filters back to a query string, omitting everything at its default. */
export function filtersToSearchParams(f: ExpenseFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.month) p.set("mes", f.month);
  for (const c of f.categories) p.append("cat", c);
  for (const s of f.sources) p.append("tarjeta", s);
  if (f.sort !== DEFAULT_FILTERS.sort) p.set("orden", f.sort);
  if (f.dir !== DEFAULT_FILTERS.dir) p.set("dir", f.dir);
  return p;
}

/**
 * Builds a link that keeps every current filter and changes only `patch`.
 * This is what lets each control (month pill, sort, a chip's ✕) touch one
 * dimension without dropping the rest.
 */
export function buildHref(basePath: string, f: ExpenseFilters, patch: Partial<ExpenseFilters> = {}): string {
  const qs = filtersToSearchParams({ ...f, ...patch }).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export type FilterChip = { key: string; label: string; clear: Partial<ExpenseFilters> };

/** One removable chip per active filter, for the summary row above the list. */
export function activeChips(f: ExpenseFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const c of f.categories) {
    chips.push({
      key: `cat:${c}`,
      label: c,
      clear: { categories: f.categories.filter((x) => x !== c) },
    });
  }
  for (const s of f.sources) {
    chips.push({ key: `src:${s}`, label: s, clear: { sources: f.sources.filter((x) => x !== s) } });
  }
  return chips;
}

/** How many filters are narrowing the list (the month selector doesn't count). */
export function activeFilterCount(f: ExpenseFilters): number {
  return activeChips(f).length;
}

/** Clears every narrowing filter but keeps the month and the sort. */
export function clearedFilters(f: ExpenseFilters): ExpenseFilters {
  return { ...DEFAULT_FILTERS, month: f.month, sort: f.sort, dir: f.dir };
}

/**
 * Applies every filter. Payments are always excluded — paying the bill isn't
 * spending, the same rule the summary uses via `isSpend`.
 */
export function filterExpenses(expenses: DomainExpense[], f: ExpenseFilters): DomainExpense[] {
  const categories = f.categories.length ? new Set(f.categories) : null;
  const sources = f.sources.length ? new Set<string>(f.sources) : null;

  return expenses.filter((e) => {
    if (!isSpend(e)) return false;
    if (f.month !== null && e.billingMonth !== f.month) return false;
    if (categories && !categories.has(e.category)) return false;
    if (sources && !sources.has(e.source)) return false;
    return true;
  });
}

/** Sorts a copy. Ties break on date then id, so the order is always deterministic. */
export function sortExpenses(
  list: DomainExpense[],
  sort: SortKey,
  dir: SortDir,
  cclRate = 1
): DomainExpense[] {
  const sign = dir === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "fecha":
        cmp = a.txDate < b.txDate ? -1 : a.txDate > b.txDate ? 1 : 0;
        break;
      case "monto":
        cmp = spendArs(a, cclRate) - spendArs(b, cclRate);
        break;
    }
    if (cmp !== 0) return cmp * sign;
    if (a.txDate !== b.txDate) return a.txDate < b.txDate ? 1 : -1; // newest first
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export type FilteredTotals = {
  count: number;
  combinedArs: number;
  totalArs: number;
  totalUsd: number;
};

/** Totals for whatever the filters left, so the header reflects the filter, not the month. */
export function filteredTotals(list: DomainExpense[], cclRate: number): FilteredTotals {
  let totalArs = 0;
  let totalUsd = 0;
  for (const e of list) {
    if (e.currency === "USD") totalUsd += e.amount;
    else totalArs += e.amount;
  }
  return { count: list.length, totalArs, totalUsd, combinedArs: totalArs + totalUsd * cclRate };
}
