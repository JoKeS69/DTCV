"use client";

import { useState } from "react";

const steps = [
  {
    num: "01",
    title: "Discovery",
    body: "We define the business goal, the users, and what the site or app actually needs to do — before any design starts.",
  },
  {
    num: "02",
    title: "Strategy",
    body: "I map the architecture, feature set and content structure so the build has a clear plan, not guesswork.",
  },
  {
    num: "03",
    title: "Design",
    body: "A visual system and interface built around your brand and your users, not a generic template.",
  },
  {
    num: "04",
    title: "Development",
    body: "Frontend, backend and integrations built together, with regular check-ins so there are no surprises.",
  },
  {
    num: "05",
    title: "Testing",
    body: "Every page checked across devices for performance, accessibility and broken states before launch.",
  },
  {
    num: "06",
    title: "Launch",
    body: "Deployment, monitoring, and a handover you can actually maintain — plus support after launch.",
  },
];

export function ProcessSteps() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="process">
      {steps.map((step, i) => (
        <div
          key={step.num}
          className={`step${open === i ? " open" : ""}`}
          tabIndex={0}
          role="button"
          aria-expanded={open === i}
          onClick={() => setOpen((cur) => (cur === i ? null : i))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((cur) => (cur === i ? null : i));
            }
          }}
        >
          <div className="num">{step.num}</div>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </div>
      ))}
    </div>
  );
}
