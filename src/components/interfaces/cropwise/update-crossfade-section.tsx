"use client";

import { useEffect, useState } from "react";

const VERSIONS = [
  { label: "Próxima actualización", value: "Marzo 2026" },
  { label: "Próxima actualización", value: "Edición de ejemplo #2" },
];

export function UpdateCrossfadeSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((v) => (v + 1) % VERSIONS.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="bg-[#eae6d9] px-6 py-24 text-center sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6f8a56]">
        {VERSIONS[active].label}
      </p>
      <div className="relative mx-auto mt-4 h-16 max-w-md">
        {VERSIONS.map((v, i) => (
          <span
            key={v.value}
            className={`cw-crossfade-layer absolute inset-0 flex items-center justify-center text-3xl font-extrabold tracking-tight text-[#1a2413] sm:text-4xl ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={i !== active}
          >
            {v.value}
          </span>
        ))}
      </div>
    </section>
  );
}
