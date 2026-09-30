export const primaryNav = [
  { href: "/cases", label: "Cases" },
  { href: "/cases?focus=search", label: "Search" },
  { href: "/cases?focus=evidence", label: "Evidence" },
  { href: "/fictional/rankings", label: "Intel" },
  { href: "/cases?focus=discussions", label: "Forum" },
  { href: "/fictional", label: "Training" },
  { href: "/profile", label: "Profile" },
] as const;

export const footerNav = [
  { href: "/cases", label: "Case database" },
  { href: "/sources", label: "Sources and terms" },
  { href: "/fictional", label: "Fictional ops" },
  { href: "/fictional/rankings", label: "Rankings" },
  { href: "/pricing", label: "Pricing" },
  { href: "/billing", label: "Billing" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Sign up" },
  { href: "/api/health", label: "System" },
] as const;
