const STACK_GROUPS = [
  {
    label: "Frontend",
    tools: ["Next.js", "TypeScript", "GSAP", "Tailwind", "shadcn/ui", "Motion", "Lenis"],
  },
  {
    label: "Backend & Cloud",
    tools: ["Node.js", "PostgreSQL", "MongoDB", "Supabase", "AWS", "GCP", "Docker", "GitHub Actions"],
  },
];

export function StackSection() {
  return (
    <div className="flex flex-col gap-5">
      <p className="section-overlay-lead">Con lo que construyo:</p>
      {STACK_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <p className="section-overlay-group-label">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.tools.map((tool) => (
              <span key={tool} className="section-overlay-tag">
                {tool}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
