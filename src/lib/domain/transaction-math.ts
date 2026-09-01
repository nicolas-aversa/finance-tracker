import type { DomainTransaction } from "./types";

export type TransactionDerived = {
  usdPrice: number;
  arsAmount: number;
  usdAmount: number;
};

/** USD Order Price / ARS Order Amount / USD Amount, per the original sheet's formulas. */
export function computeTransactionDerived(
  tx: Pick<DomainTransaction, "arsPrice" | "cclRate" | "qty">
): TransactionDerived {
  const usdPrice = tx.arsPrice / tx.cclRate;
  const arsAmount = tx.arsPrice * tx.qty;
  const usdAmount = arsAmount / tx.cclRate;
  return { usdPrice, arsAmount, usdAmount };
}

export type ProfitRoi = { profit: number; roi: number | null };

/** Unrealized mark-to-market gain of a single BUY lot, vs. the CURRENT price. */
export function computeBuyRowProfitRoi(tx: DomainTransaction, currentCedearUsd: number): ProfitRoi {
  const { usdPrice } = computeTransactionDerived(tx);
  const profit = (currentCedearUsd - usdPrice) * tx.qty;
  const roi = usdPrice > 0 ? currentCedearUsd / usdPrice - 1 : null;
  return { profit, roi };
}
