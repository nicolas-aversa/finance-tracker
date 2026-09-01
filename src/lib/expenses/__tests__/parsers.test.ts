import { describe, expect, it } from "vitest";
import { parseGalicia } from "../parsers/galicia";
import { parseMercadoPago } from "../parsers/mercadopago";
import { parseNaranja } from "../parsers/naranja";
import type { PageText, TextItem } from "../parsers/page-text";

// Builds a one-page PageText from [str, x, y] tuples.
function page(items: [string, number, number][]): PageText {
  const t: TextItem[] = items.map(([str, x, y]) => ({ str, x, y, width: str.length * 5 }));
  return { items: t, width: 595, height: 842 };
}

describe("parseGalicia — column extraction, USD, cuotas, reconciliation", () => {
  // Self-consistent synthetic statement:
  // opening ARS 100 + (purchase 50 + tax 5) = 155 ; opening USD 10 + (pago -10 + compra 20) = 20
  const p1 = page([
    ["20260730072462223H", 23, 22], // barcode -> close 2026-07-30
    // cycle dates (due = 4th)
    ["02-Jul-26", 227, 572], ["13-Jul-26", 284, 572], ["30-Jul-26", 340, 572],
    ["07-Ago-26", 397, 572], ["27-Ago-26", 453, 572], ["04-Sep-26", 510, 572],
    ["155,00", 69, 594], // total ARS
    ["20,00", 69, 547], // total USD
    ["PAGO MINIMO", 17, 500],
    ["En pesos", 34, 487],
    ["$ 40,00", 34, 470], // min payment
    // SALDO ANTERIOR
    ["SALDO ANTERIOR", 86, 368], ["100,00", 455, 368], ["10,00", 558, 368],
    // movements
    ["13-07-26", 23, 352], ["SU PAGO EN USD", 86, 352], ["-10,00", 555, 352],
    ["27-06-26", 23, 330], ["*", 74, 330], ["ZARA", 86, 330], ["02/03", 325, 330], ["001", 365, 330], ["50,00", 458, 330],
    ["02-07-26", 23, 300], ["K", 74, 300], ["ANTHROPIC in1TopHBUSD", 86, 300], ["20,00", 239, 300], ["002", 365, 300], ["20,00", 558, 300],
    ["05-07-26", 23, 280], ["IVA RG 5617", 86, 280], ["5,00", 458, 280],
  ]);

  const s = parseGalicia([p1], "visa_galicia");

  it("reads header: period from barcode, due = 4th cycle date, totals, opening", () => {
    expect(s.statementPeriod).toBe("2026-07-30");
    expect(s.dueDate).toBe("2026-08-07");
    expect(s.statementTotalArs).toBeCloseTo(155, 2);
    expect(s.statementTotalUsd).toBeCloseTo(20, 2);
    expect(s.openingBalanceArs).toBeCloseTo(100, 2);
    expect(s.openingBalanceUsd).toBeCloseTo(10, 2);
    expect(s.minPaymentArs).toBeCloseTo(40, 2);
  });

  it("reconciles: opening + Σ movements == printed total (ARS and USD)", () => {
    const ars = s.movements.filter((m) => m.currency === "ARS").reduce((a, m) => a + m.amount, 0);
    const usd = s.movements.filter((m) => m.currency === "USD").reduce((a, m) => a + m.amount, 0);
    expect(s.openingBalanceArs! + ars).toBeCloseTo(155, 2);
    expect(s.openingBalanceUsd! + usd).toBeCloseTo(20, 2);
  });

  it("keeps a USD movement whose description contains 'USD' (regression)", () => {
    const anthropic = s.movements.find((m) => (m.merchant ?? "").includes("ANTHROPIC"));
    expect(anthropic).toBeDefined();
    expect(anthropic!.currency).toBe("USD");
    expect(anthropic!.amount).toBeCloseTo(20, 2);
  });

  it("classifies kinds and parses cuotas", () => {
    const zara = s.movements.find((m) => m.merchant === "ZARA")!;
    expect(zara.currency).toBe("ARS");
    expect(zara.amount).toBeCloseTo(50, 2);
    expect(zara.installmentCurrent).toBe(2);
    expect(zara.installmentTotal).toBe(3);
    expect(zara.kind).toBe("purchase");

    expect(s.movements.find((m) => (m.merchant ?? "").includes("SU PAGO"))!.kind).toBe("payment");
    expect(s.movements.find((m) => (m.merchant ?? "").includes("IVA"))!.kind).toBe("tax");
  });
});

