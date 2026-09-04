/**
 * The "there's more behind this" affordance: a chevron inside a ring.
 *
 * A bare "›" beside text doesn't register as tappable — the ring is what makes
 * the row read as a control. Used on every row that drills into a detail page,
 * so the gesture looks the same across both sections.
 */
export function ChevronBadge({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 dark:border-neutral-600 dark:text-neutral-400 ${className}`}
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
        <path
          d="M7.5 4.5l6 5.5-6 5.5"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
