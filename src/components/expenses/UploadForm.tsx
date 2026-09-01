"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { uploadStatement, type UploadState } from "@/app/(app)/gastos/subir/actions";
import { SOURCE_EMOJI, SOURCE_LABEL } from "@/lib/expenses/labels";
import { formatDate } from "@/lib/format";
import type { ExpenseSource } from "@/lib/db/schema";

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export function UploadForm() {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(uploadStatement, undefined);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-3xl">⬆️</div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Subí el PDF del resumen de MercadoPago, Visa Galicia o Amex Galicia.
          </p>
          <label className="btn-accent mt-4 inline-block cursor-pointer px-5">
            Elegir PDF
            <input
              type="file"
              name="file"
              accept="application/pdf"
              required
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          {fileName && <p className="mt-2 truncate text-xs text-neutral-500 dark:text-neutral-400">{fileName}</p>}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Contraseña del PDF (si tiene)</span>
          <input name="password" type="text" autoComplete="off" placeholder="Opcional" className="input" />
        </label>

        {state?.error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-accent w-full">
          {pending ? "Procesando..." : "Procesar resumen"}
        </button>
      </form>

      {state?.ok && <ImportSummary result={state.ok} />}
    </div>
  );
}

function ImportSummary({ result }: { result: NonNullable<UploadState>["ok"] }) {
  if (!result) return null;
  const source = result.source as ExpenseSource;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <span className="text-xl">{SOURCE_EMOJI[source]}</span>
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{SOURCE_LABEL[source]}</span>
        {result.replaced && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            reemplazó el período
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Período {formatDate(result.statementPeriod)} · {result.movementCount} movimientos importados.
      </p>
      <div className="mt-2 text-sm tabular-nums text-neutral-700 dark:text-neutral-300">
        Total del resumen: $ {fmt.format(result.statementTotalArs ?? 0)}
        {(result.statementTotalUsd ?? 0) > 0 && <> · US$ {fmt.format(result.statementTotalUsd ?? 0)}</>}
      </div>
      {result.reconciledOk ? (
        <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          ✓ Conciliado: los movimientos suman exactamente el total del resumen.
        </p>
      ) : (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          ⚠️ Los movimientos leídos ($ {fmt.format(result.reconciledArs)}) no cuadran con el total del resumen. Revisá
          los movimientos.
        </p>
      )}
      <Link href="/gastos" className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover">
        Ver el resumen de gastos →
      </Link>
    </div>
  );
}
