import type { ParsedStatement } from "../types";
import type { PageText } from "./page-text";
import { parseGalicia } from "./galicia";

export function parseAmexGalicia(pages: PageText[]): ParsedStatement {
  return parseGalicia(pages, "amex_galicia");
}
