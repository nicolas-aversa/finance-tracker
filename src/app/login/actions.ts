"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { checkLoginAllowed, recordLoginResult } from "@/lib/auth/rate-limit";
import { findUserByEmail, normalizeEmail } from "@/lib/db/users";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Completá email y contraseña." };

  const { allowed, retryAfterSeconds } = await checkLoginAllowed(email);
  if (!allowed) {
    const minutes = Math.ceil((retryAfterSeconds ?? 0) / 60);
    return { error: `Demasiados intentos fallidos. Probá de nuevo en ${minutes} minuto(s).` };
  }

  const user = await findUserByEmail(email);
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok) {
    await recordLoginResult(email, false);
    // One message for both cases. Saying "ese email no existe" would turn the
    // login form into a way to find out who has an account here.
    return { error: "Email o contraseña incorrectos." };
  }

  await recordLoginResult(email, true);
  await createSession(user.id);
  redirect("/");
}
