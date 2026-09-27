"use client";

import Link from "next/link";
import { useState } from "react";
import { siteConfig } from "@/lib/site-config";

type SiteHeaderProps = {
  variant?: "home" | "inner";
};

export function SiteHeader({ variant = "home" }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const prefix = variant === "home" ? "" : "/";

  const links = [
    { href: `${prefix}#services`, label: "Services" },
    { href: `${prefix}#projects`, label: "Projects" },
    { href: `${prefix}#process`, label: "Process" },
    { href: `${prefix}#contact`, label: "Contact" },
  ];

  return (
    <header className="site-header">
      <div className="wrap">
        <nav className="site-nav">
          <Link href="/" className="logo">
            {siteConfig.name}
          </Link>
          <div className="navlinks">
            {links.map((l) => (
              <a key={l.label} href={l.href}>
                {l.label}
              </a>
            ))}
          </div>
          <a href={`${prefix}#contact`} className="ghost-btn" style={{ marginRight: 12 }}>
            Start a Project
          </a>
          <button
            type="button"
            className="menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </nav>
        <div className={`mobile-panel${open ? " open" : ""}`}>
          {links.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href={`${prefix}#contact`} className="cta-btn" style={{ textAlign: "center" }} onClick={() => setOpen(false)}>
            Start a Project
          </a>
        </div>
      </div>
    </header>
  );
}
