import type { Transaction } from "@/lib/db/schema";

export type TxType = "BUY" | "SELL";

export type DomainTransaction = {
  id: string;
  ticker: string;
  type: TxType;
  tradeDate: string;
  cclRate: number;
  arsPrice: number;
  qty: number;
  /** Epoch ms of row creation — breaks ties when several transactions share a tradeDate. */
  createdAtMs: number;
};

/** Converts a DB row (numeric columns come back as strings) into plain numbers for math. */
export function toDomainTransaction(row: Transaction): DomainTransaction {
  return {
    id: row.id,
    ticker: row.ticker,
    type: row.type as TxType,
    tradeDate: row.tradeDate,
    cclRate: Number(row.cclRate),
    arsPrice: Number(row.arsPrice),
    qty: Number(row.qty),
    createdAtMs: row.createdAt.getTime(),
  };
}

/** Chronological order for a moving-average pass: by trade date, then creation time. */
export function byChronology(a: DomainTransaction, b: DomainTransaction): number {
  if (a.tradeDate !== b.tradeDate) return a.tradeDate < b.tradeDate ? -1 : 1;
  return a.createdAtMs - b.createdAtMs;
}
