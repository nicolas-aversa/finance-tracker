import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRADE_FILTERS,
  activeTradeChips,
  activeTradeFilterCount,
  buildTradeHref,
  clearedTradeFilters,
  filterTransactions,
  parseTradeFilters,
  sortTransactions,
  tradeFiltersToSearchParams,
  tradeTotals,
  type TradeFilters,
} from "../trade-filters";
import type { DomainTransaction } from "../types";

let seq = 0;
function tx(o: Partial<DomainTransaction>): DomainTransaction {
  return {
    id: `t${seq++}`,
    ticker: "MELI",
    type: "BUY",
    tradeDate: "2026-06-10",
    cclRate: 1000,
    arsPrice: 10000, // -> usdPrice 10
    qty: 1,
    createdAtMs: seq,
    ...o,
  };
}

const TICKERS = ["MELI", "META", "NU"];

function filters(o: Partial<TradeFilters> = {}): TradeFilters {
  return { ...DEFAULT_TRADE_FILTERS, ...o };
}

describe("parseTradeFilters", () => {
  it("returns the defaults for an empty query string", () => {
    expect(parseTradeFilters({}, TICKERS)).toEqual(DEFAULT_TRADE_FILTERS);
  });

  it("keeps only tickers that exist, upper-casing what it gets", () => {
    expect(parseTradeFilters({ ticker: ["meli", "NOPE"] }, TICKERS).tickers).toEqual(["MELI"]);
  });

  it("accepts a repeated param as a list and de-duplicates", () => {
    expect(parseTradeFilters({ ticker: ["MELI", "META"] }, TICKERS).tickers).toEqual(["MELI", "META"]);
    expect(parseTradeFilters({ ticker: ["NU", "NU"] }, TICKERS).tickers).toEqual(["NU"]);
  });

  it("only accepts real transaction types", () => {
    expect(parseTradeFilters({ tipo: ["buy", "regalo"] }, TICKERS).types).toEqual(["BUY"]);
  });

  it("falls back to the default sort when the key is unknown", () => {
    const f = parseTradeFilters({ orden: "xyz", dir: "sideways" }, TICKERS);
    expect(f.sort).toBe("fecha");
    expect(f.dir).toBe("desc");
  });

  it("survives a query string of pure garbage", () => {
    expect(parseTradeFilters({ ticker: "INVENTADO", tipo: "xxx", orden: "??" }, TICKERS)).toEqual(
      DEFAULT_TRADE_FILTERS
    );
  });
});

describe("tradeFiltersToSearchParams / buildTradeHref", () => {
  it("omits everything sitting at its default", () => {
    expect(tradeFiltersToSearchParams(DEFAULT_TRADE_FILTERS).toString()).toBe("");
    expect(buildTradeHref("/log", DEFAULT_TRADE_FILTERS)).toBe("/log");
  });

  it("preserves the other filters when patching one", () => {
    const f = filters({ tickers: ["MELI"], types: ["SELL"] });
    const qs = new URL(buildTradeHref("/log", f, { sort: "monto" }), "http://x").searchParams;
    expect(qs.getAll("ticker")).toEqual(["MELI"]);
    expect(qs.getAll("tipo")).toEqual(["SELL"]);
    expect(qs.get("orden")).toBe("monto");
  });

  it("round-trips through the parser", () => {
    const f = filters({ tickers: ["MELI", "NU"], types: ["BUY"], sort: "monto", dir: "asc" });
    const qs = new URL(buildTradeHref("/log", f), "http://x").searchParams;
    const raw: Record<string, string | string[]> = {};
    for (const key of new Set(qs.keys())) {
      const all = qs.getAll(key);
      raw[key] = all.length > 1 ? all : all[0];
    }
    expect(parseTradeFilters(raw, TICKERS)).toEqual(f);
  });
});

