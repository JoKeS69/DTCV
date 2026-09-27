import Image from "next/image";
import Link from "next/link";

export type ConceptProject = {
  slug: "ledger" | "marlow" | "fieldwork";
  tag: string;
  title: string;
  body: string;
  features: string[];
  stack: string[];
  image: string;
};

export const conceptProjects: ConceptProject[] = [
  {
    slug: "ledger",
    tag: "SaaS platform",
    title: "Ledger — subscription billing dashboard",
    body: "A concept SaaS product for tracking recurring revenue, giving founders a live view of MRR, churn and upcoming renewals.",
    features: [
      "Role-based accounts and team invites",
      "Real-time charts driven by a Postgres backend",
      "Webhook-based billing event handling",
    ],
    stack: ["Next.js", "PostgreSQL", "Stripe API", "Prisma"],
    image: "/projects/ledger-preview.svg",
  },
  {
    slug: "marlow",
    tag: "E-commerce",
    title: "Marlow — direct-to-consumer storefront",
    body: "A custom storefront for a fictional goods brand, built for a fast checkout and a product page that actually sells.",
    features: [
      "Custom cart and checkout, not a page-builder plugin",
      "Inventory synced through a headless backend",
      "Sub-second product page loads",
    ],
    stack: ["React", "Node.js", "Headless CMS"],
    image: "/projects/marlow-preview.svg",
  },
  {
    slug: "fieldwork",
    tag: "Booking platform",
    title: "Fieldwork — appointment scheduling for service businesses",
    body: "A booking system for small service teams to manage calendars, staff availability and client confirmations.",
    features: [
      "Conflict-free scheduling logic across staff calendars",
      "Automated email confirmations and reminders",
      "Mobile-first booking flow for clients",
    ],
    stack: ["Next.js", "PostgreSQL", "Email API"],
    image: "/projects/fieldwork-preview.svg",
  },
];

export function ProjectCard({ project, reverse = false }: { project: ConceptProject; reverse?: boolean }) {
  return (
    <article className={`proj${reverse ? " proj-reverse" : ""}`}>
      <div className="proj-media">
        <div className="proj-preview">
          <Image
            src={project.image}
            alt={`${project.title} preview`}
            width={720}
            height={450}
            unoptimized
          />
        </div>
      </div>
      <div className="proj-body">
        <div className="proj-tag">{project.tag}</div>
        <h3>{project.title}</h3>
        <p>{project.body}</p>
        <ul className="proj-feat">
          {project.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <div className="proj-stack">
          {project.stack.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <Link href={`/projects/${project.slug}`} className="cta-btn">
          View live demo
        </Link>
      </div>
    </article>
  );
}
