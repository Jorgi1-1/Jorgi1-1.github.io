"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { SITE } from "@/lib/site";

type Work = {
  kind: string;
  title: string;
  description: string;
  href: string;
  domain: string;
};

const WORKS: Work[] = [
  {
    kind: "Own studio",
    title: "Kanso Studio",
    description:
      "Kanso began as a way to turn my passion into my craft. I'm its founder and only member, so I cover a whole team's job: design, development, client work and launch.",
    href: SITE.studio,
    domain: "kansostudio.com.mx",
  },
  {
    kind: "Redesign",
    title: "CEAS",
    description: "A complete redesign of the site, rebuilt around modern standards of design, conversion and UX.",
    href: "https://www.ceas.com.mx",
    domain: "ceas.com.mx",
  },
];

export function WorkSection() {
  const [active, setActive] = useState(0);
  const current = WORKS[active];

  return (
    <div className="section-work">
      <ol className="section-work-list section-stagger">
        {WORKS.map((work, index) => (
          <li
            key={work.title}
            className="section-work-item"
            data-active={index === active ? "" : undefined}
            style={{ "--i": index } as React.CSSProperties}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
          >
            <h3 className="section-work-title">{work.title}</h3>
            <p className="section-copy">{work.description}</p>
            <p className="section-work-meta">
              <span className="section-work-kind">{work.kind}</span>
              {/* The one real link per project; its ::after stretches over the
                  whole entry so the title and copy are clickable too. */}
              <a href={work.href} target="_blank" rel="noreferrer" className="section-work-link">
                Visit {work.domain}
                <ArrowUpRight className="size-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </p>
          </li>
        ))}
      </ol>

      {/* Stylized browser frame for the hovered project. Screenshots slot in here.
          A pointer shortcut to the same site: the entry's link is the
          accessible one, so this stays out of the tab order and the tree. */}
      <a
        href={current.href}
        target="_blank"
        rel="noreferrer"
        className="section-work-preview"
        aria-hidden="true"
        tabIndex={-1}
      >
        <div className="section-work-preview-bar">
          <span className="section-work-preview-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="section-work-preview-url">{current.domain}</span>
        </div>
        <div key={current.title} className="section-work-preview-stage">
          <span className="section-work-preview-kind">{current.kind}</span>
          <span className="section-work-preview-title">{current.title}</span>
        </div>
      </a>
    </div>
  );
}
