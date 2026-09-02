import Link from "next/link";
import { buildHref, type ExpenseFilters } from "@/lib/expenses/filters";

export type PillOption = { value: string; label: string };

/**
 * A scrollable row of toggle pills for one multi-select filter. Each pill is a
 * link that adds or removes its own value, so filtering applies on tap with no
 * client state and no submit step.
 */
export function FilterPills({
  basePath,
  filters,
  options,
  selected,
  allLabel,
  patchFor,
  label,
}: {
  basePath: string;
  filters: ExpenseFilters;
  options: PillOption[];
  selected: string[];
  /** Pill shown first, clearing the whole dimension. */
  allLabel: string;
  /** Turns a next selection into the filter patch to apply. */
  patchFor: (next: string[]) => Partial<ExpenseFilters>;
  label: string;
}) {
  if (options.length === 0) return null;
  const isAll = selected.length === 0;

  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4" role="group" aria-label={label}>
      <div className="flex w-max gap-1.5">
        <Link
          href={buildHref(basePath, filters, patchFor([]))}
          scroll={false}
          aria-current={isAll ? "true" : undefined}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            isAll
              ? "border-accent bg-accent text-accent-foreground"
              : "border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
          }`}
        >
          {allLabel}
        </Link>

        {options.map((o) => {
          const on = selected.includes(o.value);
          const next = on ? selected.filter((v) => v !== o.value) : [...selected, o.value];
          return (
            <Link
              key={o.value}
              href={buildHref(basePath, filters, patchFor(next))}
              scroll={false}
              aria-pressed={on}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                on
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              {o.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
