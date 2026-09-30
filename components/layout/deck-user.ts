export type DeckUser = {
  displayName: string;
  publicId: string;
  rankLabel: string;
  status: "ACTIVE" | "SUSPENDED" | "GUEST";
} | null;
