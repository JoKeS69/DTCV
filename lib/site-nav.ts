export const primaryNav = [
  { href: "/cases", label: "Cases", index: "01" },
  { href: "/cases?focus=search", label: "Search", index: "02" },
  { href: "/cases", label: "Evidence", index: "03" },
  { href: "/fictional/rankings", label: "Intel", index: "04" },
  { href: "/cases", label: "Forum", index: "05" },
  { href: "/fictional", label: "Training", index: "06" },
  { href: "/profile", label: "Profile", index: "07" },
] as const;

export const footerNav = [
  { href: "/cases", label: "Case database" },
  { href: "/fictional", label: "Fictional ops" },
  { href: "/fictional/rankings", label: "Rankings" },
  { href: "/pricing", label: "Pricing" },
  { href: "/billing", label: "Billing" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Sign up" },
  { href: "/api/health", label: "System" },
] as const;
