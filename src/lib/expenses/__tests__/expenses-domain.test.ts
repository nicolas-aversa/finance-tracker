import { describe, expect, it } from "vitest";
import { categorizeMerchant, normalizeMerchant, DEFAULT_CATEGORY } from "../categorize";
import {
  categoryDetail,
  listMonths,
  monthlyCategoryStacks,
  monthlyTotals,
  monthOverMonth,
  periodSummary,
} from "../aggregate";
import { computeActiveInstallments, futureCommitmentArs } from "../installments";
import { billingMonth, monthOf, type DomainExpense } from "../types";

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

describe("categorizeMerchant", () => {
  const rules = [
    { pattern: "coto", category: "Supermercado", priority: 10 },
    { pattern: "carrefour", category: "Supermercado", priority: 10 },
    { pattern: "netflix", category: "Suscripciones", priority: 20 },
  ];
  it("matches a keyword case- and accent-insensitively", () => {
    expect(categorizeMerchant("COTO ABASTO", rules)).toBe("Supermercado");
    expect(categorizeMerchant("Cótó dígital", rules)).toBe("Supermercado");
  });
  it("falls back to Otros when nothing matches", () => {
    expect(categorizeMerchant("KIOSCO DON JUAN", rules)).toBe(DEFAULT_CATEGORY);
  });
  it("prefers the higher-priority rule", () => {
    const r = [
      { pattern: "mercado", category: "Otros compras", priority: 1 },
      { pattern: "mercadopago", category: "Billetera", priority: 50 },
    ];
    expect(categorizeMerchant("MERCADOPAGO*UBER", r)).toBe("Billetera");
  });
});

describe("normalizeMerchant", () => {
  it("strips leading payment-processor prefixes", () => {
    expect(normalizeMerchant("MERPAGO*FAUNO")).toBe("FAUNO");
    expect(normalizeMerchant("DLO*ANTHROPIC")).toBe("ANTHROPIC");
    expect(normalizeMerchant("PAYU*AR*UBER")).toBe("UBER");
  });
  it("leaves a clean merchant untouched and never returns empty", () => {
    expect(normalizeMerchant("EMOVA SUBTE")).toBe("EMOVA SUBTE");
    expect(normalizeMerchant("MERPAGO*")).toBe("MERPAGO*"); // would strip to empty -> keep original
  });
});

describe("billingMonth", () => {
  it("buckets a statement by (close date − 15 days)", () => {
    expect(billingMonth("2026-07-30")).toBe("2026-07"); // -15 -> 2026-07-15
    expect(billingMonth("2026-07-02")).toBe("2026-06"); // -15 -> 2026-06-17
    expect(billingMonth("2026-05-28")).toBe("2026-05"); // -15 -> 2026-05-13
  });
});

