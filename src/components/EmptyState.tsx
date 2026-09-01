import Link from "next/link";

/** Shared empty/zero-result placeholder, so every list fails the same way. */
export function EmptyState({
  emoji,
  title,
  hint,
  action,
}: {
  emoji: string;
  title: string;
  hint?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-3xl">{emoji}</div>
      <div>
        <p className="font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
        {hint && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{hint}</p>}
      </div>
      {action && (
        <Link href={action.href} className="btn-accent px-6">
          {action.label}
        </Link>
      )}
    </div>
  );
}
