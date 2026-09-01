import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { loginAttempts } from "@/lib/db/schema";

const SINGLETON_ID = "singleton";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const DB_TIMEOUT_MS = 4000;

/** Races a promise against a timeout so a DB hiccup can never hang the login form forever. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("db timeout")), ms)),
  ]);
}

async function getRow() {
  const rows = await db.select().from(loginAttempts).where(eq(loginAttempts.id, SINGLETON_ID));
  if (rows[0]) return rows[0];

  const inserted = await db
    .insert(loginAttempts)
    .values({ id: SINGLETON_ID })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  // Lost the insert race against a concurrent request — re-read.
  return (await db.select().from(loginAttempts).where(eq(loginAttempts.id, SINGLETON_ID)))[0];
}

/**
 * Checks whether login attempts are currently locked out.
 * Fails OPEN (allowed: true) on any DB error/timeout — this table is a
 * supplementary brute-force deterrent, not the actual security boundary (the
 * passcode check is), so a Supabase hiccup should never be able to lock a
 * legitimate user out of their own app.
 */
export async function checkLoginAllowed(): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  try {
    const row = await withTimeout(getRow(), DB_TIMEOUT_MS);
    if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
      return { allowed: false, retryAfterSeconds: Math.ceil((row.lockedUntil.getTime() - Date.now()) / 1000) };
    }
    return { allowed: true };
  } catch (err) {
    console.error("checkLoginAllowed failed, failing open:", err);
    return { allowed: true };
  }
}

/** Best-effort: a failure here should never block the actual login/logout flow. */
export async function recordLoginResult(success: boolean): Promise<void> {
  try {
    await withTimeout(recordLoginResultInner(success), DB_TIMEOUT_MS);
  } catch (err) {
    console.error("recordLoginResult failed, ignoring:", err);
  }
}

async function recordLoginResultInner(success: boolean): Promise<void> {
  if (success) {
    await db
      .update(loginAttempts)
      .set({ failedCount: 0, lockedUntil: null })
      .where(eq(loginAttempts.id, SINGLETON_ID));
    return;
  }

  const row = await getRow();
  const failedCount = row.failedCount + 1;

  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    await db
      .update(loginAttempts)
      .set({ failedCount: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) })
      .where(eq(loginAttempts.id, SINGLETON_ID));
  } else {
    await db.update(loginAttempts).set({ failedCount }).where(eq(loginAttempts.id, SINGLETON_ID));
  }
}
