"use server";

import { parseStatementPdf } from "@/lib/expenses/parsers";
import { saveStatement, type SaveStatementResult } from "@/lib/db/expenses";

export type UploadState = { ok?: SaveStatementResult; error?: string } | undefined;

export async function uploadStatement(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const file = formData.get("file");
  const password = String(formData.get("password") ?? "").trim() || undefined;

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elegí un archivo PDF." };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "El archivo tiene que ser un PDF." };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = await parseStatementPdf(bytes, password);
    const result = await saveStatement(parsed, file.name);
    return { ok: result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo procesar el archivo." };
  }
}
