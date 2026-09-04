import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("hashPassword / verifyPassword", () => {
  it("verifies the password it hashed", async () => {
    const stored = await hashPassword("un secreto cualquiera");
    expect(await verifyPassword("un secreto cualquiera", stored)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correcta");
    expect(await verifyPassword("incorrecta", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
    expect(await verifyPassword("correcta ", stored)).toBe(false);
  });

  it("gives a different hash every time, so equal passwords don't look equal", async () => {
    const a = await hashPassword("misma");
    const b = await hashPassword("misma");
    expect(a).not.toBe(b);
    // …and both still verify: the salt travels with the hash.
    expect(await verifyPassword("misma", a)).toBe(true);
    expect(await verifyPassword("misma", b)).toBe(true);
  });

  it("records the parameters it used, so the cost can be raised later", async () => {
    const stored = await hashPassword("x");
    const [scheme, n, r, p, salt, hash] = stored.split("$");
    expect(scheme).toBe("scrypt");
    expect(Number(n)).toBeGreaterThanOrEqual(1 << 14);
    expect(Number(r)).toBeGreaterThan(0);
    expect(Number(p)).toBeGreaterThan(0);
    expect(salt.length).toBeGreaterThan(0);
    expect(hash.length).toBeGreaterThan(0);
  });

  it("rejects a tampered hash instead of throwing", async () => {
    const stored = await hashPassword("secreto");
    const parts = stored.split("$");

    // last byte flipped
    const flipped = [...parts];
    const raw = Buffer.from(flipped[5], "base64");
    raw[raw.length - 1] ^= 0xff;
    flipped[5] = raw.toString("base64");
    expect(await verifyPassword("secreto", flipped.join("$"))).toBe(false);

    // salt swapped for another
    const other = await hashPassword("secreto");
    const mixed = [...parts];
    mixed[4] = other.split("$")[4];
    expect(await verifyPassword("secreto", mixed.join("$"))).toBe(false);
  });

  it("rejects malformed stored values without throwing", async () => {
    for (const bad of [
      "",
      "no-es-un-hash",
      "scrypt$1$2$3",
      "bcrypt$131072$8$1$c2FsdA==$aGFzaA==",
      "scrypt$abc$8$1$c2FsdA==$aGFzaA==",
      "scrypt$131072$8$1$$",
    ]) {
      expect(await verifyPassword("lo que sea", bad)).toBe(false);
    }
  });

  it("normalizes unicode, so the same password typed differently still opens", async () => {
    // "contraseña" with a precomposed ñ vs. n + combining tilde
    const precomposed = "contraseña";
    const decomposed = "contraseña";
    expect(precomposed).not.toBe(decomposed);
    const stored = await hashPassword(precomposed);
    expect(await verifyPassword(decomposed, stored)).toBe(true);
  });
});
