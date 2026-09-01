/** A text fragment with its position on the page (PDF user-space coords). */
export type TextItem = { str: string; x: number; y: number; width: number };

export type PageText = { items: TextItem[]; width: number; height: number };

/**
 * Groups a page's items into visual rows by y-coordinate (within a tolerance),
 * each row's items sorted left-to-right. Rows are returned top-to-bottom.
 * Pure (no pdfjs), so parsers and their tests don't pull the server-only module.
 */
export function groupIntoRows(page: PageText, yTolerance = 3): TextItem[][] {
  const sorted = [...page.items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextItem[][] = [];
  for (const item of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last[0].y - item.y) <= yTolerance) {
      last.push(item);
    } else {
      rows.push([item]);
    }
  }
  for (const row of rows) row.sort((a, b) => a.x - b.x);
  return rows;
}