describe("aggregate", () => {
  const expenses = [
    exp({ txDate: "2026-06-05", amount: 10000, currency: "ARS", category: "Supermercado", merchant: "COTO" }),
    exp({ txDate: "2026-06-20", amount: 5000, currency: "ARS", category: "Transporte", merchant: "SUBE" }),
    exp({ txDate: "2026-06-15", amount: 10, currency: "USD", category: "Suscripciones", merchant: "NETFLIX" }),
    exp({ txDate: "2026-05-10", amount: 8000, currency: "ARS", category: "Supermercado", merchant: "COTO" }),
    // a payment must be excluded from spend
    exp({ txDate: "2026-06-01", amount: 20000, currency: "ARS", kind: "payment", merchant: "SU PAGO" }),
  ];

  it("lists months newest-first", () => {
    expect(listMonths(expenses)).toEqual(["2026-06", "2026-05"]);
  });

  it("period summary combines ARS + USD and excludes payments", () => {
    const s = periodSummary(expenses, "2026-06", CCL);
    expect(s.totalArs).toBe(15000); // 10000 + 5000
    expect(s.totalUsd).toBe(10);
    expect(s.combinedArs).toBe(15000 + 10 * CCL); // 30000
    expect(s.count).toBe(3); // payment excluded
    expect(s.byCategory[0]).toEqual({ category: "Suscripciones", amountArs: 15000 }); // 10 USD -> 15000 ARS is the largest
  });

  it("month over month delta", () => {
    const mom = monthOverMonth(expenses, "2026-06", CCL);
    // June combined = 30000, May = 8000
    expect(mom.current).toBe(30000);
    expect(mom.previous).toBe(8000);
    expect(mom.deltaPct).toBeCloseTo(30000 / 8000 - 1, 9);
  });

  it("monthly totals exclude payments", () => {
    const totals = monthlyTotals(expenses, CCL);
    expect(totals.find((t) => t.month === "2026-06")!.amountArs).toBe(30000);
  });

  it("groups by billing month, not the transaction date (installments)", () => {
    // A cuota with an old purchase date but billed in July stays in July.
    const withCuota = [
      ...expenses,
      exp({ txDate: "2025-11-03", billingMonth: "2026-07", amount: 4000, currency: "ARS", installmentCurrent: 8, installmentTotal: 12 }),
    ];
    expect(listMonths(withCuota)).toEqual(["2026-07", "2026-06", "2026-05"]);
    expect(periodSummary(withCuota, "2026-07", CCL).totalArs).toBe(4000);
    // The old 2025 txDate must NOT create a 2025 bucket.
    expect(listMonths(withCuota)).not.toContain("2025-11");
  });

  it("builds stacked category segments per month with a net-out of refunds", () => {
    const withRefund = [
      ...expenses,
      // a refund (negative) in June Gastronomía nets against a charge
      exp({ txDate: "2026-06-22", billingMonth: "2026-06", amount: 3000, currency: "ARS", category: "Gastronomía" }),
      exp({ txDate: "2026-06-25", billingMonth: "2026-06", amount: -1000, currency: "ARS", category: "Gastronomía", kind: "refund" }),
    ];
    const stacks = monthlyCategoryStacks(withRefund, CCL);
    const june = stacks.find((s) => s.month === "2026-06")!;
    // segments sum to the bar total, and each carries a color
    expect(june.total).toBeCloseTo(june.segments.reduce((s, x) => s + x.amountArs, 0), 6);
    expect(june.segments.every((s) => s.light.startsWith("#"))).toBe(true);
    const gastro = june.segments.find((s) => s.category === "Gastronomía")!;
    expect(gastro.amountArs).toBe(2000); // 3000 charge − 1000 refund
    // payments never appear as spend
    expect(june.segments.some((s) => s.category === "Pagos")).toBe(false);
  });

  it("accumulated summary (month=null) sums every billing month and excludes payments", () => {
    const all = periodSummary(expenses, null, CCL);
    expect(all.month).toBeNull();
    expect(all.count).toBe(4); // 5 movements, payment excluded
    // May 8000 + June (10000 + 5000 ARS + 10 USD*1500)
    expect(all.combinedArs).toBe(8000 + 15000 + 10 * CCL);
  });
});