describe("parseMercadoPago — section skipping and year inference", () => {
  const p1 = page([
    ["Este es tu resumen de agosto", 32, 777],
    ["Fecha de cierre", 319, 730], ["1 de agosto", 319, 711],
    ["Fecha de vencimiento", 319, 670], ["6 de agosto", 319, 655],
    ["Total a pagar", 70, 363], ["$ 55,00", 361, 363], ["US$ 0,00", 494, 363],
    // Composición section (must be skipped): prior balance + payment
    ["Composición del saldo del periodo anterior", 50, 300],
    ["1/jul", 40, 280], ["Total a pagar del periodo anterior", 82, 280], ["$ 54.000,00", 429, 280],
    ["6/jul", 40, 260], ["Pago del resumen", 82, 260], ["-$ 54.000,00", 426, 260],
    // Consumos section
    ["Consumos", 50, 230],
    ["3/jul", 40, 210], ["HILLSIDE NEW MEDIA", 82, 210], ["100", 350, 210], ["$ 50,00", 433, 210],
    ["12/jul", 40, 190], ["MERPAGO*NADIA", 82, 190], ["200", 350, 190], ["$ 5,00", 433, 190],
  ]);

  const s = parseMercadoPago([p1]);

  it("skips the prior-period composition section", () => {
    expect(s.movements.every((m) => !(m.merchant ?? "").includes("periodo anterior"))).toBe(true);
    expect(s.movements.every((m) => !(m.merchant ?? "").includes("Pago del resumen"))).toBe(true);
    expect(s.movements).toHaveLength(2); // only the 2 consumos
  });

  it("parses consumos with inferred year and reconciles to the total", () => {
    expect(s.statementTotalArs).toBeCloseTo(55, 2);
    const sum = s.movements.reduce((a, m) => a + m.amount, 0);
    expect(sum).toBeCloseTo(55, 2);
    expect(s.movements[0].date).toMatch(/^\d{4}-07-03$/); // July, inferred year
  });
});

describe("parseNaranja — consumos table, USD, cuotas, IVA", () => {
  // total = 50 + 80 (consumos) + 25 (IVA) = 155 ARS ; 20 USD
  const p1 = page([
    ["Tu total a pagar es", 102, 612],
    ["$155,00 + u$s20,00", 102, 586],
    ["y vence el 10/06/26.", 102, 562],
    ["El resumen actual cerró el 27/05.", 102, 239],
    // consumos header (must include CUOTA)
    ["FECHA", 74, 500], ["TARJETA", 109, 500], ["CUPON", 167, 500], ["DETALLE", 193, 500], ["CUOTA/PLAN", 411, 500], ["$", 500, 500], ["U$S", 545, 500],
    ["04/05/26 NX Virtual", 74, 480], ["1943", 172, 480], ["ZARA", 193, 480], ["01", 441, 480], ["50,00", 486, 480],
    ["05/05/26 NX Master", 74, 464], ["2702", 172, 464], ["NETFLIX", 193, 464], ["03/06", 429, 464], ["80,00", 486, 464],
    ["09/05/26 NX Master", 74, 448], ["426", 176, 448], ["CLAUDE.AI", 193, 448], ["SUBSCRIPTUSA", 233, 448], ["20,00", 547, 448],
    // Otros cargos: IVA label on one row, amount on the next
    ["Otros", 34, 420], ["IVA", 193, 420], ["Operaciones Identificadas con *", 208, 420],
    ["(Base Imponible)", 216, 406], ["25,00", 490, 406],
    ["Total", 74, 351],
  ]);

  const s = parseNaranja([p1]);

  it("reads totals and dates", () => {
    expect(s.statementTotalArs).toBeCloseTo(155, 2);
    expect(s.statementTotalUsd).toBeCloseTo(20, 2);
    expect(s.dueDate).toBe("2026-06-10");
    expect(s.statementPeriod).toBe("2026-05-27");
  });

  it("reconciles: Σ movements == printed total (ARS and USD)", () => {
    const ars = s.movements.filter((m) => m.currency === "ARS").reduce((a, m) => a + m.amount, 0);
    const usd = s.movements.filter((m) => m.currency === "USD").reduce((a, m) => a + m.amount, 0);
    expect(ars).toBeCloseTo(155, 2);
    expect(usd).toBeCloseTo(20, 2);
  });

  it("parses the FECHA+TARJETA merged token, cuotas, USD and the IVA line", () => {
    const netflix = s.movements.find((m) => (m.merchant ?? "").includes("NETFLIX"))!;
    expect(netflix.installmentCurrent).toBe(3);
    expect(netflix.installmentTotal).toBe(6);
    const claude = s.movements.find((m) => (m.merchant ?? "").includes("CLAUDE"))!;
    expect(claude.currency).toBe("USD");
    expect(claude.amount).toBeCloseTo(20, 2);
    const iva = s.movements.find((m) => m.merchant === "IVA")!;
    expect(iva.kind).toBe("tax");
    expect(iva.amount).toBeCloseTo(25, 2);
  });
});
