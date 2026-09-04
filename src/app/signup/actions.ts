"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { createUser, normalizeEmail } from "@/lib/db/users";

export type SignupState = { error?: string } | undefined;

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Constant-time comparison of the invite code, hashing both sides first so the
 * lengths always match — the same shape the old passcode check used.
 */
function inviteCodeMatches(input: string): boolean {
  const expected = process.env.INVITE_CODE;
  if (!expected) return false; // no code configured → signup is closed, not open
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const invite = String(formData.get("invite") ?? "");

  if (!EMAIL_RE.test(email)) return { error: "Ese email no parece válido." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (!inviteCodeMatches(invite)) return { error: "El código de invitación no es correcto." };

  const result = await createUser(email, await hashPassword(password));
  if (!result.ok) return { error: "Ese email ya tiene una cuenta." };

  await createSession(result.user.id);
  redirect("/");
}
