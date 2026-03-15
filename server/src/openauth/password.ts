import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const computed = scryptSync(password, salt, KEY_LEN).toString("hex");
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(computed, "hex");

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}
