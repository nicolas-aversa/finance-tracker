import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const RESET = process.argv.includes("--reset");
const emailIdx = process.argv.indexOf("--user");
const USER_EMAIL = emailIdx >= 0 ? process.argv[emailIdx + 1]?.toLowerCase() : undefined;
if (!USER_EMAIL) throw new Error("Usá: npm run seed -- --user <email> [--reset]");

if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is not set — copy .env.example to .env.local and fill it in.");
}

const client = postgres(process.env.DIRECT_URL);
const db = drizzle(client, { schema });

/** Handles both "1234.56" and "1.234,56" (comma-decimal, dot-thousands) defensively. */
function parseNumber(raw: string): number {
  if (raw.includes(",")) {
    return Number(raw.replace(/\./g, "").replace(",", "."));
  }
  return Number(raw);
}

/** "D/M/YYYY" -> "YYYY-MM-DD" */
function parseDate(raw: string): string {
  const [day, month, year] = raw.split("/").map((p) => p.trim());
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

type SeedRow = {
  ticker: string;
  type: "BUY" | "SELL";
  date: string;
  cclRate: string;
  arsPrice: string;
  qty: string;
};

function parseCsv(content: string): SeedRow[] {
  const lines = content.trim().split("\n").slice(1); // drop header
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [ticker, type, date, cclRate, arsPrice, qty] = line.split(",").map((c) => c.trim());
      return { ticker, type: type as "BUY" | "SELL", date, cclRate, arsPrice, qty };
    });
}

async function main() {
  const existing = await db.select({ id: schema.transactions.id }).from(schema.transactions).limit(1);
  if (existing.length > 0 && !RESET) {
    console.log("La tabla transactions ya tiene datos. Usá --reset para vaciarla y volver a cargar.");
    await client.end();
    return;
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, USER_EMAIL!));
  if (!user) throw new Error(`No existe el usuario ${USER_EMAIL}`);
  const userId = user.id;

  if (RESET) {
    // Scoped, so seeding one account can't wipe another's history.
    await db.delete(schema.transactions).where(eq(schema.transactions.userId, userId));
    console.log(`Transacciones de ${USER_EMAIL} borradas.`);
  }

  const csvPath = path.join(__dirname, "seed-data.csv");
  const rows = parseCsv(readFileSync(csvPath, "utf-8"));

  for (const row of rows) {
    const isoDate = parseDate(row.date);
    const cclRate = parseNumber(row.cclRate);

    await db.insert(schema.transactions).values({
      userId,
      ticker: row.ticker,
      type: row.type,
      tradeDate: isoDate,
      cclRate: cclRate.toString(),
      arsPrice: parseNumber(row.arsPrice).toString(),
      qty: parseNumber(row.qty).toString(),
    });

    // Opportunistically seed the historical CCL cache with dates we already know,
    // saving future calls to argentinadatos.com for these same dates.
    await db
      .insert(schema.cclRateHistory)
      .values({ rateDate: isoDate, rate: cclRate.toString(), source: "seed" })
      .onConflictDoNothing({ target: schema.cclRateHistory.rateDate });
  }

  console.log(`Insertadas ${rows.length} transacciones.`);
  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
