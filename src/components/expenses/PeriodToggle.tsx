"use client";

import Link from "next/link";
import { monthShort } from "@/lib/expenses/months";

/**
 * Segmented control: [Resumen] [Ago] [Jul] [Jun] … — Resumen (accumulated)
 * first, then billing months newest→oldest, so the month you look at most is
 * the one closest at hand. Navigates via ?mes= (resumen = accumulated).
 */
export function PeriodToggle({
  months,
  active,
  basePath = "/gastos",
  hrefs,
}: {
  months: string[]; // any order; displayed newest first
  active: string; // a "yyyy-mm" or "resumen"
  basePath?: string;
  /**
   * Precomputed href per pill value ("resumen" | "yyyy-mm"), letting a filtered
   * page keep its other filters when switching month. A plain record rather
   * than a callback because this is a Client Component — functions can't cross
   * the server/client boundary.
   */
  hrefs?: Record<string, string>;
}) {
  const ordered = [...new Set(months)].sort().reverse();
  const pills: { value: string; label: string }[] = [
    { value: "resumen", label: "Resumen" },
    ...ordered.map((m) => ({ value: m, label: monthShort(m) })),
  ];

  return (
    <div className="flex gap-1 overflow-x-auto rounded-full border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
      {pills.map((p) => {
        const isActive = p.value === active;
        return (
          <Link
            key={p.value}
            href={hrefs?.[p.value] ?? `${basePath}?mes=${p.value}`}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
