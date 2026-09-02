const usdFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("es-AR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdSignedFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const percentSignedFormatter = new Intl.NumberFormat("es-AR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const usdCompactFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const qtyFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 });

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return usdFormatter.format(value);
}

export function formatArs(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return arsFormatter.format(value);
}

export function formatUsdCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return usdCompactFormatter.format(value);
}

const arsShortFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 0 });

/**
 * Short ARS for chart labels, where the full "$ 1.398.743,75" never fits above
 * a column: "$1,4M" / "$88k" / "$950".
 */
export function formatArsShort(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${arsShortFormatter.format(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${arsShortFormatter.format(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return percentFormatter.format(value);
}

export function formatUsdSigned(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return usdSignedFormatter.format(value);
}

export function formatPercentSigned(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return percentSignedFormatter.format(value);
}

export function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return qtyFormatter.format(value);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
