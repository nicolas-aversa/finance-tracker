import Link from "next/link";
import { buildHref, type ExpenseFilters, type SortKey } from "@/lib/expenses/filters";

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "fecha", label: "Fecha" },
  { key: "monto", label: "Monto" },
  { key: "comercio", label: "Comercio" },
  { key: "categoria", label: "Categoría" },
];

/**
 * Sort pills. Clicking the active key flips the direction, clicking another
 * switches key and resets to descending — the convention every table uses.
 * Links rather than a <select> so sorting applies without submitting the form.
 */
export function SortControl({ basePath, filters }: { basePath: string; filters: ExpenseFilters }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto px-1">
      <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">Ordenar</span>
      {OPTIONS.map((o) => {
        const isActive = filters.sort === o.key;
        const nextDir = isActive && filters.dir === "desc" ? "asc" : "desc";
        return (
          <Link
            key={o.key}
            href={buildHref(basePath, filters, { sort: o.key, dir: isActive ? nextDir : "desc" })}
            scroll={false}
            aria-current={isActive ? "true" : undefined}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {o.label}
            {isActive && <span aria-hidden className="ml-1">{filters.dir === "desc" ? "↓" : "↑"}</span>}
          </Link>
        );
      })}
    </div>
  );
}
