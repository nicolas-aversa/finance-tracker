import type { ExpenseKind, ParsedMovement, ParsedStatement } from "../types";
import { groupIntoRows, type PageText, type TextItem } from "./page-text";
import { parseArsNumber, parseSpanishDayMonth, parseSpanishLongDayMonth, inferYear } from "./shared";

const X = { dateMax: 70, descMin: 78, descMax: 290, arsMin: 415, arsMax: 495, usdMin: 495, usdMax: 545 };

type Section = "consumos" | "impuestos" | "ajustes" | "skip";

function sectionKind(section: Section): ExpenseKind {
  if (section === "impuestos") return "tax";
  if (section === "ajustes") return "refund";
  return "purchase";
}

function classifySection(text: string): Section | null {
  const t = text.toLowerCase();
  if (t.startsWith("composición del saldo") || t.startsWith("pagos anticipados")) return "skip";
  if (t.startsWith("impuestos e intereses")) return "impuestos";
  if (t.startsWith("ajustes y reembolsos")) return "ajustes";
  if (t === "consumos" || t.startsWith("con tarjeta")) return "consumos";
  return null;
}

function merchantOf(row: TextItem[]): string {
  return row
    .filter((it) => it.x >= X.descMin && it.x < X.descMax)
    .map((it) => it.str.trim())
    .filter((s) => s && !/^[\d.,$-]+$/.test(s))
    .join(" ")
    .trim();
}

export function parseMercadoPago(pages: PageText[]): ParsedStatement {
  const rowsByPage = pages.map((p) => groupIntoRows(p));
  const page1 = rowsByPage[0] ?? [];

  const joinedRow = (row: TextItem[]) => row.map((it) => it.str).join(" ").trim();

  // Close / due dates: values printed under their labels (e.g. "1 de agosto").
  const longDates = page1
    .flatMap((row) => row)
    .filter((it) => parseSpanishLongDayMonth(it.str))
    .sort((a, b) => b.y - a.y);
  const closeDM = longDates[0] ? parseSpanishLongDayMonth(longDates[0].str) : null;
  const dueDM = longDates[1] ? parseSpanishLongDayMonth(longDates[1].str) : null;
  const closeYear = closeDM ? inferYear(closeDM.month) : new Date().getFullYear();
  const iso = (dm: { day: number; month: number } | null, year: number) =>
    dm ? `${year}-${String(dm.month).padStart(2, "0")}-${String(dm.day).padStart(2, "0")}` : null;
  const statementPeriod = iso(closeDM, closeYear) ?? new Date().toISOString().slice(0, 10);
  const dueDate = iso(dueDM, closeYear);

  // Consolidated total row: has "Total a pagar" and a "US$" token.
  let statementTotalArs: number | null = null;
  let statementTotalUsd: number | null = null;
  for (const row of page1) {
    const text = joinedRow(row).toUpperCase();
    if (text.includes("TOTAL A PAGAR") && text.includes("US$")) {
      const ars = row.find((it) => it.x > 300 && it.x < 460 && /[\d],/.test(it.str));
      const usd = row.find((it) => it.x > 460 && /[\d],/.test(it.str));
      if (ars) statementTotalArs = parseArsNumber(ars.str);
      if (usd) statementTotalUsd = parseArsNumber(usd.str);
      break;
    }
  }

  // ── Movements (section-aware) ───────────────────────────────────────────
  const movements: ParsedMovement[] = [];
  let section: Section = "skip";

  for (const rows of rowsByPage) {
    for (const row of rows) {
      const dateTok = row[0];
      const dm = dateTok && dateTok.x < X.dateMax ? parseSpanishDayMonth(dateTok.str) : null;

      if (!dm) {
        const s = classifySection(joinedRow(row));
        if (s) section = s;
        continue;
      }
      if (section === "skip") continue;

      const merchant = merchantOf(row);
      if (!merchant) continue;

      const usd = row.find((it) => it.x >= X.usdMin && it.x < X.usdMax && /[\d],/.test(it.str));
      const ars = row.find((it) => it.x >= X.arsMin && it.x < X.arsMax && /[\d],/.test(it.str));
      const amountTok = usd ?? ars;
      if (!amountTok) continue;
      const amount = parseArsNumber(amountTok.str);
      if (Number.isNaN(amount)) continue;

      const year = dm.month > (closeDM?.month ?? 12) ? closeYear - 1 : closeYear;
      movements.push({
        date: `${year}-${String(dm.month).padStart(2, "0")}-${String(dm.day).padStart(2, "0")}`,
        description: merchant,
        merchant,
        amount,
        currency: usd ? "USD" : "ARS",
        installmentCurrent: null,
        installmentTotal: null,
        kind: sectionKind(section),
      });
    }
  }

  return {
    source: "mercadopago",
    statementPeriod,
    dueDate,
    statementTotalArs,
    statementTotalUsd,
    minPaymentArs: null,
    openingBalanceArs: 0,
    openingBalanceUsd: 0,
    movements,
  };
}
