/**
 * Accent- and case-insensitive normalization for matching Spanish merchant text.
 * Used both by the import-time category rules and by the free-text search filter,
 * so "cafe", "CAFÉ" and "Café" all match the same movements.
 */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .toUpperCase()
    .trim();
}
