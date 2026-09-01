"use client";

import Link from "next/link";

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function monthDisplay(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

function monthShort(month: string): string {
  const [, m] = month.split("-");
  const label = MONTH_SHORT[Number(m) - 1] ?? month;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Segmented control: [Resumen] [Mayo] [Junio] … — Resumen (accumulated) first,
 * then billing months oldest→newest. Navigates via ?mes= (resumen = accumulated).
 */
export function PeriodToggle({
  months,
  active,
  basePath = "/gastos",
}: {
  months: string[]; // any order; displayed ascending
  active: string; // a "yyyy-mm" or "resumen"
  basePath?: string;
}) {
  const ordered = [...new Set(months)].sort();
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
            href={`${basePath}?mes=${p.value}`}
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
