import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  activeChips,
  activeFilterCount,
  buildHref,
  clearedFilters,
  filterExpenses,
  filteredTotals,
  filtersToSearchParams,
  parseExpenseFilters,
  sortExpenses,
  type ExpenseFilters,
} from "../filters";
import { monthOf, type DomainExpense } from "../types";

let seq = 0;
function exp(o: Partial<DomainExpense>): DomainExpense {
  const txDate = o.txDate ?? "2026-06-10";
  return {
    id: `e${seq++}`,
    source: "visa_galicia",
    txDate,
    billingMonth: o.billingMonth ?? monthOf(txDate),
    description: "COMPRA",
    merchant: "COMERCIO",
    amount: 1000,
    currency: "ARS",
    category: "Otros",
    installmentCurrent: null,
    installmentTotal: null,
    kind: "purchase",
    ...o,
  };
}

const CCL = 1500;
const VALID = { months: ["2026-05", "2026-06", "2026-07"], categories: ["Gastronomía", "Transporte", "Otros"] };

function filters(o: Partial<ExpenseFilters> = {}): ExpenseFilters {
  return { ...DEFAULT_FILTERS, ...o };
}

describe("parseExpenseFilters", () => {
  it("returns the defaults for an empty query string", () => {
    expect(parseExpenseFilters({}, VALID)).toEqual(DEFAULT_FILTERS);
  });

  it("treats an unknown or absent month as resumen", () => {
    expect(parseExpenseFilters({ mes: "resumen" }, VALID).month).toBeNull();
    expect(parseExpenseFilters({ mes: "chorizo" }, VALID).month).toBeNull();
    expect(parseExpenseFilters({ mes: "2026-01" }, VALID).month).toBeNull(); // valid shape, no data
    expect(parseExpenseFilters({ mes: "2026-06" }, VALID).month).toBe("2026-06");
  });

  it("keeps only categories that actually exist", () => {
    const f = parseExpenseFilters({ cat: ["Gastronomía", "Inventada"] }, VALID);
    expect(f.categories).toEqual(["Gastronomía"]);
  });

  it("accepts a repeated param as a list and a single one as a list of one", () => {
    expect(parseExpenseFilters({ cat: ["Gastronomía", "Transporte"] }, VALID).categories).toEqual([
      "Gastronomía",
      "Transporte",
    ]);
    expect(parseExpenseFilters({ cat: "Transporte" }, VALID).categories).toEqual(["Transporte"]);
  });

  it("de-duplicates repeated values", () => {
    expect(parseExpenseFilters({ cat: ["Otros", "Otros"] }, VALID).categories).toEqual(["Otros"]);
  });

  it("drops sources that aren't real card sources", () => {
    const f = parseExpenseFilters({ tarjeta: ["visa_galicia", "banco_falso"] }, VALID);
    expect(f.sources).toEqual(["visa_galicia"]);
  });

  it("ignores amounts that aren't numbers", () => {
    const f = parseExpenseFilters({ min: "abc", max: "" }, VALID);
    expect(f.minArs).toBeNull();
    expect(f.maxArs).toBeNull();
  });

  it("swaps min and max when they arrive inverted", () => {
    const f = parseExpenseFilters({ min: "9000", max: "1000" }, VALID);
    expect(f.minArs).toBe(1000);
    expect(f.maxArs).toBe(9000);
  });

  it("ignores malformed dates and swaps an inverted range", () => {
    expect(parseExpenseFilters({ desde: "10/06/2026" }, VALID).from).toBeNull();
    const f = parseExpenseFilters({ desde: "2026-07-01", hasta: "2026-06-01" }, VALID);
    expect(f.from).toBe("2026-06-01");
    expect(f.to).toBe("2026-07-01");
  });

  it("falls back to the default sort when the key is unknown", () => {
    const f = parseExpenseFilters({ orden: "xyz", dir: "sideways" }, VALID);
    expect(f.sort).toBe("fecha");
    expect(f.dir).toBe("desc");
  });

  it("survives a query string of pure garbage", () => {
    const f = parseExpenseFilters(
      { mes: "chorizo", orden: "xyz", min: "abc", desde: "ayer", cat: "Inventada", cuotas: "quizás" },
      VALID
    );
    expect(f).toEqual(DEFAULT_FILTERS);
  });
});

