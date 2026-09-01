import { describe, expect, it } from "vitest";
import { budgetProgress, monthProgressFor, totalBudgetProgress, type Budget } from "../budgets";
import type { CategorySlice } from "../aggregate";

const budgets: Budget[] = [
  { category: "Gastronomía", amountArs: 100000 },
  { category: "Transporte", amountArs: 50000 },
];

const spend = (o: Record<string, number>): CategorySlice[] =>
  Object.entries(o).map(([category, amountArs]) => ({ category, amountArs }));

describe("budgetProgress", () => {
  it("pairs each budget with what was spent in that category", () => {
    const rows = budgetProgress(budgets, spend({ Gastronomía: 40000, Transporte: 10000 }));
    const gastro = rows.find((r) => r.category === "Gastronomía")!;
    expect(gastro.spentArs).toBe(40000);
    expect(gastro.ratio).toBeCloseTo(0.4, 9);
    expect(gastro.remainingArs).toBe(60000);
    expect(gastro.status).toBe("ok");
  });

  it("warns from 80% and flags over past 100%", () => {
    const rows = budgetProgress(budgets, spend({ Gastronomía: 80000, Transporte: 60000 }));
    expect(rows.find((r) => r.category === "Gastronomía")!.status).toBe("warn");
    const transporte = rows.find((r) => r.category === "Transporte")!;
    expect(transporte.status).toBe("over");
    expect(transporte.remainingArs).toBe(-10000); // overspent
  });

  it("treats exactly 100% as spent-but-not-over", () => {
    const rows = budgetProgress([{ category: "X", amountArs: 1000 }], spend({ X: 1000 }));
    expect(rows[0].ratio).toBe(1);
    expect(rows[0].status).toBe("warn");
    expect(rows[0].remainingArs).toBe(0);
  });

  it("shows a budget with no spend yet as zero, not missing", () => {
    const rows = budgetProgress(budgets, spend({ Gastronomía: 5000 }));
    const transporte = rows.find((r) => r.category === "Transporte")!;
    expect(transporte.spentArs).toBe(0);
    expect(transporte.ratio).toBe(0);
    expect(transporte.status).toBe("ok");
  });

  it("ignores spending in categories that have no budget", () => {
    const rows = budgetProgress(budgets, spend({ Gastronomía: 1000, Indumentaria: 999999 }));
    expect(rows.map((r) => r.category).sort()).toEqual(["Gastronomía", "Transporte"]);
  });

  it("does not divide by zero when the budget is zero", () => {
    const rows = budgetProgress([{ category: "X", amountArs: 0 }], spend({ X: 5000 }));
    expect(rows[0].ratio).toBe(0);
    expect(Number.isFinite(rows[0].ratio)).toBe(true);
  });

  it("sorts the most-consumed budget first", () => {
    const rows = budgetProgress(budgets, spend({ Gastronomía: 10000, Transporte: 45000 }));
    expect(rows.map((r) => r.category)).toEqual(["Transporte", "Gastronomía"]);
  });

  it("projects the month-end total from the current pace", () => {
    // Half way through the month having spent 30.000 -> heading for 60.000.
    const rows = budgetProgress([{ category: "X", amountArs: 100000 }], spend({ X: 30000 }), 0.5);
    expect(rows[0].projectedArs).toBeCloseTo(60000, 9);
  });

  it("has no projection once the month is complete", () => {
    const rows = budgetProgress([{ category: "X", amountArs: 100000 }], spend({ X: 30000 }), 1);
    expect(rows[0].projectedArs).toBeNull();
  });

  it("returns nothing when no budgets are set", () => {
    expect(budgetProgress([], spend({ Gastronomía: 5000 }))).toEqual([]);
  });
});

describe("totalBudgetProgress", () => {
  it("sums the budgets and the spend into one ratio", () => {
    const rows = budgetProgress(budgets, spend({ Gastronomía: 40000, Transporte: 20000 }));
    const total = totalBudgetProgress(rows);
    expect(total.budgetArs).toBe(150000);
    expect(total.spentArs).toBe(60000);
    expect(total.ratio).toBeCloseTo(0.4, 9);
    expect(total.status).toBe("ok");
  });

  it("is over when the combined spend passes the combined budget", () => {
    const rows = budgetProgress(budgets, spend({ Gastronomía: 120000, Transporte: 60000 }));
    expect(totalBudgetProgress(rows).status).toBe("over");
  });

  it("is all zeroes with no rows", () => {
    expect(totalBudgetProgress([])).toEqual({ budgetArs: 0, spentArs: 0, ratio: 0, status: "ok" });
  });
});

describe("monthProgressFor", () => {
  it("is complete for a month already past", () => {
    expect(monthProgressFor("2026-05", "2026-07-10")).toBe(1);
  });

  it("is zero for a month that hasn't started", () => {
    expect(monthProgressFor("2026-09", "2026-07-10")).toBe(0);
  });

  it("is the fraction of days elapsed in the current month", () => {
    expect(monthProgressFor("2026-07", "2026-07-15")).toBeCloseTo(15 / 31, 9);
    expect(monthProgressFor("2026-06", "2026-06-15")).toBeCloseTo(15 / 30, 9);
  });

  it("handles February in a leap year", () => {
    expect(monthProgressFor("2028-02", "2028-02-29")).toBeCloseTo(1, 9);
    expect(monthProgressFor("2026-02", "2026-02-14")).toBeCloseTo(14 / 28, 9);
  });

  it("never exceeds 1 on the last day", () => {
    expect(monthProgressFor("2026-07", "2026-07-31")).toBe(1);
  });
});
