import type { ExpenseKind, ParsedMovement, ParsedStatement } from "../types";
import { groupIntoRows, type PageText, type TextItem } from "./page-text";
import { parseArsNumber, parseBarcodeDate, parseDmyDate, parseInstallment, parseSpanishAbbrevDate } from "./shared";

// Column x-position buckets shared by Galicia Visa and Amex statements.
const X = {
  dateMax: 45,
  descMin: 80,
  descMax: 300,
  cuotaMin: 300,
  cuotaMax: 348,
  arsMin: 435,
  arsMax: 500,
  usdMin: 530,
  usdMax: 585,
};

type Src = "visa_galicia" | "amex_galicia";

function textAt(row: TextItem[], xMin: number, xMax: number): TextItem[] {
  return row.filter((it) => it.x >= xMin && it.x < xMax);
}

function kindOf(desc: string): ExpenseKind {
  const d = desc.toUpperCase();
  if (d.includes("SU PAGO") || d.includes("PAGO EN PESOS") || d.includes("PAGO EN USD")) return "payment";
  if (d.startsWith("DEV") || d.includes("DEVOL") || d.includes("REINTEGRO") || d.includes("REEMBOLSO")) return "refund";
  if (
    d.includes("IVA") ||
    d.includes("IMPUEST") ||
    d.includes("PERCEP") ||
    d.includes("IIBB") ||
    d.includes("SELLAD") ||
    /\bRG\b/.test(d) ||
    /\bLEY\b/.test(d) ||
    d.includes("INTERES") ||
    d.includes("CARGO FINANC")
  )
    return "tax";
  return "purchase";
}

/**
 * Merchant name = text tokens in the description column, minus the bare "USD"
 * marker and bare amounts. (Do NOT drop tokens merely *containing* "USD" — that
 * would wipe legit descriptions like "SU PAGO EN USD" or ref codes ending in USD,
 * discarding the whole movement.)
 */
function merchantOf(row: TextItem[]): string {
  return textAt(row, X.descMin, X.descMax)
    .map((it) => it.str.trim())
    .filter((s) => {
      const up = s.toUpperCase();
      return s && s !== "*" && up !== "USD" && up !== "U$S" && !/^[\d.,-]+$/.test(s);
    })
    .join(" ")
    .trim();
}

export function parseGalicia(pages: PageText[], source: Src): ParsedStatement {
  const rowsByPage = pages.map((p) => groupIntoRows(p));
  const page1 = rowsByPage[0] ?? [];

  // ── Header ────────────────────────────────────────────────────────────────
  // Close date from the barcode (yyyymmdd…) found on any page.
  let statementPeriod: string | null = null;
  for (const rows of rowsByPage) {
    for (const row of rows) {
      const joined = row.map((it) => it.str).join("");
      const m = joined.match(/\b(\d{8}\d{6,})[A-Z]?\b/);
      if (m) {
        const d = parseBarcodeDate(m[1]);
        if (d) statementPeriod = d;
      }
    }
    if (statementPeriod) break;
  }

  // Cycle dates row: 6 "dd-Mmm-yy" tokens; due date is the 4th.
  let dueDate: string | null = null;
  for (const row of page1) {
    const dates = row.map((it) => it.str.trim()).filter((s) => /^\d{2}-[A-Za-z]{3}-\d{2}$/.test(s));
    if (dates.length >= 4) {
      dueDate = parseSpanishAbbrevDate(dates[3]);
      if (!statementPeriod) statementPeriod = parseSpanishAbbrevDate(dates[2]);
      break;
    }
  }

  // Totals: the two big numbers high on page 1 at the far left (ARS above USD).
  const totalTokens = page1
    .flatMap((row) => row)
    .filter((it) => it.x < 130 && it.y > 535 && it.y < 620 && /^[\d.,]+$/.test(it.str.trim()))
    .sort((a, b) => b.y - a.y);
  const statementTotalArs = totalTokens[0] ? parseArsNumber(totalTokens[0].str) : null;
  const statementTotalUsd = totalTokens[1] ? parseArsNumber(totalTokens[1].str) : null;

  // Min payment (en pesos): the far-left "En pesos" label under PAGO MINIMO has
  // its amount on the row just below it (same x column).
  let minPaymentArs: number | null = null;
  const flat1 = page1.flatMap((row) => row);
  const enPesosLabel = flat1.find((it) => it.x < 60 && it.str.trim().toLowerCase() === "en pesos");
  if (enPesosLabel) {
    const amt = flat1.find(
      (it) => it.x < 90 && it.y < enPesosLabel.y && it.y > enPesosLabel.y - 30 && /[\d].*,\d/.test(it.str)
    );
    if (amt) minPaymentArs = parseArsNumber(amt.str);
  }

  // Opening balance (SALDO ANTERIOR).
  let openingBalanceArs = 0;
  let openingBalanceUsd = 0;
  for (const row of page1) {
    if (row.map((it) => it.str).join(" ").toUpperCase().includes("SALDO ANTERIOR")) {
      const ars = textAt(row, X.arsMin, X.arsMax)[0];
      const usd = textAt(row, X.usdMin, X.usdMax)[0];
      if (ars) openingBalanceArs = parseArsNumber(ars.str);
      if (usd) openingBalanceUsd = parseArsNumber(usd.str);
      break;
    }
  }

  // ── Movements ───────────────────────────────────────────────────────────
  const movements: ParsedMovement[] = [];
  for (const rows of rowsByPage) {
    for (const row of rows) {
      const first = row[0];
      if (!first || first.x >= X.dateMax) continue;
      const date = parseDmyDate(first.str);
      if (!date) continue;

      const merchant = merchantOf(row);
      if (!merchant) continue;

      const cuotaTok = textAt(row, X.cuotaMin, X.cuotaMax).find((it) => /^\d{2}\/\d{2}$/.test(it.str));
      const cuota = cuotaTok ? parseInstallment(cuotaTok.str) : null;

      const usdTok = textAt(row, X.usdMin, X.usdMax).find((it) => /[\d],/.test(it.str));
      const arsTok = textAt(row, X.arsMin, X.arsMax).find((it) => /[\d],/.test(it.str));
      const amountTok = usdTok ?? arsTok;
      if (!amountTok) continue;
      const amount = parseArsNumber(amountTok.str);
      if (Number.isNaN(amount)) continue;

      movements.push({
        date,
        description: merchant,
        merchant,
        amount,
        currency: usdTok ? "USD" : "ARS",
        installmentCurrent: cuota?.current ?? null,
        installmentTotal: cuota?.total ?? null,
        kind: kindOf(merchant),
      });
    }
  }

  return {
    source,
    statementPeriod: statementPeriod ?? dueDate ?? new Date().toISOString().slice(0, 10),
    dueDate,
    statementTotalArs,
    statementTotalUsd,
    minPaymentArs,
    openingBalanceArs,
    openingBalanceUsd,
    movements,
  };
}
