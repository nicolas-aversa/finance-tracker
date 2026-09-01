import Link from "next/link";
import { EXPENSE_SOURCES, type ExpenseSource } from "@/lib/db/schema";
import { SOURCE_LABEL } from "@/lib/expenses/labels";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  buildHref,
  clearedFilters,
  type ExpenseFilters,
} from "@/lib/expenses/filters";

const FIELD =
  "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-accent focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100";
const LABEL = "text-xs font-medium text-neutral-500 dark:text-neutral-400";

function Check({
  name,
  value,
  label,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700 has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent dark:border-neutral-700 dark:text-neutral-300">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="h-3 w-3 accent-accent" />
      <span className="truncate">{label}</span>
    </label>
  );
}

/**
 * Filter panel: a GET form whose fields ARE the query string, so submitting it
 * produces a complete, shareable URL with no client-side state. The search box
 * stays visible; the rest lives in a <details> that needs no JS to open.
 *
 * The form carries every filter — including `mes` and the sort, as hidden
 * inputs — because a GET submit replaces the whole query string.
 */
export function FilterBar({
  basePath,
  filters,
  categories,
}: {
  basePath: string;
  filters: ExpenseFilters;
  categories: string[];
}) {
  const count = activeFilterCount(filters);

  return (
    <form method="GET" action={basePath} className="flex flex-col gap-2">
      {filters.month && <input type="hidden" name="mes" value={filters.month} />}
      {filters.sort !== DEFAULT_FILTERS.sort && <input type="hidden" name="orden" value={filters.sort} />}
      {filters.dir !== DEFAULT_FILTERS.dir && <input type="hidden" name="dir" value={filters.dir} />}

      <div className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={filters.query}
          placeholder="Buscar comercio o descripción…"
          aria-label="Buscar"
          className={FIELD}
        />
        <button type="submit" className="btn-accent shrink-0 px-4" aria-label="Aplicar búsqueda">
          Buscar
        </button>
      </div>

      <details open={count > 0} className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <span>
            Filtros
            {count > 0 && (
              <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                {count}
              </span>
            )}
          </span>
          <span aria-hidden className="text-neutral-400">▾</span>
        </summary>

        <div className="flex flex-col gap-4 border-t border-neutral-200 px-4 py-4 dark:border-neutral-800">
          {categories.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className={LABEL}>Categoría</span>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <Check key={c} name="cat" value={c} label={c} checked={filters.categories.includes(c)} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>Tarjeta</span>
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_SOURCES.map((s: ExpenseSource) => (
                <Check key={s} name="tarjeta" value={s} label={SOURCE_LABEL[s]} checked={filters.sources.includes(s)} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Desde</span>
              <input type="date" name="desde" defaultValue={filters.from ?? ""} className={FIELD} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Hasta</span>
              <input type="date" name="hasta" defaultValue={filters.to ?? ""} className={FIELD} />
            </label>
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

          <Check name="cuotas" value="1" label="Solo compras en cuotas" checked={filters.installmentsOnly} />

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
