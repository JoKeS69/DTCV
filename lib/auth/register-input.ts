import { z } from "zod";

/** Coerce FormData entries to trimmed strings; reject File/null/empty. */
export function formString(
  value: FormDataEntryValue | null | undefined,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const registerInputSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username: letters, numbers, underscore")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export type RegisterParseResult =
  | { ok: true; data: RegisterInput }
  | { ok: false; error: string };

/**
 * Parse register form fields. Never returns an undefined username on success —
 * safe to pass into Prisma `findUnique({ where: { username } })`.
 */
export function parseRegisterFormData(
  formData: FormData | { get(name: string): FormDataEntryValue | null },
): RegisterParseResult {
  const username = formString(formData.get("username"));
  const password = formString(formData.get("password"));

  if (username === undefined) {
    return { ok: false, error: "Username is required" };
  }
  if (password === undefined) {
    return { ok: false, error: "Password is required" };
  }

  const parsed = registerInputSchema.safeParse({ username, password });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  // Defensive: Prisma findUnique rejects undefined unique fields at runtime.
  if (!parsed.data.username) {
    return { ok: false, error: "Username is required" };
  }

  return { ok: true, data: parsed.data };
}
