import Link from "next/link";
import { listTransactions } from "@/lib/db/transactions";
import { toDomainTransaction } from "@/lib/domain/types";
import { computeRealizedBySellId, computeTransactionRowMetrics } from "@/lib/domain/position";
import {
  activeTradeChips,
  buildTradeHref,
  clearedTradeFilters,
  filterTransactions,
  parseTradeFilters,
  sortTransactions,
  tradeTotals,
  type RawSearchParams,
  type TradeFilters,
} from "@/lib/domain/trade-filters";
import { getMarketSnapshot } from "@/lib/prices";
import { formatUsd } from "@/lib/format";
import { TradeLogRow } from "@/components/TradeLogRow";
import { FilterDropdown } from "@/components/FilterDropdown";
import { SortMenu } from "@/components/SortMenu";
import { ActiveChips } from "@/components/ActiveChips";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

const BASE = "/log";

const SORTS: { label: string; sort: TradeFilters["sort"]; dir: TradeFilters["dir"] }[] = [
  { label: "Más reciente", sort: "fecha", dir: "desc" },
  { label: "Más antigua", sort: "fecha", dir: "asc" },
  { label: "Mayor monto", sort: "monto", dir: "desc" },
  { label: "Menor monto", sort: "monto", dir: "asc" },
];

export default async function LogPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const [rows, raw] = await Promise.all([listTransactions(), searchParams]);
  const transactions = rows.map(toDomainTransaction);

  if (transactions.length === 0) {
    return (
      <EmptyState
        emoji="📜"
        title="Todavía no hay historial"
        hint="Acá vas a ver todas tus compras y ventas."
        action={{ href: "/add", label: "Cargar la primera" }}
      />
    );
  }

  const tickers = [...new Set(transactions.map((t) => t.ticker))].sort();
  const filters = parseTradeFilters(raw, tickers);

  const visible = sortTransactions(filterTransactions(transactions, filters), filters.sort, filters.dir);
  const totals = tradeTotals(visible);

  // The snapshot only needs prices for what's on screen.
  const snapshot = await getMarketSnapshot([...new Set(visible.map((t) => t.ticker))]);
  // Realized P&L per sell depends on the whole history, not the filtered slice.
  const realizedBySellId = computeRealizedBySellId(transactions);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Historial</h1>
        <Link href="/add" className="text-sm font-medium text-accent hover:text-accent-hover">
          + Cargar
        </Link>
      </div>

      {/* `relative` is the anchor the dropdown menus hang from. */}
      <div className="relative flex items-start gap-2">
        <FilterDropdown
          label="Ticker"
          allLabel="Todos los tickers"
          options={tickers.map((t) => ({ value: t, label: t }))}
          selected={filters.tickers}
          hrefFor={(next) => buildTradeHref(BASE, filters, { tickers: next })}
        />
        <FilterDropdown
          label="Tipo"
          allLabel="Compras y ventas"
          options={[
            { value: "BUY", label: "Compras" },
            { value: "SELL", label: "Ventas" },
          ]}
          selected={filters.types}
          hrefFor={(next) => buildTradeHref(BASE, filters, { types: next as TradeFilters["types"] })}
        />
        <SortMenu
          options={SORTS.map((o) => ({
            label: o.label,
            href: buildTradeHref(BASE, filters, { sort: o.sort, dir: o.dir }),
            active: filters.sort === o.sort && filters.dir === o.dir,
          }))}
        />
      </div>

      <ActiveChips
        chips={activeTradeChips(filters).map((c) => ({
          key: c.key,
          label: c.label,
          href: buildTradeHref(BASE, filters, c.clear),
        }))}
        clearAllHref={buildTradeHref(BASE, clearedTradeFilters(filters))}
      />

      <div className="flex items-baseline justify-between gap-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          {totals.count} {totals.count === 1 ? "operación" : "operaciones"}
        </span>
        <span className="money tabular-nums font-medium text-neutral-700 dark:text-neutral-300">
          {formatUsd(totals.boughtUsd)} comprado
          {totals.soldUsd > 0 && (
            <span className="ml-1 font-normal text-neutral-400 dark:text-neutral-500">
              · {formatUsd(totals.soldUsd)} vendido
            </span>
          )}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState emoji="🔍" title="Ninguna operación coincide" hint="Probá quitando algún filtro." />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((tx) => (
            <TradeLogRow
              key={tx.id}
              tx={tx}
              metrics={computeTransactionRowMetrics(tx, snapshot.cedearUsd[tx.ticker] ?? null, realizedBySellId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
