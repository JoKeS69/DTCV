import type { Metadata } from "next";
import {
  LEGAL_PAGES,
  LEGAL_PLACEHOLDERS,
  LEGAL_POLICY_VERSION,
} from "@/lib/legal/policy";
import { buildPageMetadata } from "@/lib/seo/metadata";

function DraftBanner() {
  return (
    <p className="mb-4 border border-warning/40 bg-warning/10 px-3 py-2 font-mono text-[11px] text-warning">
      DRAFT — for lawyer review. Not legal advice. Placeholders:{" "}
      {LEGAL_PLACEHOLDERS.companyOwnerName}, {LEGAL_PLACEHOLDERS.contactEmail},{" "}
      {LEGAL_PLACEHOLDERS.governingLaw}. Policy version {LEGAL_POLICY_VERSION}.
    </p>
  );
}

function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-3 py-10 md:px-4">
      <DraftBanner />
      <h1 className="font-mono text-2xl font-semibold uppercase tracking-[0.08em] text-text">
        {title}
      </h1>
      <div className="mt-6 space-y-4 font-mono text-[13px] leading-relaxed text-text-muted normal-case tracking-normal">
        {children}
      </div>
      <nav className="mt-10 flex flex-wrap gap-3 border-t border-border pt-4">
        {LEGAL_PAGES.map((p) => (
          <a
            key={p.href}
            href={p.href}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim hover:text-text"
          >
            {p.label}
          </a>
        ))}
      </nav>
    </main>
  );
}

export const termsMetadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  path: "/legal/terms",
  description: "DETECTIVE / CASE//NET terms of service (draft).",
});

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        These Terms govern use of {LEGAL_PLACEHOLDERS.companyOwnerName}&apos;s
        DETECTIVE / CASE//NET service. By accessing the service you agree to
        these Terms and the Privacy Policy.
      </p>
      <p>
        Research case content is informational, may be incomplete, and does not
        constitute legal advice, accusation, or a finding of guilt. Named
        persons are presumed innocent unless convicted in a court of law.
      </p>
      <p>
        No user-generated tip forms or public commenting on research case files
        in this release. Governing law: {LEGAL_PLACEHOLDERS.governingLaw}.
        Contact: {LEGAL_PLACEHOLDERS.contactEmail}.
      </p>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        We process account credentials, encrypted contact fields, and consent
        logs (policy version, timestamp, optional hashed IP). Research activity
        for admin tools writes to a separate cases database.
      </p>
      <p>
        Cookies: session (httpOnly), consent version, and visitor key for
        consent_log correlation. Contact: {LEGAL_PLACEHOLDERS.contactEmail}.
      </p>
    </LegalShell>
  );
}

export function DisclaimerPage() {
  return (
    <LegalShell title="Disclaimer">
      <p>
        Case summaries may paraphrase public sources. We do not guarantee
        completeness or accuracy. Do not treat content as evidence of guilt.
        Prefer official/court/government sources.
      </p>
    </LegalShell>
  );
}

export function CopyrightPage() {
  return (
    <LegalShell title="Copyright / Takedown">
      <p>
        We paraphrase and link sources; short excerpts only. To request removal,
        use the takedown control on a case page or email{" "}
        {LEGAL_PLACEHOLDERS.contactEmail} with the URL and reason. We log
        requests in the cases database for admin review.
      </p>
    </LegalShell>
  );
}

export function AcceptableUsePage() {
  return (
    <LegalShell title="Acceptable Use">
      <p>
        Do not use the service to harass, dox, or declare guilt about private
        individuals. Do not attempt to bypass admin controls or scrape beyond
        published surfaces. Automated research is admin-only and allowlist-bound.
      </p>
    </LegalShell>
  );
}

export function CookiesPage() {
  return (
    <LegalShell title="Cookie notice">
      <p>
        Essential cookies: authentication session (httpOnly), CSRF/session
        protections via Auth.js, consent version cookie, and visitor key for
        consent_log. Analytics remain off unless explicitly enabled.
      </p>
    </LegalShell>
  );
}
