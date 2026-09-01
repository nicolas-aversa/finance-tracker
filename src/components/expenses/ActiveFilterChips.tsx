import Link from "next/link";
import { SOURCE_LABEL } from "@/lib/expenses/labels";
import { EXPENSE_SOURCES } from "@/lib/db/schema";
import { activeChips, buildHref, clearedFilters, type ExpenseFilters } from "@/lib/expenses/filters";

function isSource(value: string): value is (typeof EXPENSE_SOURCES)[number] {
  return (EXPENSE_SOURCES as readonly string[]).includes(value);
}

/** Card sources are stored as slugs; show the human label in the chip. */
function chipLabel(key: string, label: string): string {
  if (!key.startsWith("src:")) return label;
  return isSource(label) ? SOURCE_LABEL[label] : label;
}

/**
 * One removable chip per active filter. Each is a plain link that rebuilds the
 * URL without that single filter, so the rest of the selection survives.
 */
export function ActiveFilterChips({ basePath, filters }: { basePath: string; filters: ExpenseFilters }) {
  const chips = activeChips(filters);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={buildHref(basePath, filters, chip.clear)}
          scroll={false}
          className="group inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:border-accent"
          aria-label={`Quitar filtro ${chipLabel(chip.key, chip.label)}`}
        >
          <span className="max-w-[10rem] truncate">{chipLabel(chip.key, chip.label)}</span>
          <span aria-hidden className="text-accent/60 group-hover:text-accent">✕</span>
        </Link>
      ))}
      {chips.length > 1 && (
        <Link
          href={buildHref(basePath, clearedFilters(filters))}
          scroll={false}
          className="px-1.5 py-1 text-xs text-neutral-400 underline-offset-2 hover:text-accent hover:underline dark:text-neutral-500"
        >
          limpiar todo
        </Link>
      )}
    </div>
  );
}
