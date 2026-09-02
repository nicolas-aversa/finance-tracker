import { describe, expect, it } from "vitest";
import { incomeUse, type Income } from "../income";

const income: Income[] = [
  { month: "2026-05", amountArs: 900_000 },
  { month: "2026-06", amountArs: 900_000 },
  { month: "2026-07", amountArs: 1_300_000 },
  { month: "2026-08", amountArs: 1_300_000 },
];

describe("incomeUse", () => {
  it("reports the share of income spent and what is left", () => {
    const u = incomeUse(income, "2026-07", 650_000)!;
    expect(u.incomeArs).toBe(1_300_000);
    expect(u.ratio).toBeCloseTo(0.5, 9);
    expect(u.leftoverArs).toBe(650_000);
    expect(u.status).toBe("ok");
  });

  it("goes tight from 70% and over past 100%", () => {
    expect(incomeUse(income, "2026-05", 630_000)!.status).toBe("warn");
    expect(incomeUse(income, "2026-05", 899_999)!.status).toBe("warn");
    expect(incomeUse(income, "2026-05", 900_000)!.status).toBe("warn"); // exactly spent, not over
    expect(incomeUse(income, "2026-05", 900_001)!.status).toBe("over");
  });

  it("reports a negative leftover when spending passed income", () => {
    const u = incomeUse(income, "2026-06", 1_000_000)!;
    expect(u.leftoverArs).toBe(-100_000);
    expect(u.status).toBe("over");
  });

  it("has nothing to say without a month, so the accumulated view shows none", () => {
    expect(incomeUse(income, null, 5_000_000)).toBeNull();
  });

  it("has nothing to say for a month with no income on record", () => {
    expect(incomeUse(income, "2026-09", 100_000)).toBeNull();
  });

  it("never divides by zero on a zero income", () => {
    expect(incomeUse([{ month: "2026-05", amountArs: 0 }], "2026-05", 100)).toBeNull();
  });
});
