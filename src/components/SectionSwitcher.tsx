"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/", label: "Inversiones", match: (p: string) => !p.startsWith("/gastos") },
  { href: "/gastos", label: "Gastos", match: (p: string) => p.startsWith("/gastos") },
];

export function SectionSwitcher() {
  const pathname = usePathname();
  return (
    <div className="flex w-full gap-1 rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-900">
      {SECTIONS.map((s) => {
        const active = s.match(pathname);
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`flex-1 rounded-xl py-2 text-center text-sm font-medium transition-colors ${
              active
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
