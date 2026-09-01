import type { ExpenseSource } from "@/lib/db/schema";

/**
 * Identifies which issuer a statement PDF is from by keywords in its text, so
 * the user can upload any of them and the app routes to the right parser.
 * Returns null when it can't tell.
 */
export function detectIssuer(fullText: string): Exclude<ExpenseSource, "manual"> | null {
  const t = fullText.toUpperCase();

  // Naranja first: its statements list "MERPAGO*…" merchants and NX Visa/Master
  // card names, so check the unambiguous NARANJA brand before the others.
  if (t.includes("NARANJA") || t.includes("NARANJAX")) return "naranja";

  const isGalicia = t.includes("GALICIA") || t.includes("30-50000173-5");
  const isAmex = t.includes("AMERICAN EXPRESS") || /\bAMEX\b/.test(t);
  const isMercadoPago = t.includes("MERCADO PAGO") || t.includes("MERCADOPAGO");

  if (isMercadoPago && !isGalicia) return "mercadopago";
  if (isGalicia && isAmex) return "amex_galicia";
  if (isGalicia) return "visa_galicia";
  if (isAmex) return "amex_galicia";
  if (isMercadoPago) return "mercadopago";
  return null;
}
