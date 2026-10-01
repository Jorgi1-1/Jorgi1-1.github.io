const FACTS = [
  { label: "Based in", value: "Puebla, Mexico · remote anywhere" },
  { label: "Languages", value: "Spanish (native) · English (C2)" },
  { label: "Focus", value: "UX/UI design, fullstack development and DevOps" },
];

export function AboutSection() {
  return (
    <div className="section-about">
      <div className="flex flex-col gap-6">
        <p className="section-overlay-statement">From interface to infrastructure.</p>
        <p className="section-copy">
          I&apos;m a fullstack developer with a real passion for UX/UI design. I ship production software with the
          same care for what people see as for what keeps it running.
        </p>
      </div>
      <dl className="section-facts section-stagger">
        {FACTS.map((fact, index) => (
          <div key={fact.label} className="section-facts-row" style={{ "--i": index } as React.CSSProperties}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
