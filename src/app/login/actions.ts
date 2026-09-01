"use server";

import { redirect } from "next/navigation";
import { createSession, passcodeMatches } from "@/lib/auth/session";
import { checkLoginAllowed, recordLoginResult } from "@/lib/auth/rate-limit";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const { allowed, retryAfterSeconds } = await checkLoginAllowed();
  if (!allowed) {
    const minutes = Math.ceil((retryAfterSeconds ?? 0) / 60);
    return { error: `Demasiados intentos fallidos. Probá de nuevo en ${minutes} minuto(s).` };
  }

  const passcode = String(formData.get("passcode") ?? "");

  if (!passcode || !passcodeMatches(passcode)) {
    await recordLoginResult(false);
    return { error: "Passcode incorrecto." };
  }

  await recordLoginResult(true);
  await createSession();
  redirect("/");
}
