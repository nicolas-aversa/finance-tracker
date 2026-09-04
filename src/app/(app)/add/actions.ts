"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { createTransaction } from "@/lib/db/transactions";

const TransactionSchema = z.object({
  ticker: z
    .string()
    .trim()
    .min(1, "Falta el ticker")
    .transform((s) => s.toUpperCase()),
  type: z.enum(["BUY", "SELL"]),
  tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  cclRate: z.coerce.number().positive("La cotización CCL tiene que ser positiva"),
  arsPrice: z.coerce.number().positive("El precio en ARS tiene que ser positivo"),
  qty: z.coerce.number().positive("La cantidad tiene que ser positiva"),
});

export type CreateTransactionState = { error?: string } | undefined;

export async function createTransactionAction(
  _prevState: CreateTransactionState,
  formData: FormData
): Promise<CreateTransactionState> {
  const parsed = TransactionSchema.safeParse({
    ticker: formData.get("ticker"),
    type: formData.get("type"),
    tradeDate: formData.get("tradeDate"),
    cclRate: formData.get("cclRate"),
    arsPrice: formData.get("arsPrice"),
    qty: formData.get("qty"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { ticker, type, tradeDate, cclRate, arsPrice, qty } = parsed.data;

  const userId = await requireUserId();
  await createTransaction(userId, {
    ticker,
    type,
    tradeDate,
    cclRate: cclRate.toString(),
    arsPrice: arsPrice.toString(),
    qty: qty.toString(),
  });

  redirect("/log");
}
