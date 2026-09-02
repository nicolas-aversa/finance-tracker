import type { ExpenseSource } from "@/lib/db/schema";

export const SOURCE_LABEL: Record<ExpenseSource, string> = {
  mercadopago: "MercadoPago",
  visa_galicia: "Visa Galicia",
  amex_galicia: "Amex Galicia",
  naranja: "Naranja",
  manual: "Manual",
};
