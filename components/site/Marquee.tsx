const techs = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "PostgreSQL",
  "Tailwind CSS",
  "Prisma",
  "Docker",
  "Git",
];

export function Marquee() {
  const items = [...techs, ...techs];
  return (
    <div className="marquee-sec">
      <p className="marquee-label">Built with</p>
      <div className="marquee-track" aria-hidden="true">
        {items.map((t, i) => (
          <span key={`${t}-${i}`}>{t}</span>
        ))}
      </div>
    </div>
  );
}
