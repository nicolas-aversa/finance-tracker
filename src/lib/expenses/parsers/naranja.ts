import type { ExpenseKind, ParsedMovement, ParsedStatement } from "../types";
import { groupIntoRows, type PageText, type TextItem } from "./page-text";
import { parseArsNumber, parseDmyDate, parseInstallment } from "./shared";

// Column x-position buckets for the Naranja "Detalle de consumos" table.
const X = { dateMax: 100, descMin: 185, descMax: 410, cuotaMin: 410, cuotaMax: 465, arsMin: 465, arsMax: 528, usdMin: 530, usdMax: 570 };

function flatten(pages: PageText[]): string {
  return pages.map((p) => p.items.map((it) => it.str).join(" ")).join(" ");
}

function amountAt(row: TextItem[], min: number, max: number): TextItem | undefined {
  return row.find((it) => it.x >= min && it.x < max && /\d,\d/.test(it.str));
}

function merchantOf(row: TextItem[]): string {
  return row
    .filter((it) => it.x >= X.descMin && it.x < X.descMax)
    .map((it) => it.str.trim())
    .filter((s) => {
      const up = s.toUpperCase();
      return s && up !== "USA" && up !== "USD" && !/^[\d.,-]+$/.test(s);
    })
    .join(" ")
    .trim();
}

function kindOf(desc: string): ExpenseKind {
  const d = desc.toUpperCase();
  if (d.includes("PLAN TURBO") || d.includes("MANTENIMIENTO") || d.includes("COSTO DE MANT")) return "fee";
  if (d.startsWith("DEV") || d.includes("DEVOL") || d.includes("REINTEGRO") || d.includes("REEMBOLSO")) return "refund";
  if (d.includes("IVA") || d.includes("SELLOS") || d.includes("IMPUEST") || d.includes("PERCEP")) return "tax";
  return "purchase";
}

function taxName(label: string): string {
  const u = label.toUpperCase();
  if (u.includes("IVA")) return "IVA";
  if (u.includes("SELLOS")) return "Impuesto de Sellos";
  if (u.includes("PERCEP")) return "Percepción";
  return "Impuestos";
}

export function parseNaranja(pages: PageText[]): ParsedStatement {
  const text = flatten(pages).replace(/\s+/g, " ");

  // Header amounts/dates from the cover text.
  const totalMatch = text.match(/tu total a pagar es\s*\$?\s*([\d.,]+)(?:\s*\+\s*u\$s\s*([\d.,]+))?/i);
  const statementTotalArs = totalMatch ? parseArsNumber(totalMatch[1]) : null;
  const statementTotalUsd = totalMatch && totalMatch[2] ? parseArsNumber(totalMatch[2]) : null;

  const dueMatch = text.match(/vence el\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  const dueDate = dueMatch ? parseDmyDate(dueMatch[1]) : null;

  const closeMatch = text.match(/resumen actual cerr[oó] el\s*(\d{1,2})\/(\d{1,2})/i);
  let statementPeriod = dueDate ?? new Date().toISOString().slice(0, 10);
  if (closeMatch && dueDate) {
    const dueYear = Number(dueDate.slice(0, 4));
    const closeMonth = Number(closeMatch[2]);
    const dueMonth = Number(dueDate.slice(5, 7));
    const closeYear = closeMonth > dueMonth ? dueYear - 1 : dueYear;
    statementPeriod = `${closeYear}-${closeMatch[2].padStart(2, "0")}-${closeMatch[1].padStart(2, "0")}`;
  }

  const movements: ParsedMovement[] = [];

  for (const pageRows of pages.map((p) => groupIntoRows(p))) {
    // Only the real consumos table (its header has a CUOTA column). This
    // excludes the "Pago del resumen anterior" table and legal-text pages,
    // which share a FECHA/DETALLE header but have no CUOTA column.
    const headerIdx = pageRows.findIndex((r) => {
      const j = r.map((it) => it.str).join(" ").toUpperCase();
      return j.includes("FECHA") && j.includes("DETALLE") && j.includes("CUOTA");
    });
    if (headerIdx === -1) continue;
    const totalIdx = pageRows.findIndex(
      (r, i) => i > headerIdx && r[0]?.x < 100 && /^total$/i.test(r[0].str.trim())
    );
    const end = totalIdx === -1 ? pageRows.length : totalIdx;

    let pendingTax: string | null = null;
    for (let i = headerIdx + 1; i < end; i++) {
      const row = pageRows[i];
      const first = row[0];
      const date = first && first.x < X.dateMax ? parseDmyDate(first.str.slice(0, 8)) : null;

      if (date) {
        collectConsumo(row, movements);
        continue;
      }

      // "Otros cargos" (IVA / Sellos): label may sit one row above its amount.
      const label = row
        .filter((it) => it.x < X.arsMin)
        .map((it) => it.str)
        .join(" ")
        .trim();
      if (/IVA|SELLOS|IMPUEST|PERCEP/i.test(label)) pendingTax = label;

      const arsTok = amountAt(row, X.arsMin, X.arsMax);
      if (arsTok) {
        const name = /IVA|SELLOS|IMPUEST|PERCEP/i.test(label) ? label : pendingTax;
        const amount = parseArsNumber(arsTok.str);
        if (name && amount !== 0) {
          movements.push({
            date: statementPeriod,
            description: taxName(name),
            merchant: taxName(name),
            amount,
            currency: "ARS",
            installmentCurrent: null,
            installmentTotal: null,
            kind: "tax",
          });
          pendingTax = null;
        }
      }
    }
  }

  return {
    source: "naranja",
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

function collectConsumo(row: TextItem[], out: ParsedMovement[]): void {
  const first = row[0];
  if (!first || first.x >= X.dateMax) return;
  const date = parseDmyDate(first.str.slice(0, 8));
  if (!date) return;

  const merchant = merchantOf(row);
  if (!merchant) return;

  const usdTok = amountAt(row, X.usdMin, X.usdMax);
  const arsTok = amountAt(row, X.arsMin, X.arsMax);
  const amountTok = usdTok ?? arsTok;
  if (!amountTok) return;
  const amount = parseArsNumber(amountTok.str);
  if (Number.isNaN(amount)) return;

  const cuotaTok = row.find((it) => it.x >= X.cuotaMin && it.x < X.cuotaMax && /^\d{2}\/\d{2}$/.test(it.str));
  const cuota = cuotaTok ? parseInstallment(cuotaTok.str) : null;

  out.push({
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
