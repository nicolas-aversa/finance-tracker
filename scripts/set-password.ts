import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";

/**
 * Sets (or resets) an account's email and password.
 *
 * Two jobs: claiming the owner account the migration creates — it ships with a
 * hash that can never verify, so real credentials never sit in a committed
 * migration file — and resetting a password for anyone who forgets theirs,
 * since there's no email service to send a reset link.
 *
 *   npm run user:set-password -- --email vos@ejemplo.com --password "..."
 *   npm run user:set-password -- --from owner@cedear.local --email vos@x.com --password "..."
 */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const email = arg("email")?.trim().toLowerCase();
const password = arg("password");
// Which account to update; defaults to the one being renamed to `email`.
const from = (arg("from") ?? email)?.trim().toLowerCase();

if (!email || !password) {
  throw new Error('Usá: npm run user:set-password -- --email <email> --password "<contraseña>" [--from <email actual>]');
}
if (password.length < 8) throw new Error("La contraseña necesita al menos 8 caracteres.");
if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is not set");

const client = postgres(process.env.DIRECT_URL);
const db = drizzle(client, { schema });

async function main() {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, from!));
  if (!user) throw new Error(`No existe el usuario ${from}`);

  await db
    .update(schema.users)
    .set({ email: email!, passwordHash: await hashPassword(password!) })
    .where(eq(schema.users.id, user.id));

  console.log(`Listo. ${from} -> ${email}, contraseña actualizada.`);
  await client.end();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await client.end();
  process.exit(1);
});
