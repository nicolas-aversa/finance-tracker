import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { categoryRules, expenseCategories, users, type User } from "./schema";
import { DEFAULT_CATEGORIES, DEFAULT_RULES } from "@/lib/expenses/defaults";

/** Emails are matched case-insensitively, so they're stored folded. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
  return row;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

export type CreateUserResult = { ok: true; user: User } | { ok: false; reason: "email-taken" };

/**
 * Creates an account and seeds its categories and rules in one transaction —
 * a user without categories can't classify anything, so a half-finished signup
 * would leave a broken account behind.
 *
 * The duplicate-email case is detected by the unique index rather than a
 * prior SELECT, which would race with a concurrent signup of the same address.
 */
export async function createUser(email: string, passwordHash: string): Promise<CreateUserResult> {
  const normalized = normalizeEmail(email);

  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email: normalized, passwordHash }).returning();

      await tx.insert(expenseCategories).values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })));
      await tx.insert(categoryRules).values(DEFAULT_RULES.map((r) => ({ ...r, userId: user.id })));

      return { ok: true as const, user };
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: "email-taken" };
    throw err;
  }
}

/** Postgres 23505 — the unique index on users.email rejected the insert. */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505";
}

export async function updatePassword(userId: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}