describe("activeTradeChips", () => {
  it("emits one chip per ticker and type, clearing just that one", () => {
    const f = filters({ tickers: ["MELI", "NU"], types: ["BUY"] });
    const chips = activeTradeChips(f);
    expect(chips.map((c) => c.label)).toEqual(["MELI", "NU", "Compras"]);
    expect(chips[0].clear).toEqual({ tickers: ["NU"] });
    expect(activeTradeFilterCount(f)).toBe(3);
  });

  it("keeps the sort when clearing everything", () => {
    const f = filters({ tickers: ["MELI"], sort: "monto", dir: "asc" });
    expect(clearedTradeFilters(f)).toEqual(filters({ sort: "monto", dir: "asc" }));
  });
});

describe("filterTransactions", () => {
  const data = [
    tx({ id: "a", ticker: "MELI", type: "BUY" }),
    tx({ id: "b", ticker: "META", type: "SELL" }),
    tx({ id: "c", ticker: "NU", type: "BUY" }),
  ];
  const ids = (f: TradeFilters) => filterTransactions(data, f).map((t) => t.id);

  it("returns everything with no filters", () => {
    expect(ids(DEFAULT_TRADE_FILTERS)).toEqual(["a", "b", "c"]);
  });

  it("filters by ticker and by type", () => {
    expect(ids(filters({ tickers: ["MELI"] }))).toEqual(["a"]);
    expect(ids(filters({ types: ["SELL"] }))).toEqual(["b"]);
  });

  it("treats several values in one dimension as OR", () => {
    expect(ids(filters({ tickers: ["MELI", "NU"] }))).toEqual(["a", "c"]);
  });

  it("combines different dimensions conjunctively", () => {
    expect(ids(filters({ tickers: ["MELI", "META"], types: ["BUY"] }))).toEqual(["a"]);
  });

  it("returns nothing when the filters exclude everything", () => {
    expect(ids(filters({ tickers: ["META"], types: ["BUY"] }))).toEqual([]);
  });
});

describe("sortTransactions", () => {
  const data = [
    tx({ id: "a", tradeDate: "2026-06-01", arsPrice: 10000, qty: 5 }), // usd 50
    tx({ id: "b", tradeDate: "2026-06-03", arsPrice: 10000, qty: 1 }), // usd 10
    tx({ id: "c", tradeDate: "2026-06-02", arsPrice: 10000, qty: 9 }), // usd 90
  ];
  const ids = (sort: "fecha" | "monto", dir: "asc" | "desc") =>
    sortTransactions(data, sort, dir).map((t) => t.id);

  it("sorts by date in both directions", () => {
    expect(ids("fecha", "desc")).toEqual(["b", "c", "a"]);
    expect(ids("fecha", "asc")).toEqual(["a", "c", "b"]);
  });

  it("sorts by USD amount in both directions", () => {
    expect(ids("monto", "desc")).toEqual(["c", "a", "b"]);
    expect(ids("monto", "asc")).toEqual(["b", "a", "c"]);
  });

  it("breaks ties on the same day by creation time, newest first", () => {
    const tied = [
      tx({ id: "old", tradeDate: "2026-06-01", qty: 1, createdAtMs: 100 }),
      tx({ id: "new", tradeDate: "2026-06-01", qty: 1, createdAtMs: 200 }),
    ];
    expect(sortTransactions(tied, "monto", "asc").map((t) => t.id)).toEqual(["new", "old"]);
    expect(sortTransactions([...tied].reverse(), "monto", "asc").map((t) => t.id)).toEqual(["new", "old"]);
  });

  it("does not mutate the input array", () => {
    const original = [...data];
    sortTransactions(data, "monto", "asc");
    expect(data).toEqual(original);
  });
});

describe("tradeTotals", () => {
  it("separates bought from sold and nets them", () => {
    const t = tradeTotals([
      tx({ type: "BUY", arsPrice: 10000, qty: 10 }), // usd 100
      tx({ type: "SELL", arsPrice: 10000, qty: 3 }), // usd 30
    ]);
    expect(t.count).toBe(2);
    expect(t.boughtUsd).toBeCloseTo(100, 9);
    expect(t.soldUsd).toBeCloseTo(30, 9);
    expect(t.netUsd).toBeCloseTo(70, 9);
  });

  it("is all zeroes for an empty list", () => {
    expect(tradeTotals([])).toEqual({ count: 0, boughtUsd: 0, soldUsd: 0, netUsd: 0 });
  });
});
