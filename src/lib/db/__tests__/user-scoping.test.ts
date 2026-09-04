import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The privacy boundary of this app is a `where` clause. One query that forgets
 * it and a friend sees somebody else's finances — a bug that no page would
 * look wrong for, because the data renders perfectly, just for the wrong
 * person.
 *
 * So it's checked mechanically: every exported query over a table that carries
 * `user_id` must both accept a `userId` and mention it in its body. This is a
 * lint, not a proof — it can't tell a correct filter from a misplaced one —
 * but it does catch the failure that actually happens, which is forgetting.
 */

const DB_DIR = path.join(process.cwd(), "src", "lib", "db");

/** Market data shared by everyone; scoping these would be wrong, not unsafe. */
const GLOBAL_TABLES = ["livePriceCache", "cclRateHistory", "loginAttempts", "users", "priceOverrides"];

const SCOPED_TABLES = [
  "transactions",
  "expenses",
  "expenseImports",
  "expenseCategories",
  "expenseBudgets",
  "monthlyIncome",
  "categoryRules",
];

/** users.ts creates accounts — it is where userId comes from, not a consumer. */
const EXEMPT_FILES = ["client.ts", "schema.ts", "cache-repo.ts", "users.ts", "overrides-repo.ts"];

type Fn = { file: string; name: string; body: string };

function exportedFunctions(): Fn[] {
  const out: Fn[] = [];
  for (const file of fs.readdirSync(DB_DIR)) {
    if (!file.endsWith(".ts") || EXEMPT_FILES.includes(file)) continue;
    const src = fs.readFileSync(path.join(DB_DIR, file), "utf8");
    for (const chunk of src.split("export async function ").slice(1)) {
      const name = chunk.slice(0, chunk.indexOf("(")).trim();
      out.push({ file, name, body: chunk });
    }
  }
  return out;
}

const touchesScopedTable = (body: string) =>
  SCOPED_TABLES.some((t) => new RegExp(String.raw`\b${t}\b`).test(body));

describe("user scoping in src/lib/db", () => {
  const fns = exportedFunctions();

  it("finds the query functions to check", () => {
    expect(fns.length).toBeGreaterThan(10);
  });

  it("every query over a per-user table takes a userId", () => {
    const offenders = fns
      .filter((f) => touchesScopedTable(f.body))
      .filter((f) => !/^\s*\(?\s*\n?\s*userId: string/m.test(f.body.slice(f.body.indexOf("("))))
      .map((f) => `${f.file}:${f.name}`);

    expect(offenders, "must take userId as their first parameter").toEqual([]);
  });

  it("every query over a per-user table actually filters or stamps by it", () => {
    const offenders = fns
      .filter((f) => touchesScopedTable(f.body))
      // Either a read/delete filtering on the column, or a write stamping it.
      .filter((f) => !/\.userId, userId\)|\{ \.\.\.data, userId \}|\bvalues\(\{[\s\S]*?\buserId\b/.test(f.body))
      .map((f) => `${f.file}:${f.name}`);

    expect(offenders, "must reference userId in the query itself").toEqual([]);
  });

  it("leaves the shared market-data tables unscoped", () => {
    const src = fs.readFileSync(path.join(DB_DIR, "cache-repo.ts"), "utf8");
    expect(src).not.toMatch(/userId/);
    for (const table of GLOBAL_TABLES.slice(0, 2)) expect(src).toContain(table);
  });
});
