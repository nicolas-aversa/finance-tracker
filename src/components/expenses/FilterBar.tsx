import Link from "next/link";
import {
  DEFAULT_FILTERS,
  buildHref,
  clearedFilters,
  type ExpenseFilters,
} from "@/lib/expenses/filters";

const FIELD =
  "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-accent focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100";
// Tighter horizontal padding than FIELD: a date input also has to fit the
// browser's picker icon, and px-3 pushed the year out of view on small phones.
const DATE_FIELD = FIELD.replace("px-3", "px-2");
const LABEL = "text-xs font-medium text-neutral-500 dark:text-neutral-400";

/** How many of the fields THIS panel owns are set — categories and cards have their own pills. */
function panelCount(f: ExpenseFilters): number {
  return [f.from !== null, f.to !== null, f.minArs !== null, f.maxArs !== null, f.installmentsOnly].filter(
    Boolean
  ).length;
}

/**
 * The filters that can't be a pill: date range, amount range and the
 * installments toggle. A GET form whose fields ARE the query string, so
 * submitting produces a complete, shareable URL with no client state.
 */
export function FilterBar({ basePath, filters }: { basePath: string; filters: ExpenseFilters }) {
  const count = panelCount(filters);

  return (
    <form method="GET" action={basePath} className="min-w-0 flex-1">
      {/* Everything this panel doesn't render still has to survive the submit. */}
      {filters.month && <input type="hidden" name="mes" value={filters.month} />}
      {filters.categories.map((c) => (
        <input key={c} type="hidden" name="cat" value={c} />
      ))}
      {filters.sources.map((s) => (
        <input key={s} type="hidden" name="tarjeta" value={s} />
      ))}
      {filters.sort !== DEFAULT_FILTERS.sort && <input type="hidden" name="orden" value={filters.sort} />}
      {filters.dir !== DEFAULT_FILTERS.dir && <input type="hidden" name="dir" value={filters.dir} />}

      {/* Same pill as the Categoría / Tarjeta dropdowns, so the four controls
          read as one set. The panel is absolutely positioned and spans both
          columns of its row — the form is far too wide for half a row. */}
      <details open={count > 0} className="relative">
        <summary
          className={`flex cursor-pointer list-none items-center justify-between gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            count > 0
              ? "border-accent bg-accent-soft text-accent"
              : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
          }`}
        >
          <span className="truncate">
            Fechas y montos
            {count > 0 && <span className="ml-1 font-semibold">({count})</span>}
          </span>
          <span aria-hidden className={count > 0 ? "text-accent" : "text-neutral-400"}>▾</span>
        </summary>

        <div className="absolute left-0 z-20 mt-1 flex w-[calc(200%+0.5rem)] flex-col gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {/* Date inputs have a wide intrinsic width (the value plus the picker
              icon): side by side under ~360px they clip the year, so they stack. */}
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Desde</span>
              <input type="date" name="desde" defaultValue={filters.from ?? ""} className={DATE_FIELD} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Hasta</span>
              <input type="date" name="hasta" defaultValue={filters.to ?? ""} className={DATE_FIELD} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Monto mínimo</span>
              <input
                type="number"
                name="min"
                inputMode="decimal"
                step="any"
                placeholder="$"
                defaultValue={filters.minArs ?? ""}
                className={FIELD}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Monto máximo</span>
              <input
                type="number"
                name="max"
                inputMode="decimal"
                step="any"
                placeholder="$"
                defaultValue={filters.maxArs ?? ""}
                className={FIELD}
              />
            </label>
          </div>
          <p className="-mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
            Los montos se comparan en pesos; los consumos en dólares se convierten al CCL.
          </p>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700 has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent dark:border-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              name="cuotas"
              value="1"
              defaultChecked={filters.installmentsOnly}
              className="h-3 w-3 accent-accent"
            />
            <span>Solo compras en cuotas</span>
          </label>

          <div className="flex items-center gap-2">
            <button type="submit" className="btn-accent flex-1">
              Aplicar
            </button>
            {count > 0 && (
              <Link
                href={buildHref(basePath, clearedFilters(filters))}
                scroll={false}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800 dark:border-neutral-700 dark:text-neutral-400"
              >
                Limpiar
              </Link>
            )}
          </div>
        </div>
      </details>
    </form>
  );
}
