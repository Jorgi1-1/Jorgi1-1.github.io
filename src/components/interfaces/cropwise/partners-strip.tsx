const PARTNER_LOGOS = [
  "https://placehold.co/120x40/1a2413/eae6d9?text=LOGO+A",
  "https://placehold.co/120x40/1a2413/eae6d9?text=LOGO+B",
  "https://placehold.co/120x40/1a2413/eae6d9?text=LOGO+C",
  "https://placehold.co/120x40/1a2413/eae6d9?text=LOGO+D",
  "https://placehold.co/120x40/1a2413/eae6d9?text=LOGO+E",
];

function LogoRow({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-16 pr-16"
      aria-hidden={ariaHidden}
    >
      {PARTNER_LOGOS.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt={ariaHidden ? "" : `Logo de partner de ejemplo ${i + 1}`}
          width={120}
          height={40}
          className="h-8 w-auto opacity-45"
        />
      ))}
    </div>
  );
}

export function PartnersStrip() {
  return (
    <section className="border-b border-[#eae6d9]/10 bg-[#1a2413] py-12">
      {/* Two identical sets sit inside .logos-wrap so the -50% keyframe loops
          seamlessly; the duplicate is aria-hidden since it adds no content. */}
      <div className="logos-wrap mx-auto max-w-6xl overflow-hidden px-6 sm:px-10">
        <p className="mb-8 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#eae6d9]/40">
          Utilizado por equipos de ejemplo en todo el mundo
        </p>
        <div className="cw-marquee-track">
          <LogoRow />
          <LogoRow ariaHidden />
        </div>
      </div>
    </section>
  );
}
