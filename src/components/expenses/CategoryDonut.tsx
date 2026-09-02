import Link from "next/link";
import { tickerColor } from "@/lib/domain/chart-colors";
import { formatArs } from "@/lib/format";
import type { CategorySlice } from "@/lib/expenses/aggregate";

const CENTER = 100;
const OUTER_R = 80;
const INNER_R = 50;
const GAP = 2 / OUTER_R;
// Part-to-whole stops reading past ~6 wedges; the tail folds into "Otros".
const MAX_SLICES = 6;

function polar(r: number, a: number) {
  return { x: CENTER + r * Math.sin(a), y: CENTER - r * Math.cos(a) };
}
function arc(a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const os = polar(OUTER_R, a0), oe = polar(OUTER_R, a1), ie = polar(INNER_R, a1), is = polar(INNER_R, a0);
  return `M ${os.x} ${os.y} A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${INNER_R} ${INNER_R} 0 ${large} 0 ${is.x} ${is.y} Z`;
}

/**
 * Spend split by category. When `hrefs` maps a category to a URL, its arc and
 * legend row become links into that category's detail — the aggregated
 * "Otros (N)" bucket has no entry, so it stays inert.
 * A plain record, not a callback, so this stays trivially serializable.
 */
export function CategoryDonut({ slices, hrefs }: { slices: CategorySlice[]; hrefs?: Record<string, string> }) {
  const positive = slices.filter((s) => s.amountArs > 0);
  if (positive.length === 0) return null;

  const top = positive.slice(0, MAX_SLICES);
  const rest = positive.slice(MAX_SLICES);
  // "Resto", not "Otros": there is a real category called Otros, and two rows
  // reading "Otros" in the same legend is unreadable.
  const display = rest.length
    ? [...top, { category: `Resto (${rest.length})`, amountArs: rest.reduce((s, r) => s + r.amountArs, 0) }]
    : top;
  const total = display.reduce((s, d) => s + d.amountArs, 0);

  const arcs = display.reduce<{ d: CategorySlice; path: string; color: { light: string; dark: string }; end: number }[]>(
    (out, d, i) => {
      const start = out.length ? out[out.length - 1].end : 0;
      const angle = (d.amountArs / total) * 2 * Math.PI;
      const pad = Math.min(GAP / 2, (angle / 2) * 0.9);
      const path = arc(start + pad, Math.max(start + angle - pad, start + pad));
      out.push({ d, path, color: tickerColor(i), end: start + angle });
      return out;
    },
    []
  );

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Gasto por categoría</h2>
      <div className="relative mx-auto mt-3 w-full max-w-[200px]">
        <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label="Gasto por categoría">
          {arcs.map(({ d, path, color }) => {
            const share = ((d.amountArs / total) * 100).toFixed(0);
            const slice = (
              <path
                d={path}
                className={`viz-fill ${hrefs?.[d.category] ? "cursor-pointer transition-opacity hover:opacity-75" : ""}`}
                style={{
                  // @ts-expect-error custom props
                  "--viz-light": color.light,
                  "--viz-dark": color.dark,
                }}
              >
                <title>
                  {d.category}: {formatArs(d.amountArs)} ({share}%)
                </title>
              </path>
            );
            const href = hrefs?.[d.category];
            return href ? (
              <Link key={d.category} href={href} aria-label={`Ver ${d.category}`}>
                {slice}
              </Link>
            ) : (
              <g key={d.category}>{slice}</g>
            );
          })}
        </svg>
      </div>
      <ul className="mt-4 flex flex-col gap-1">
        {arcs.map(({ d, color }) => {
          const href = hrefs?.[d.category];
          // Two lines: the name gets the full row width, so long categories
          // ("Transporte público") read in full instead of truncating against
          // the amount and the chevron.
          const row = (
            <>
              <span
                className="viz-mark mt-1 h-3 w-3 shrink-0 rounded-full"
                style={{
                  // @ts-expect-error custom props
                  "--viz-light": color.light,
                  "--viz-dark": color.dark,
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">
                  {d.category}
                </span>
                <span className="block text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  {formatArs(d.amountArs)}
                  <span className="text-neutral-400 dark:text-neutral-500">
                    {" · "}
                    {((d.amountArs / total) * 100).toFixed(0)}%
                  </span>
                </span>
              </span>
            </>
          );
          return (
            <li key={d.category}>
              {href ? (
                /* A bordered row with a chevron button reads as tappable on
                   sight; a bare "›" beside plain text did not. */
                <Link
                  href={href}
                  aria-label={`Ver los gastos de ${d.category}`}
                  className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 px-3 py-2 text-sm transition-colors hover:border-accent hover:bg-accent-soft dark:border-neutral-800 dark:bg-neutral-800/40 dark:hover:border-accent"
                >
                  {row}
                  <span
                    aria-hidden
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 dark:border-neutral-600 dark:text-neutral-400"
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
                </Link>
              ) : (
                <span className="flex items-start gap-2 rounded-xl border border-transparent px-3 py-2 text-sm">
                  {row}
                  <span aria-hidden className="w-5 shrink-0" />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
