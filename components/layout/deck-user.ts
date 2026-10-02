export type DeckUserRole = "USER" | "MODERATOR" | "ADMIN";

export type DeckUser = {
  displayName: string;
  publicId: string;
  rankLabel: string;
  status: "ACTIVE" | "SUSPENDED" | "GUEST";
  /** DB role — used for chrome badges only; never as an auth gate. */
  role: DeckUserRole;
  /**
   * True when role is ADMIN and username matches /pb-case gate.
   * Controls whether the admin badge links to /pb-case.
   */
  canAccessPbCase: boolean;
} | null;
