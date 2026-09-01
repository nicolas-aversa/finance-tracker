import "server-only";
import type { ParsedStatement } from "../types";
import { detectIssuer } from "./detect-issuer";
import { extractPositionedText, flattenText, type PageText } from "./extract-text";
import { parseMercadoPago } from "./mercadopago";
import { parseVisaGalicia } from "./visa-galicia";
import { parseAmexGalicia } from "./amex-galicia";
import { parseNaranja } from "./naranja";

export { ScannedPdfError, PdfPasswordError } from "./extract-text";

export class UnknownIssuerError extends Error {
  constructor() {
    super("No pude reconocer el emisor del resumen (MercadoPago, Visa Galicia o Amex Galicia).");
    this.name = "UnknownIssuerError";
  }
}

const PARSERS: Record<Exclude<ParsedStatement["source"], "manual">, (pages: PageText[]) => ParsedStatement> = {
  mercadopago: parseMercadoPago,
  visa_galicia: parseVisaGalicia,
  amex_galicia: parseAmexGalicia,
  naranja: parseNaranja,
};

/** End-to-end: PDF bytes -> detected issuer -> parsed statement. */
export async function parseStatementPdf(data: Uint8Array, password?: string): Promise<ParsedStatement> {
  const pages = await extractPositionedText(data, password);
  const issuer = detectIssuer(flattenText(pages));
  if (!issuer) throw new UnknownIssuerError();
  return PARSERS[issuer](pages);
}
