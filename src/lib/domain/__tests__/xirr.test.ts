import { describe, expect, it } from "vitest";
import { computeXirr } from "../xirr";

describe("computeXirr", () => {
  it("returns ~100% for money that doubles in one year", () => {
    const xirr = computeXirr([
      { date: "2025-01-01", amount: -100 },
      { date: "2026-01-01", amount: 200 },
    ]);
    expect(xirr).not.toBeNull();
    expect(xirr!).toBeCloseTo(1.0, 2);
  });

  it("returns ~0% when you get back exactly what you put in", () => {
    const xirr = computeXirr([
      { date: "2025-01-01", amount: -100 },
      { date: "2026-01-01", amount: 100 },
    ]);
    expect(xirr!).toBeCloseTo(0, 4);
  });

  it("returns a negative rate for a loss", () => {
    const xirr = computeXirr([
      { date: "2025-01-01", amount: -100 },
      { date: "2026-01-01", amount: 50 },
    ]);
    expect(xirr!).toBeLessThan(0);
  });

  it("handles multiple contributions (money-weighted)", () => {
    const xirr = computeXirr([
      { date: "2025-01-01", amount: -100 },
      { date: "2025-07-01", amount: -100 },
      { date: "2026-01-01", amount: 230 },
    ]);
    expect(xirr).not.toBeNull();
    expect(xirr!).toBeGreaterThan(0);
  });

  it("returns null when there is no sign change (all outflows)", () => {
    expect(computeXirr([{ date: "2025-01-01", amount: -100 }, { date: "2026-01-01", amount: -50 }])).toBeNull();
  });

  it("returns null for a single flow", () => {
    expect(computeXirr([{ date: "2025-01-01", amount: -100 }])).toBeNull();
  });
});
