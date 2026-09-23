"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import { SplitHeading } from "./split-heading";

const LOCATIONS = [
  { region: "Región 1", country: "País de ejemplo A", tags: ["Etiqueta 1", "Etiqueta 2"] },
  { region: "Región 2", country: "País de ejemplo B", tags: ["Etiqueta 3"] },
  { region: "Región 3", country: "País de ejemplo C", tags: ["Etiqueta 1", "Etiqueta 4"] },
  { region: "Región 4", country: "País de ejemplo D", tags: ["Etiqueta 2"] },
  { region: "Región 5", country: "País de ejemplo E", tags: ["Etiqueta 3", "Etiqueta 4"] },
  { region: "Región 6", country: "País de ejemplo F", tags: ["Etiqueta 1"] },
  { region: "Región 7", country: "País de ejemplo G", tags: ["Etiqueta 2", "Etiqueta 3"] },
  { region: "Región 8", country: "País de ejemplo H", tags: ["Etiqueta 4"] },
];

export function LocationsSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="bg-[#1a2413] px-6 py-24 text-[#eae6d9] sm:px-10">
      <div className="mx-auto max-w-5xl">
        <SplitHeading className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-5xl">
          {"Presencia de ejemplo en múltiples regiones."}
        </SplitHeading>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <ul className="flex flex-col divide-y divide-[#eae6d9]/10 rounded-2xl border border-[#eae6d9]/10">
            {LOCATIONS.map((loc, i) => {
              const active = i === activeIndex;
              return (
                <li key={loc.region}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onFocus={() => setActiveIndex(i)}
                    onClick={() => setActiveIndex(i)}
                    className={`cw-marker flex w-full items-center justify-between px-5 py-4 text-left ${
                      active ? "active bg-[#eae6d9]/10" : ""
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <MapPin
                        className={`size-4 ${active ? "text-[#9fba85]" : "text-[#eae6d9]/40"}`}
                        aria-hidden
                      />
                      <span className="text-sm font-medium">{loc.region}</span>
                    </span>
                    <span className="text-xs text-[#eae6d9]/50">{loc.country}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="cw-marker active rounded-2xl border border-[#eae6d9]/10 bg-[#eae6d9]/5 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9fba85]">
              {LOCATIONS[activeIndex].country}
            </p>
            <h3 className="mt-2 text-2xl font-bold">{LOCATIONS[activeIndex].region}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {LOCATIONS[activeIndex].tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#eae6d9]/15 px-3 py-1 text-xs text-[#eae6d9]/70"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm leading-relaxed text-[#eae6d9]/60">
              Descripción de ejemplo para esta región. Reemplazar con
              información real sobre operaciones, equipo local o cobertura.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
