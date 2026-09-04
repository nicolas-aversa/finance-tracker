import Link from "next/link";

export type DropdownOption = { value: string; label: string };

/**
 * Multi-select filter as a dropdown, shared by both sections.
 *
 * It knows nothing about what is being filtered: the caller passes `hrefFor`,
 * which turns a next selection into a URL. A <details> holding links rather
 * than a <select> keeps every page server-driven — options apply on tap, with
 * no submit and no client state.
 *
 * The menu is anchored to the *control row*, which must be `relative`: a
 * fixed-width menu hanging off a middle or right column runs off one side or
 * the other on a narrow screen.
 */
export function FilterDropdown({
  options,
  selected,
  label,
  allLabel,
  hrefFor,
}: {
  options: DropdownOption[];
  selected: string[];
  /** Shown on the button when nothing is selected. */
  label: string;
  /** The reset row inside the menu. */
  allLabel: string;
  hrefFor: (next: string[]) => string;
}) {
  if (options.length === 0) return null;

  const summary =
    selected.length === 0
      ? label
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? label)
        : `${label} (${selected.length})`;
  const active = selected.length > 0;

  return (
    <details className="min-w-0 flex-1">
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          active
            ? "border-accent bg-accent-soft text-accent"
            : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
        }`}
      >
        <span className="truncate">{summary}</span>
        <span aria-hidden className={active ? "text-accent" : "text-neutral-400"}>▾</span>
      </summary>

      <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        <Link
          href={hrefFor([])}
          scroll={false}
          className={`block px-4 py-2 text-sm transition-colors ${
            !active
              ? "bg-accent-soft font-medium text-accent"
              : "text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
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
              href={hrefFor(next)}
              scroll={false}
              aria-pressed={on}
              className={`flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors ${
                on
                  ? "font-medium text-accent"
                  : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              <span className="truncate">{o.label}</span>
              {on && <span aria-hidden className="shrink-0">✓</span>}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
