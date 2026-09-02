"use server";

import { revalidatePath } from "next/cache";
import { parseStatementPdf } from "@/lib/expenses/parsers";
import { saveStatement, type SaveStatementResult } from "@/lib/db/expenses";

export type UploadOutcome =
  | { fileName: string; ok: SaveStatementResult }
  | { fileName: string; error: string };

export type UploadState = { results: UploadOutcome[] } | { error: string } | undefined;

async function processOne(file: File): Promise<UploadOutcome> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { fileName: file.name, error: "No es un PDF." };
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = await parseStatementPdf(bytes);
    return { fileName: file.name, ok: await saveStatement(parsed, file.name) };
  } catch (err) {
    return { fileName: file.name, error: err instanceof Error ? err.message : "No se pudo procesar." };
  }
}

/**
 * Imports one or more statement PDFs. They're processed one at a time rather
 * than in parallel: `saveStatement` replaces any prior import for the same
 * (source, period), and two uploads racing on the same period would interleave
 * their deletes and inserts.
 *
 * A failure on one file doesn't abort the rest — each gets its own result.
 */
export async function uploadStatements(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Elegí al menos un PDF." };

  const results: UploadOutcome[] = [];
  for (const file of files) results.push(await processOne(file));

  revalidatePath("/gastos");
  revalidatePath("/gastos/movimientos");
  return { results };
}
