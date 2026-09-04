import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, notInArray } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { DEFAULT_CATEGORIES, DEFAULT_RULES } from "../src/lib/expenses/defaults";

const RESET = process.argv.includes("--reset");
const emailIdx = process.argv.indexOf("--user");
const USER_EMAIL = emailIdx >= 0 ? process.argv[emailIdx + 1]?.toLowerCase() : undefined;
if (!USER_EMAIL) throw new Error("Usá: npm run seed:categories -- --user <email> [--reset]");

if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is not set");
const client = postgres(process.env.DIRECT_URL);
const db = drizzle(client, { schema });

async function main() {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, USER_EMAIL!));
  if (!user) throw new Error(`No existe el usuario ${USER_EMAIL}`);
  const userId = user.id;

  for (const c of DEFAULT_CATEGORIES) {
    await db
      .insert(schema.expenseCategories)
      .values({ ...c, userId })
      .onConflictDoUpdate({
        target: [schema.expenseCategories.userId, schema.expenseCategories.name],
        set: { emoji: c.emoji, sort: c.sort },
      });
  }
  if (RESET) {
    // Drop categories no longer in the canonical list (e.g. the old "Transporte"
    // after splitting it into público/vehículo). No FK on expenses.category, so
    // this is safe once the statements are reloaded onto the new names.
    await db
      .delete(schema.expenseCategories)
      .where(
        and(
          eq(schema.expenseCategories.userId, userId),
          notInArray(schema.expenseCategories.name, DEFAULT_CATEGORIES.map((c) => c.name))
        )
      );
  }
  console.log(`Categorías: ${DEFAULT_CATEGORIES.length} aseguradas.`);

  const existingRules = await db
    .select({ id: schema.categoryRules.id })
    .from(schema.categoryRules)
    .where(eq(schema.categoryRules.userId, userId))
    .limit(1);
  if (existingRules.length > 0 && !RESET) {
    console.log("Reglas ya existen (usá --reset para reemplazar).");
  } else {
    if (RESET) await db.delete(schema.categoryRules).where(eq(schema.categoryRules.userId, userId));
    await db.insert(schema.categoryRules).values(DEFAULT_RULES.map((r) => ({ ...r, userId })));
    console.log(`Reglas: ${DEFAULT_RULES.length} insertadas.`);
  }

  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
