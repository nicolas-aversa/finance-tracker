"use client";

import { useState } from "react";
import { formatArs } from "@/lib/format";
import { monthDisplay } from "./PeriodToggle";
import type { MonthStack } from "@/lib/expenses/aggregate";

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function monthLabel(month: string): string {
  const [, m] = month.split("-");
  return MONTH_LABELS[Number(m) - 1] ?? month;
}

/**
 * Stacked "Gasto por mes": each bar is split into the categories that compose
 * that month's spend (stable colors across months). Hovering/tapping a bar
 * shows its category breakdown below, so months are comparable by category.
 */
export function MonthlyCategoryBars({ stacks }: { stacks: MonthStack[] }) {
  const recent = stacks.slice(-8);
  const [active, setActive] = useState<string | null>(recent.length ? recent[recent.length - 1].month : null);
  if (recent.length < 2) return null;

  const maxTotal = Math.max(...recent.map((s) => s.total), 1);
  const activeStack = recent.find((s) => s.month === active) ?? recent[recent.length - 1];

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Gasto por mes</h2>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">tocá una barra</span>
      </div>

      <div className="mt-4 flex h-40 items-stretch justify-between gap-2">
        {recent.map((s) => {
          const barPct = (s.total / maxTotal) * 100;
          const isActive = s.month === activeStack.month;
          return (
            <button
              key={s.month}
              type="button"
              onPointerEnter={() => setActive(s.month)}
              onClick={() => setActive(s.month)}
              className="flex flex-1 cursor-pointer flex-col items-center gap-1"
              aria-label={`${monthDisplay(s.month)}: ${formatArs(s.total)}`}
            >
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`flex w-full flex-col-reverse overflow-hidden rounded-t-[4px] transition-opacity ${isActive ? "" : "opacity-45"}`}
                  style={{ height: `${Math.max(2, barPct)}%` }}
                >
                  {s.segments.map((seg) => (
                    <div
                      key={seg.category}
                      className="viz-mark w-full"
                      style={
                        {
                          height: `${(seg.amountArs / s.total) * 100}%`,
                          "--viz-light": seg.light,
                          "--viz-dark": seg.dark,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
              </div>
              <span
                className={`text-[10px] ${
                  isActive ? "font-semibold text-neutral-700 dark:text-neutral-300" : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {monthLabel(s.month)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{monthDisplay(activeStack.month)}</span>
          <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{formatArs(activeStack.total)}</span>
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {activeStack.segments.map((seg) => (
            <li key={seg.category} className="flex items-center gap-2 text-sm">
              <span
                className="viz-mark h-3 w-3 shrink-0 rounded-full"
                style={{ "--viz-light": seg.light, "--viz-dark": seg.dark } as React.CSSProperties}
              />
              <span className="flex-1 truncate text-neutral-700 dark:text-neutral-300">{seg.category}</span>
              <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{formatArs(seg.amountArs)}</span>
              <span className="w-9 text-right tabular-nums text-neutral-400 dark:text-neutral-500">
                {Math.round((seg.amountArs / activeStack.total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
