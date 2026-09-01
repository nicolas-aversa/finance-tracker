import type { ParsedStatement } from "../types";
import type { PageText } from "./page-text";
import { parseGalicia } from "./galicia";

export function parseVisaGalicia(pages: PageText[]): ParsedStatement {
  return parseGalicia(pages, "visa_galicia");
}
