import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

// OWASP's scrypt baseline (N=2^17, r=8, p=1). scrypt is memory-hard, so N is
// what makes a brute-force expensive; it needs ~128·N·r bytes, hence maxmem.
const N = 1 << 17;
const R = 8;
const P = 1;
const KEY_LEN = 32;
const SALT_LEN = 16;
const MAXMEM = 256 * 1024 * 1024;

/**
 * Hashes a password with Node's built-in scrypt — no dependency needed, and
 * the project already leans on `node:crypto` for the session.
 *
 * The parameters travel inside the stored string rather than living only in
 * this file, so raising the cost later doesn't invalidate existing hashes:
 * old ones keep verifying with the parameters they were made with.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await scryptAsync(plain.normalize("NFKC"), salt, KEY_LEN, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

/** Constant-time verification. Returns false for anything malformed, never throws. */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, "base64");
    expected = Buffer.from(hashB64, "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const actual = await scryptAsync(plain.normalize("NFKC"), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAXMEM,
    });
    // Lengths match by construction (we asked for expected.length), so
    // timingSafeEqual can't throw here.
    return timingSafeEqual(actual, expected);
  } catch {
    return false; // absurd parameters (maxmem blown, N not a power of two, …)
  }
}
