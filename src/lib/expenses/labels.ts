import type { ExpenseSource } from "@/lib/db/schema";

export const SOURCE_LABEL: Record<ExpenseSource, string> = {
  mercadopago: "MercadoPago",
  visa_galicia: "Visa Galicia",
  amex_galicia: "Amex Galicia",
  naranja: "Naranja",
  manual: "Manual",
};

export const SOURCE_EMOJI: Record<ExpenseSource, string> = {
  mercadopago: "💙",
  visa_galicia: "💳",
  amex_galicia: "🟩",
  naranja: "🟠",
  manual: "✍️",
};
