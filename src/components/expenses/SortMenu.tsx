import Link from "next/link";
import { buildHref, type ExpenseFilters, type SortDir, type SortKey } from "@/lib/expenses/filters";

const OPTIONS: { key: SortKey; dir: SortDir; label: string }[] = [
  { key: "fecha", dir: "desc", label: "Más reciente" },
  { key: "fecha", dir: "asc", label: "Más antiguo" },
  { key: "monto", dir: "desc", label: "Mayor monto" },
  { key: "monto", dir: "asc", label: "Menor monto" },
];

function currentLabel(f: ExpenseFilters): string {
  return OPTIONS.find((o) => o.key === f.sort && o.dir === f.dir)?.label ?? OPTIONS[0].label;
}

/**
 * Sort as a dropdown, so the visible row above stays reserved for the filters.
 * A <details> rather than a <select>: options are links that apply on tap,
 * which keeps the page server-driven with no submit and no client state.
 */
export function SortMenu({ basePath, filters }: { basePath: string; filters: ExpenseFilters }) {
  return (
    <details className="relative min-w-0 flex-1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
        <span className="truncate">{currentLabel(filters)}</span>
        <span aria-hidden className="text-neutral-400">▾</span>
      </summary>

      <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        {OPTIONS.map((o) => {
          const on = o.key === filters.sort && o.dir === filters.dir;
          return (
            <Link
              key={`${o.key}-${o.dir}`}
              href={buildHref(basePath, filters, { sort: o.key, dir: o.dir })}
              scroll={false}
              aria-current={on ? "true" : undefined}
              className={`block px-4 py-2.5 text-sm transition-colors ${
                on
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {o.label}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