describe("filtersToSearchParams / buildHref", () => {
  it("omits everything sitting at its default", () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe("");
    expect(buildHref("/gastos/movimientos", DEFAULT_FILTERS)).toBe("/gastos/movimientos");
  });

  it("preserves the other filters when patching one", () => {
    const f = filters({ month: "2026-06", categories: ["Gastronomía"], query: "cafe" });
    const href = buildHref("/gastos/movimientos", f, { month: "2026-07" });
    const qs = new URL(href, "http://x").searchParams;
    expect(qs.get("mes")).toBe("2026-07");
    expect(qs.getAll("cat")).toEqual(["Gastronomía"]);
    expect(qs.get("q")).toBe("cafe");
  });

  it("drops a filter from the URL when the patch clears it", () => {
    const f = filters({ categories: ["Gastronomía", "Transporte"] });
    const href = buildHref("/gastos/movimientos", f, { categories: ["Transporte"] });
    expect(new URL(href, "http://x").searchParams.getAll("cat")).toEqual(["Transporte"]);
  });

  it("round-trips through the parser", () => {
    const f = filters({
      month: "2026-06",
      categories: ["Gastronomía"],
      sources: ["amex_galicia"],
      query: "cafe",
      from: "2026-06-01",
      to: "2026-06-30",
      minArs: 500,
      maxArs: 9000,
      installmentsOnly: true,
      sort: "monto",
      dir: "asc",
    });
    const qs = new URL(buildHref("/x", f), "http://x").searchParams;
    const raw: Record<string, string | string[]> = {};
    for (const key of new Set(qs.keys())) {
      const all = qs.getAll(key);
      raw[key] = all.length > 1 ? all : all[0];
    }
    expect(parseExpenseFilters(raw, VALID)).toEqual(f);
  });
});

describe("activeChips", () => {
  it("does not count the month as a narrowing filter", () => {
    expect(activeFilterCount(filters({ month: "2026-06" }))).toBe(0);
  });

  it("emits one chip per category and clears just that one", () => {
    const f = filters({ categories: ["Gastronomía", "Transporte"] });
    const chips = activeChips(f);
    expect(chips.map((c) => c.label)).toEqual(["Gastronomía", "Transporte"]);
    expect(chips[0].clear).toEqual({ categories: ["Transporte"] });
  });

  it("counts every active dimension", () => {
    const f = filters({ query: "cafe", minArs: 100, installmentsOnly: true });
    expect(activeFilterCount(f)).toBe(3);
  });
});

describe("clearedFilters", () => {
  it("keeps the month and sort but drops the narrowing filters", () => {
    const f = filters({ month: "2026-06", sort: "monto", dir: "asc", query: "cafe", categories: ["Otros"] });
    expect(clearedFilters(f)).toEqual(filters({ month: "2026-06", sort: "monto", dir: "asc" }));
  });
});

describe("filterExpenses", () => {
  const data = [
    exp({ id: "a", merchant: "STARBUCKS", category: "Gastronomía", amount: 12000, txDate: "2026-06-05" }),
    exp({ id: "b", merchant: "SUBTE", category: "Transporte", amount: 800, txDate: "2026-06-20" }),
    exp({ id: "c", merchant: "NETFLIX", category: "Otros", amount: 10, currency: "USD", txDate: "2026-06-15" }),
    exp({ id: "d", merchant: "PAGO TARJETA", category: "Pagos", amount: -50000, kind: "payment", txDate: "2026-06-28" }),
    exp({ id: "e", merchant: "MUEBLES", category: "Otros", amount: 30000, txDate: "2026-05-11", installmentCurrent: 2, installmentTotal: 6 }),
  ];
  const ids = (f: ExpenseFilters) => filterExpenses(data, f, CCL).map((e) => e.id);

  it("always excludes payments — paying the bill isn't spending", () => {
    expect(ids(DEFAULT_FILTERS)).not.toContain("d");
  });

  it("filters by billing month", () => {
    expect(ids(filters({ month: "2026-05" }))).toEqual(["e"]);
  });

  it("filters by category and by card", () => {
    expect(ids(filters({ categories: ["Transporte"] }))).toEqual(["b"]);
    expect(ids(filters({ sources: ["visa_galicia"] }))).toEqual(["a", "b", "c", "e"]);
  });

  it("compares amount bounds against the ARS-equivalent, so USD is included fairly", () => {
    // NETFLIX is USD 10 = ARS 15.000 at CCL 1500 — above a 13.000 floor even
    // though its raw amount is 10.
    expect(ids(filters({ minArs: 13000 }))).toEqual(["c", "e"]);
    expect(ids(filters({ maxArs: 1000 }))).toEqual(["b"]);
  });

  it("filters by transaction date range", () => {
    expect(ids(filters({ from: "2026-06-10", to: "2026-06-25" }))).toEqual(["b", "c"]);
  });

  it("keeps only real installment plans when asked", () => {
    expect(ids(filters({ installmentsOnly: true }))).toEqual(["e"]);
  });

  it("searches merchant and description, ignoring case and accents", () => {
    expect(ids(filters({ query: "starbucks" }))).toEqual(["a"]);
    expect(ids(filters({ query: "STÁRBUCKS" }))).toEqual(["a"]);
  });

  it("matches on description even when the merchant doesn't", () => {
    const list = [exp({ id: "z", merchant: "COMERCIO", description: "SUSCRIPCIÓN ANUAL" })];
    expect(filterExpenses(list, filters({ query: "suscripcion" }), CCL).map((e) => e.id)).toEqual(["z"]);
  });

  it("combines filters conjunctively", () => {
    expect(ids(filters({ month: "2026-06", categories: ["Otros"], minArs: 1000 }))).toEqual(["c"]);
  });

  it("returns nothing when the filters exclude everything", () => {
    expect(ids(filters({ categories: ["Gastronomía"], query: "netflix" }))).toEqual([]);
  });
});

