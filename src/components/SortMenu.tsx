import Link from "next/link";

export type SortOption = { label: string; href: string; active: boolean };

/**
 * Sort as a dropdown, so the visible row stays reserved for the filters.
 * Like FilterDropdown it takes ready-made links and knows nothing about what
 * is being sorted, and anchors its menu to the `relative` control row.
 */
export function SortMenu({ options }: { options: SortOption[] }) {
  const current = options.find((o) => o.active) ?? options[0];

  return (
    <details className="min-w-0 flex-1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
        <span className="truncate">{current.label}</span>
        <span aria-hidden className="text-neutral-400">▾</span>
      </summary>

      <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        {options.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            scroll={false}
            aria-current={o.active ? "true" : undefined}
            className={`block px-4 py-2.5 text-sm transition-colors ${
              o.active
                ? "bg-accent-soft font-medium text-accent"
                : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
