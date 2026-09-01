import Link from "next/link";

export function PageHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={backHref}
        aria-label="Volver"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-accent hover:text-accent dark:border-neutral-800 dark:text-neutral-400"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path
            d="M12.5 4.5L6.5 10l6 5.5"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h1>
    </div>
  );
}