describe("installments", () => {
  it("detects active installments and projects the remaining commitment", () => {
    const expenses = [
      // A 12-cuota purchase seen at cuota 3
      exp({ merchant: "PLAZA", amount: 5000, installmentCurrent: 3, installmentTotal: 12, currency: "ARS" }),
      // A USD 6-cuota purchase seen at cuota 6 (fully paid -> excluded)
      exp({ merchant: "APPLE", amount: 20, installmentCurrent: 6, installmentTotal: 6, currency: "USD" }),
      // A single-payment purchase -> not an installment
      exp({ merchant: "KIOSCO", amount: 800, currency: "ARS" }),
    ];
    const active = computeActiveInstallments(expenses);
    expect(active).toHaveLength(1);
    expect(active[0].merchant).toBe("PLAZA");
    expect(active[0].remainingCount).toBe(9); // 12 - 3
    expect(active[0].remainingAmount).toBe(45000); // 9 * 5000

    expect(futureCommitmentArs(expenses, CCL)).toBe(45000);
  });

  it("uses the highest cuota seen across months as current progress", () => {
    const expenses = [
      exp({ txDate: "2026-05-10", merchant: "PLAZA", amount: 5000, installmentCurrent: 2, installmentTotal: 12 }),
      exp({ txDate: "2026-06-10", merchant: "PLAZA", amount: 5000, installmentCurrent: 3, installmentTotal: 12 }),
    ];
    const active = computeActiveInstallments(expenses);
    expect(active[0].installmentCurrent).toBe(3);
    expect(active[0].remainingCount).toBe(9);
  });
});

describe("categoryDetail", () => {
  const expenses = [
    exp({ txDate: "2026-05-10", amount: 8000, category: "Supermercado", merchant: "COTO" }),
    exp({ txDate: "2026-06-05", amount: 10000, category: "Supermercado", merchant: "COTO" }),
    exp({ txDate: "2026-06-08", amount: 2000, category: "Supermercado", merchant: "DIA" }),
    exp({ txDate: "2026-06-20", amount: 5000, category: "Transporte", merchant: "SUBE" }),
    exp({ txDate: "2026-06-01", amount: 30000, category: "Supermercado", merchant: "SU PAGO", kind: "payment" }),
  ];

  it("totals only the category, excluding payments", () => {
    const d = categoryDetail(expenses, "Supermercado", "2026-06", CCL);
    expect(d.totalArs).toBe(12000); // 10000 + 2000, the payment is not spend
    expect(d.count).toBe(2);
  });

  it("computes the share of the period's total spend", () => {
    const d = categoryDetail(expenses, "Supermercado", "2026-06", CCL);
    expect(d.sharePct).toBeCloseTo(12000 / 17000, 9); // 17000 = 12000 + 5000 Transporte
  });

  it("returns a month series covering every month in the data, zero-filled", () => {
    const d = categoryDetail(expenses, "Transporte", null, CCL);
    expect(d.monthly).toEqual([
      { month: "2026-05", amountArs: 0 }, // no Transporte in May
      { month: "2026-06", amountArs: 5000 },
    ]);
  });

  it("compares against the previous month of its own series", () => {
    const d = categoryDetail(expenses, "Supermercado", "2026-06", CCL);
    expect(d.momDeltaPct).toBeCloseTo(12000 / 8000 - 1, 9); // +50%
  });

  it("has no delta when there is no earlier month", () => {
    expect(categoryDetail(expenses, "Supermercado", "2026-05", CCL).momDeltaPct).toBeNull();
  });

  it("has no delta when the previous month was zero", () => {
    expect(categoryDetail(expenses, "Transporte", "2026-06", CCL).momDeltaPct).toBeNull();
  });

  it("ranks merchants within the category", () => {
    const d = categoryDetail(expenses, "Supermercado", "2026-06", CCL);
    expect(d.topMerchants).toEqual([
      { merchant: "COTO", amountArs: 10000 },
      { merchant: "DIA", amountArs: 2000 },
    ]);
  });

  it("converts USD spend at the CCL rate", () => {
    const usd = [exp({ txDate: "2026-06-15", amount: 10, currency: "USD", category: "Suscripciones" })];
    expect(categoryDetail(usd, "Suscripciones", "2026-06", CCL).totalArs).toBe(10 * CCL);
  });

  it("is all zeroes for a category with no movements", () => {
    const d = categoryDetail(expenses, "Inexistente", "2026-06", CCL);
    expect(d.totalArs).toBe(0);
    expect(d.count).toBe(0);
    expect(d.sharePct).toBe(0);
    expect(d.topMerchants).toEqual([]);
  });
});
