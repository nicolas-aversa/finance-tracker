import Link from "next/link";

export type Chip = { key: string; label: string; href: string };

/**
 * One removable chip per active filter, shared by both sections. Each chip is
 * a plain link that rebuilds the URL without that single filter, so the rest
 * of the selection survives; the caller decides what those URLs are.
 */
export function ActiveChips({ chips, clearAllHref }: { chips: Chip[]; clearAllHref: string }) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          className="group inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:border-accent"
          aria-label={`Quitar filtro ${chip.label}`}
        >
          <span className="max-w-[10rem] truncate">{chip.label}</span>
          <span aria-hidden className="text-accent/60 group-hover:text-accent">✕</span>
        </Link>
      ))}
      {chips.length > 1 && (
        <Link
          href={clearAllHref}
          scroll={false}
          className="px-1.5 py-1 text-xs text-neutral-400 underline-offset-2 hover:text-accent hover:underline dark:text-neutral-500"
        >
          limpiar todo
        </Link>
      )}
    </div>
  );
}
