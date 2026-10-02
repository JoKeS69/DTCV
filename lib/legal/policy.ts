/**
 * Legal policy constants + consent versioning (main DB consent_log).
 */

export const LEGAL_POLICY_VERSION = "2026-10-02";

export const LEGAL_PLACEHOLDERS = {
  companyOwnerName: "[COMPANY/OWNER NAME]",
  contactEmail: "[CONTACT EMAIL]",
  governingLaw: "[GOVERNING LAW/JURISDICTION]",
} as const;

export const LEGAL_PAGES = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/disclaimer", label: "Disclaimer" },
  { href: "/legal/copyright", label: "Copyright / Takedown" },
  { href: "/legal/acceptable-use", label: "Acceptable Use" },
  { href: "/legal/cookies", label: "Cookie notice" },
] as const;

export const CONSENT_COOKIE = "detective_consent_v";
export const VISITOR_COOKIE = "detective_visitor_key";
