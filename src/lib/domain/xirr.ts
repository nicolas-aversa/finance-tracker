export type CashFlow = { date: string; amount: number };

const DAYS_PER_YEAR = 365;
const MAX_ITER = 100;
const TOLERANCE = 1e-7;

function yearsBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / (DAYS_PER_YEAR * 24 * 60 * 60 * 1000);
}

function npv(rate: number, flows: CashFlow[], t0: string): number {
  return flows.reduce((sum, f) => sum + f.amount / Math.pow(1 + rate, yearsBetween(t0, f.date)), 0);
}

/**
 * Money-weighted annualized return (XIRR): the rate that makes the net present
 * value of dated cash flows zero. Sign convention: money OUT (buys) negative,
 * money IN (sells + current market value) positive.
 *
 * Newton-Raphson with a bisection fallback. Returns null when it can't converge
 * or the inputs are degenerate (no sign change ⇒ no root, all same-day, etc.).
 */
export function computeXirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const hasPositive = flows.some((f) => f.amount > 0);
  const hasNegative = flows.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const sorted = [...flows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const t0 = sorted[0].date;
  if (sorted.every((f) => f.date === t0)) return null;

  // Newton-Raphson from a sensible guess.
  let rate = 0.1;
  for (let i = 0; i < MAX_ITER; i++) {
    const value = npv(rate, sorted, t0);
    if (Math.abs(value) < TOLERANCE) return rate;
    const derivative = sorted.reduce((sum, f) => {
      const yrs = yearsBetween(t0, f.date);
      return sum - (yrs * f.amount) / Math.pow(1 + rate, yrs + 1);
    }, 0);
    if (derivative === 0) break;
    const next = rate - value / derivative;
    if (!Number.isFinite(next) || next <= -0.9999) break;
    if (Math.abs(next - rate) < TOLERANCE) return next;
    rate = next;
  }

  // Bisection fallback over a wide bracket.
  let lo = -0.9999;
  let hi = 100;
  let fLo = npv(lo, sorted, t0);
  let fHi = npv(hi, sorted, t0);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < MAX_ITER; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, sorted, t0);
    if (Math.abs(fMid) < TOLERANCE) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}
