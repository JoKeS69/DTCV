import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import bcrypt from "bcryptjs";

const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  algorithm: 2 as const, // Argon2id
};

const BCRYPT_ROUNDS = 12;

export type PasswordAlgo = "argon2id" | "bcrypt";

export function detectPasswordAlgo(passwordHash: string): PasswordAlgo {
  if (passwordHash.startsWith("$argon2")) return "argon2id";
  return "bcrypt";
}

export async function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, ARGON2_OPTS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const algo = detectPasswordAlgo(passwordHash);
  if (algo === "argon2id") {
    try {
      return await argon2Verify(passwordHash, password);
    } catch {
      return false;
    }
  }
  return bcrypt.compare(password, passwordHash);
}

/** True when hash should be upgraded to Argon2id (legacy bcrypt). */
export function needsRehash(passwordHash: string): boolean {
  return detectPasswordAlgo(passwordHash) === "bcrypt";
}

/** Legacy helper for tests/seeds that still need a bcrypt fixture. */
export async function hashPasswordBcryptLegacy(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
