/**
 * Shared primary IA for desktop top nav and mobile bottom nav.
 * Hollow Evidence/Search/Discussions focus modes removed — those never
 * switched UI and Discussions previously leaked a case code in the URL.
 */
export const primaryNav = [
  { href: "/cases", label: "Cases" },
  { href: "/fictional", label: "Fictional cases" },
  { href: "/fictional/rankings", label: "Intel" },
  { href: "/profile", label: "Profile" },
] as const;

/** Compact mobile strip — same destinations, shorter labels. */
export const mobileNav = [
  { href: "/cases", label: "Cases", match: (p: string) => p.startsWith("/cases") },
  {
    href: "/fictional",
    label: "Fictional",
    match: (p: string) =>
      p.startsWith("/fictional") && !p.includes("rankings"),
  },
  {
    href: "/fictional/rankings",
    label: "Intel",
    match: (p: string) => p.includes("rankings"),
  },
  {
    href: "/billing",
    label: "Billing",
    match: (p: string) =>
      p.startsWith("/billing") ||
      p.startsWith("/pricing") ||
      p.startsWith("/checkout"),
  },
  {
    href: "/profile",
    label: "Profile",
    match: (p: string) => p.startsWith("/profile"),
  },
] as const;

export const footerNav = [
  { href: "/cases", label: "Case database" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/disclaimer", label: "Disclaimer" },
  { href: "/legal/copyright", label: "Copyright / Takedown" },
  { href: "/legal/acceptable-use", label: "Acceptable Use" },
  { href: "/legal/cookies", label: "Cookie notice" },
  { href: "/fictional", label: "Fictional ops" },
  { href: "/fictional/rankings", label: "Rankings" },
  { href: "/pricing", label: "Pricing" },
  { href: "/billing", label: "Billing" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Sign up" },
  { href: "/api/health", label: "System" },
] as const;
