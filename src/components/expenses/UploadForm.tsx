"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { uploadStatements, type UploadOutcome, type UploadState } from "@/app/(app)/gastos/subir/actions";
import { SOURCE_LABEL } from "@/lib/expenses/labels";
import { formatDate } from "@/lib/format";
import type { ExpenseSource } from "@/lib/db/schema";

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export function UploadForm() {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(uploadStatements, undefined);
  const [fileNames, setFileNames] = useState<string[]>([]);

  const results = state && "results" in state ? state.results : [];
  const imported = results.filter((r): r is Extract<UploadOutcome, { ok: unknown }> => "ok" in r);
  const failed = results.filter((r): r is Extract<UploadOutcome, { error: string }> => "error" in r);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Subí los PDF de los resúmenes de MercadoPago, Visa Galicia, Amex Galicia o Naranja. Podés elegir varios
            de una vez.
          </p>
          <label className="btn-accent mt-4 inline-block cursor-pointer px-5">
            Elegir PDF
            <input
              type="file"
              name="file"
              accept="application/pdf"
              multiple
              required
              className="hidden"
              onChange={(e) => setFileNames(Array.from(e.target.files ?? []).map((f) => f.name))}
            />
          </label>
          {fileNames.length > 0 && (
            <ul className="mt-3 flex flex-col gap-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {fileNames.map((n) => (
                <li key={n} className="truncate">
                  {n}
                </li>
              ))}
            </ul>
          )}
        </div>

        {state && "error" in state && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-accent w-full">
          {pending
            ? fileNames.length > 1
              ? `Procesando ${fileNames.length} resúmenes...`
              : "Procesando..."
            : fileNames.length > 1
              ? `Procesar ${fileNames.length} resúmenes`
              : "Procesar resumen"}
        </button>
      </form>

      {failed.map((f) => (
        <p
          key={f.fileName}
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        >
          <span className="font-medium">{f.fileName}</span>: {f.error}
        </p>
      ))}

      {imported.map((r) => (
        <ImportSummary key={r.fileName} fileName={r.fileName} result={r.ok} />
      ))}

      {imported.length > 0 && (
        <Link href="/gastos" className="text-center text-sm font-medium text-accent hover:text-accent-hover">
          Ver el resumen de gastos →
        </Link>
      )}
    </div>
  );
}

function ImportSummary({
  fileName,
  result,
}: {
  fileName: string;
  result: Extract<UploadOutcome, { ok: unknown }>["ok"];
}) {
  const source = result.source as ExpenseSource;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{SOURCE_LABEL[source]}</span>
        {result.replaced && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            reemplazó el período
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-neutral-400 dark:text-neutral-500">{fileName}</p>
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
    </div>
  );
}
