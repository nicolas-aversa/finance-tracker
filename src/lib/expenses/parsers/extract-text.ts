import "server-only";
import type { PageText, TextItem } from "./page-text";

export type { PageText, TextItem } from "./page-text";
export { groupIntoRows } from "./page-text";

export class ScannedPdfError extends Error {
  constructor() {
    super("El PDF no tiene texto extraíble (parece escaneado). No se puede procesar automáticamente.");
    this.name = "ScannedPdfError";
  }
}

export class PdfPasswordError extends Error {
  constructor() {
    super("El PDF está protegido con contraseña. Volvé a subirlo indicando la contraseña.");
    this.name = "PdfPasswordError";
  }
}

/**
 * Extracts positioned text per page from a statement PDF. Positions let the
 * per-issuer parsers reconstruct table rows (by y) and columns (by x), which is
 * far more reliable than a flat text dump for the tabular AR card statements.
 */
export async function extractPositionedText(data: Uint8Array, password?: string): Promise<PageText[]> {
  // unpdf ships a serverless-safe pdf.js build (no browser worker, no DOMMatrix
  // requirement for text extraction), which plain pdfjs-dist lacks on Vercel.
  const { getDocumentProxy } = await import("unpdf");

  let doc;
  try {
    doc = await getDocumentProxy(data, password ? { password } : undefined);
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "PasswordException") throw new PdfPasswordError();
    throw err;
  }

  const pages: PageText[] = [];
  let totalItems = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    for (const item of content.items) {
      if (!("str" in item) || item.str.trim() === "") continue;
      const [, , , , x, y] = item.transform as number[];
      items.push({ str: item.str, x, y, width: item.width });
      totalItems++;
    }
    pages.push({ items, width: 0, height: 0 });
  }

  if (totalItems === 0) throw new ScannedPdfError();
  return pages;
}

/** Flattens all pages' text into one string (for issuer detection / debugging). */
export function flattenText(pages: PageText[]): string {
  return pages.map((p) => p.items.map((it) => it.str).join(" ")).join("\n");
}
