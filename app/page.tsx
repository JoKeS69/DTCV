import { ContactForm } from "@/components/site/ContactForm";
import { Marquee } from "@/components/site/Marquee";
import { ProcessSteps } from "@/components/site/ProcessSteps";
import { conceptProjects, ProjectCard } from "@/components/site/ProjectCard";
import { Reveal } from "@/components/site/Reveal";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { siteConfig } from "@/lib/site-config";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <section className="hero wrap">
          <div>
            <div className="badge">
              <span className="dot" /> Currently accepting selected projects
            </div>
            <h1>Software that carries a business, not just a demo.</h1>
            <p className="lede">
              I design and build custom websites and web applications — from marketing sites to full-stack
              products — handling the frontend, backend and everything that connects them.
            </p>
            <div className="hero-ctas">
              <a href="#contact" className="cta-btn">
                Start a Project
              </a>
              <a href="#projects" className="ghost-btn">
                View My Work
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="term">
              <div className="bar">
                <span />
                <span />
                <span />
              </div>
              <div className="line" style={{ animationDelay: ".1s" }}>
                $ building your_project
              </div>
              <div className="line" style={{ animationDelay: ".4s" }}>
                → <b>frontend</b> — responsive UI, no shortcuts
              </div>
              <div className="line" style={{ animationDelay: ".7s" }}>
                → <b>backend</b> — API, database, auth
              </div>
              <div className="line" style={{ animationDelay: "1s" }}>
                → <b>performance</b> — fast on real devices
              </div>
              <div className="line" style={{ animationDelay: "1.3s" }}>
                → <b>ship</b> — deployed, tested, documented
              </div>
              <div className="line" style={{ animationDelay: "1.6s", color: "var(--success)" }}>
                ✓ ready for clients
              </div>
            </div>
          </div>
        </section>

        <Marquee />

        <section id="services" className="wrap">
          <Reveal className="sec-head">
            <h2>What I build</h2>
            <p>Four ways I typically get brought in — each one covers both the interface and what powers it underneath.</p>
          </Reveal>
          <Reveal>
            <div className="grid-4">
              <div className="svc">
                <div className="ic">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M3 9h18" />
                  </svg>
                </div>
                <h3>Custom websites</h3>
                <p>Marketing sites, landing pages and corporate sites built for speed and conversion, not a page-builder template.</p>
                <div className="stack">
                  <span>Next.js</span>
                  <span>Tailwind</span>
                  <span>SEO</span>
                </div>
              </div>
              <div className="svc">
                <div className="ic">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
                  </svg>
                </div>
                <h3>Web applications</h3>
                <p>Dashboards, booking systems and SaaS products with real accounts, data and logic behind the interface.</p>
                <div className="stack">
                  <span>React</span>
                  <span>Node.js</span>
                  <span>PostgreSQL</span>
                </div>
              </div>
              <div className="svc">
                <div className="ic">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </div>
                <h3>APIs & backend</h3>
                <p>Secure APIs, database design and integrations for a product that already exists and needs a solid backend.</p>
                <div className="stack">
                  <span>REST</span>
                  <span>Auth</span>
                  <span>Prisma</span>
                </div>
              </div>
              <div className="svc">
                <div className="ic">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
                  </svg>
                </div>
                <h3>Site optimization</h3>
                <p>Performance, accessibility and SEO passes on an existing site — measurable improvements, not a rebuild.</p>
                <div className="stack">
                  <span>Lighthouse</span>
                  <span>Core Web Vitals</span>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="projects" className="wrap">
          <Reveal className="sec-head">
            <h2>Selected concept projects</h2>
            <p>Built to demonstrate range across frontend, backend and product thinking.</p>
          </Reveal>
          <Reveal>
            <p className="proj-note">
              These are concept projects built to show technical range — not work delivered for named clients.
            </p>
          </Reveal>
          {conceptProjects.map((p, i) => (
            <Reveal key={p.slug}>
              <ProjectCard project={p} reverse={i % 2 === 1} />
            </Reveal>
          ))}
        </section>

        <section id="process" className="wrap">
          <Reveal className="sec-head">
            <h2>How a project runs</h2>
            <p>Six stages, start to launch. Tap a stage for detail.</p>
          </Reveal>
          <Reveal>
            <ProcessSteps />
          </Reveal>
        </section>

        <section className="wrap">
          <Reveal className="sec-head">
            <h2>Why clients work with me</h2>
            <p>The questions that matter before you hire someone for a $1,000–$5,000+ project.</p>
          </Reveal>
          <Reveal>
            <div className="why-grid">
              <div className="why-item">
                <h3>I think in business outcomes</h3>
                <p>
                  Every technical decision is weighed against what it does for your users and your conversion, not
                  just whether it&apos;s technically interesting.
                </p>
              </div>
              <div className="why-item">
                <h3>Frontend and backend, one person</h3>
                <p>No handoff gaps between design, interface and the systems behind it — I own the whole stack.</p>
              </div>
              <div className="why-item">
                <h3>Performance is not optional</h3>
                <p>
                  Every build is checked against real load times and Core Web Vitals, not just how it looks in a demo.
                </p>
              </div>
              <div className="why-item">
                <h3>Direct communication</h3>
                <p>Clear updates at each stage, in plain language — you&apos;ll always know exactly where the project stands.</p>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="contact" className="wrap">
          <div className="contact-wrap">
            <Reveal>
              <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)", fontWeight: 600, marginBottom: 16 }}>
                Have a project in mind?
              </h2>
              <p style={{ color: "var(--text-2)", marginBottom: 24 }}>
                Tell me what you&apos;re building. I&apos;ll reply with next steps, or an honest note if it&apos;s not a fit.
              </p>
              <p style={{ color: "var(--text-2)", fontSize: "0.9rem" }}>
                {siteConfig.upworkUrl ? (
                  <>
                    Prefer Upwork?{" "}
                    <a href={siteConfig.upworkUrl} style={{ color: "var(--accent)" }}>
                      Message me there
                    </a>{" "}
                    instead.
                  </>
                ) : (
                  <>
                    Prefer email?{" "}
                    <a href={`mailto:${siteConfig.email}`} style={{ color: "var(--accent)" }}>
                      {siteConfig.email}
                    </a>
                  </>
                )}
              </p>
            </Reveal>
            <Reveal>
              <ContactForm />
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
