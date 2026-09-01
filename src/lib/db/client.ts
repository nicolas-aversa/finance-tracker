import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Supabase's transaction pooler (pgbouncer) doesn't support prepared statements.
// `max` must be high enough that concurrent queries each get their own
// connection: with too few (we had 3), postgres.js pipelines multiple
// independent queries onto one pgbouncer transaction-mode connection, which
// stalls — a single dashboard load fanning out its queries would hang for 90s.
// idle_timeout releases connections quickly so the shared pooler slot count
// stays low; connect_timeout makes a saturated pooler fail fast, not hang.
const queryClient = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 8,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });
