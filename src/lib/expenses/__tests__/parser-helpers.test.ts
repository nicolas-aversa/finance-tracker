import { describe, expect, it } from "vitest";
import { parseArsNumber, parseDmyDate, parseInstallment } from "../parsers/shared";
import { detectIssuer } from "../parsers/detect-issuer";

describe("parseArsNumber", () => {
  it("parses Argentine thousands/decimal format", () => {
    expect(parseArsNumber("1.234,56")).toBeCloseTo(1234.56, 2);
    expect(parseArsNumber("123,45")).toBeCloseTo(123.45, 2);
    expect(parseArsNumber("1.000.000,00")).toBeCloseTo(1000000, 2);
  });
  it("handles negatives (leading or trailing minus)", () => {
    expect(parseArsNumber("-1.234,56")).toBeCloseTo(-1234.56, 2);
    expect(parseArsNumber("1.234,56-")).toBeCloseTo(-1234.56, 2);
  });
  it("strips currency symbols", () => {
    expect(parseArsNumber("$ 1.234,56")).toBeCloseTo(1234.56, 2);
    expect(parseArsNumber("U$S 20,00")).toBeCloseTo(20, 2);
  });
});

describe("parseDmyDate", () => {
  it("parses dd/mm/yy and dd/mm/yyyy", () => {
    expect(parseDmyDate("05/06/26")).toBe("2026-06-05");
    expect(parseDmyDate("5/6/2026")).toBe("2026-06-05");
    expect(parseDmyDate("31/12/25")).toBe("2025-12-31");
  });
  it("returns null for non-dates", () => {
    expect(parseDmyDate("COMPRA")).toBeNull();
    expect(parseDmyDate("1234")).toBeNull();
  });
});

describe("parseInstallment", () => {
  it("recognizes several cuota notations", () => {
    expect(parseInstallment("C.03/12")).toEqual({ current: 3, total: 12 });
    expect(parseInstallment("CUOTA 3/12")).toEqual({ current: 3, total: 12 });
    expect(parseInstallment("PLAN 02/06")).toEqual({ current: 2, total: 6 });
  });
  it("ignores single payments and invalid ranges", () => {
    expect(parseInstallment("COMPRA COTO")).toBeNull();
    expect(parseInstallment("13/12")).toBeNull(); // current > total
    expect(parseInstallment("01/01")).toBeNull(); // total <= 1
  });
});

describe("detectIssuer", () => {
  it("routes each issuer", () => {
    expect(detectIssuer("Resumen Mercado Pago tarjeta")).toBe("mercadopago");
    expect(detectIssuer("BANCO GALICIA VISA resumen de cuenta")).toBe("visa_galicia");
    expect(detectIssuer("BANCO GALICIA AMERICAN EXPRESS")).toBe("amex_galicia");
    expect(detectIssuer("algo desconocido")).toBeNull();
  });

  it("routes Naranja even though it lists MERPAGO merchants and Visa/Master cards", () => {
    expect(detectIssuer("App Naranja X NX Master MERPAGO*COTO VISA MASTERCARD")).toBe("naranja");
  });
});
