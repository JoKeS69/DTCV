import { siteConfig } from "@/lib/site-config";

type FooterLink = { href: string; label: string };

const elsewhere: FooterLink[] = [
  ...(siteConfig.github ? [{ href: siteConfig.github, label: "GitHub" }] : []),
  ...(siteConfig.linkedin ? [{ href: siteConfig.linkedin, label: "LinkedIn" }] : []),
  ...(siteConfig.upworkUrl ? [{ href: siteConfig.upworkUrl, label: "Upwork" }] : []),
  { href: `mailto:${siteConfig.email}`, label: siteConfig.email },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="foot-grid">
          <div className="col">
            <h4>{siteConfig.name}</h4>
            <p style={{ color: "var(--text-2)", fontSize: "0.88rem", maxWidth: 220 }}>
              Full-stack web developer building fast, custom sites and applications.
            </p>
          </div>
          <div className="col">
            <h4>Site</h4>
            <a href="#services">Services</a>
            <a href="#projects">Projects</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="col">
            <h4>Elsewhere</h4>
            {elsewhere.map((item) => (
              <a
                key={item.label}
                href={item.href}
                {...(item.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 {siteConfig.name}. All rights reserved.</span>
          <span>Built with Next.js, TypeScript & Tailwind</span>
        </div>
      </div>
    </footer>
  );
}
