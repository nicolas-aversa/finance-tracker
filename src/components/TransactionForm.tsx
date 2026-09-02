"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { computeTransactionDerived } from "@/lib/domain/transaction-math";
import { formatArs, formatUsd } from "@/lib/format";
import { createTransactionAction, type CreateTransactionState } from "@/app/(app)/add/actions";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type TransactionFormInitial = {
  ticker: string;
  type: "BUY" | "SELL";
  tradeDate: string;
  arsPrice: string;
  qty: string;
  cclRate: string;
};

type TransactionFormAction = (
  prevState: CreateTransactionState,
  formData: FormData
) => Promise<CreateTransactionState>;

const CUSTOM_TICKER = "__custom__";

export function TransactionForm({
  tickerOptions,
  action = createTransactionAction,
  initial,
  submitLabel = "Guardar transacción",
  cancelHref,
}: {
  tickerOptions: string[];
  action?: TransactionFormAction;
  initial?: TransactionFormInitial;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<CreateTransactionState, FormData>(action, undefined);

  const [date, setDate] = useState(initial?.tradeDate ?? todayIso());
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  // "custom" = user is typing a ticker not in the dropdown. Start in custom mode
  // only if editing a transaction whose ticker isn't one of the current options.
  const [customTicker, setCustomTicker] = useState(
    initial?.ticker != null && !tickerOptions.includes(initial.ticker)
  );
  const [type, setType] = useState<"BUY" | "SELL">(initial?.type ?? "BUY");
  const [qty, setQty] = useState(initial?.qty ?? "");
  const [arsPrice, setArsPrice] = useState(initial?.arsPrice ?? "");
  const [cclRate, setCclRate] = useState(initial?.cclRate ?? "");
  const [rateFetchError, setRateFetchError] = useState<string | null>(null);
  const [fetchingRate, setFetchingRate] = useState(false);
  const rateEditedByUser = useRef(false);
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Skip the auto-fetch on first mount in edit mode: we already trust the
    // transaction's original CCL rate and shouldn't silently overwrite it on load.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      if (initial) return;
    }

    rateEditedByUser.current = false;
    setFetchingRate(true);
    setRateFetchError(null);

    fetch(`/api/ccl-rate?date=${date}`)
      .then((res) => res.json())
      .then((data: { rate?: number; error?: string }) => {
        if (rateEditedByUser.current) return;
        if (data.rate) setCclRate(String(data.rate));
        else setRateFetchError(data.error ?? "No se pudo obtener la cotización.");
      })
      .catch(() => setRateFetchError("No se pudo obtener la cotización."))
      .finally(() => setFetchingRate(false));
    // `initial` is only read for the first-mount edit-mode skip above, and is
    // stable for the lifetime of this form — re-running on `date` alone is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const qtyNum = Number(qty);
  const arsPriceNum = Number(arsPrice);
  const cclRateNum = Number(cclRate);
  const hasPreview = qtyNum > 0 && arsPriceNum > 0 && cclRateNum > 0;
  const preview = hasPreview
    ? computeTransactionDerived({ arsPrice: arsPriceNum, cclRate: cclRateNum, qty: qtyNum })
    : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(["BUY", "SELL"] as const).map((t) => (
          <label
            key={t}
            className={`flex-1 rounded-lg border px-4 py-3 text-center text-sm font-medium ${
              type === t
                ? t === "BUY"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-400"
                  : "border-red-600 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950 dark:text-red-400"
                : "border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => setType(t)}
              className="sr-only"
            />
            {t === "BUY" ? "Compra" : "Venta"}
          </label>
        ))}
      </div>

      <Field label="Ticker">
        <div className="relative">
          <select
            value={customTicker ? CUSTOM_TICKER : ticker}
            onChange={(e) => {
              if (e.target.value === CUSTOM_TICKER) {
                setCustomTicker(true);
                setTicker("");
              } else {
                setCustomTicker(false);
                setTicker(e.target.value);
              }
            }}
            className="input appearance-none pr-10"
          >
            {!customTicker && ticker === "" && (
              <option value="" disabled>
                Elegí un ticker
              </option>
            )}
            {tickerOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value={CUSTOM_TICKER}>➕ Otro ticker…</option>
          </select>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          >
            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {customTicker && (
          <input
            type="text"
            autoFocus
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Escribí el ticker (ej: KO)"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="input mt-2"
          />
        )}

        <input type="hidden" name="ticker" value={ticker} />
      </Field>

      <Field label="Fecha">
        <input
          name="tradeDate"
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          required
          className="input"
        />
      </Field>

      <Field label="Cantidad (CEDEARs)">
        <input
          name="qty"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          required
          className="input"
        />
      </Field>

      <Field label="Precio en ARS (por CEDEAR)">
        <input
          name="arsPrice"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={arsPrice}
          onChange={(e) => setArsPrice(e.target.value)}
          required
          className="input"
        />
      </Field>

      <Field label={`Cotización CCL${fetchingRate ? " (buscando...)" : ""}`}>
        <input
          name="cclRate"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={cclRate}
          onChange={(e) => {
            rateEditedByUser.current = true;
            setCclRate(e.target.value);
          }}
          required
          className="input"
        />
        {rateFetchError && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{rateFetchError}</p>}
      </Field>

      {preview && (
        <div className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <p className="money">Monto en ARS: {formatArs(preview.arsAmount)}</p>
          <p className="money">Precio en USD: {formatUsd(preview.usdPrice)}</p>
          <p className="money">Monto en USD: {formatUsd(preview.usdAmount)}</p>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex gap-3">
        {cancelHref && (
          <Link
            href={cancelHref}
            className="flex flex-1 items-center justify-center rounded-xl border border-neutral-300 px-4 py-3 text-base font-medium text-neutral-700 transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600"
          >
            Cancelar
          </Link>
        )}
        <button type="submit" disabled={pending} className="btn-accent flex-[2]">
          {pending ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}
