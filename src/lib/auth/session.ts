import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function passcodeMatches(input: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) throw new Error("APP_PASSCODE is not set");
  // Hash both sides first: timingSafeEqual throws on length mismatch, hashing
  // normalizes length and avoids leaking the passcode's length via timing.
  const inputHash = createHash("sha256").update(input).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(inputHash, expectedHash);
}

async function encryptSession(): Promise<string> {
  return new SignJWT({ authed: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_MS / 1000}s`)
    .sign(getSecretKey());
}

async function decryptSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    return payload.authed === true;
  } catch {
    return false;
  }
}

export async function createSession(): Promise<void> {
  const token = await encryptSession();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies();
  return decryptSession(cookieStore.get(COOKIE_NAME)?.value);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  return decryptSession(token);
}