describe("sortExpenses", () => {
  const data = [
    exp({ id: "a", merchant: "Zapatería", category: "Indumentaria", amount: 5000, txDate: "2026-06-01" }),
    exp({ id: "b", merchant: "árbol", category: "Otros", amount: 900, txDate: "2026-06-03" }),
    exp({ id: "c", merchant: "Bar", category: "Gastronomía", amount: 20000, txDate: "2026-06-02" }),
  ];
  const ids = (sort: Parameters<typeof sortExpenses>[1], dir: Parameters<typeof sortExpenses>[2]) =>
    sortExpenses(data, sort, dir, CCL).map((e) => e.id);

  it("sorts by date in both directions", () => {
    expect(ids("fecha", "desc")).toEqual(["b", "c", "a"]);
    expect(ids("fecha", "asc")).toEqual(["a", "c", "b"]);
  });

  it("sorts by amount in both directions", () => {
    expect(ids("monto", "desc")).toEqual(["c", "a", "b"]);
    expect(ids("monto", "asc")).toEqual(["b", "a", "c"]);
  });

  it("sorts merchants accent-insensitively, so 'árbol' comes before 'Bar'", () => {
    expect(ids("comercio", "asc")).toEqual(["b", "c", "a"]);
  });

  it("sorts by category", () => {
    expect(ids("categoria", "asc")).toEqual(["c", "a", "b"]);
  });

  it("breaks ties deterministically, newest first", () => {
    const tied = [
      exp({ id: "x2", merchant: "IGUAL", amount: 100, txDate: "2026-06-01" }),
      exp({ id: "x1", merchant: "IGUAL", amount: 100, txDate: "2026-06-02" }),
    ];
    expect(sortExpenses(tied, "comercio", "asc", CCL).map((e) => e.id)).toEqual(["x1", "x2"]);
    expect(sortExpenses([...tied].reverse(), "comercio", "asc", CCL).map((e) => e.id)).toEqual(["x1", "x2"]);
  });

  it("does not mutate the input array", () => {
    const original = [...data];
    sortExpenses(data, "monto", "asc", CCL);
    expect(data).toEqual(original);
  });
});

describe("filteredTotals", () => {
  it("keeps ARS and USD apart and combines them at the CCL rate", () => {
    const list = [exp({ amount: 1000 }), exp({ amount: 10, currency: "USD" })];
    const t = filteredTotals(list, CCL);
    expect(t.count).toBe(2);
    expect(t.totalArs).toBe(1000);
    expect(t.totalUsd).toBe(10);
    expect(t.combinedArs).toBeCloseTo(1000 + 10 * 1500, 9);
  });

  it("is all zeroes for an empty list", () => {
    expect(filteredTotals([], CCL)).toEqual({ count: 0, totalArs: 0, totalUsd: 0, combinedArs: 0 });
  });
});
