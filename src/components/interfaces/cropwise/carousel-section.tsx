"use client";

import { useEffect, useRef } from "react";
import Splide from "@splidejs/splide";
import "@splidejs/splide/css";

import { SplitHeading } from "./split-heading";

const CARDS = [
  {
    seed: "cropwise-community-1",
    title: "Artículo de comunidad de ejemplo 1",
    text: "Texto corto de ejemplo para esta tarjeta del carrusel.",
  },
  {
    seed: "cropwise-community-2",
    title: "Artículo de comunidad de ejemplo 2",
    text: "Texto corto de ejemplo para esta tarjeta del carrusel.",
  },
  {
    seed: "cropwise-community-3",
    title: "Artículo de comunidad de ejemplo 3",
    text: "Texto corto de ejemplo para esta tarjeta del carrusel.",
  },
  {
    seed: "cropwise-community-4",
    title: "Artículo de comunidad de ejemplo 4",
    text: "Texto corto de ejemplo para esta tarjeta del carrusel.",
  },
];

export function CarouselSection() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const splide = new Splide(el, {
      type: "loop",
      drag: true,
      perPage: 3,
      gap: "1.5rem",
      pagination: false,
      breakpoints: {
        1024: { perPage: 2 },
        640: { perPage: 1 },
      },
    }).mount();

    return () => {
      splide.destroy();
    };
  }, []);

  return (
    <section className="bg-[#eae6d9] px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <SplitHeading className="max-w-xl text-3xl font-extrabold tracking-tight text-[#1a2413] sm:text-5xl">
          {"Comunidad y novedades de ejemplo."}
        </SplitHeading>

        <div ref={trackRef} className="splide mt-12">
          <div className="splide__track">
            <ul className="splide__list">
              {CARDS.map((card) => (
                <li key={card.seed} className="splide__slide">
                  <div className="overflow-hidden rounded-2xl border border-[#1a2413]/10 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://picsum.photos/seed/${card.seed}/480/320`}
                      alt=""
                      aria-hidden
                      className="h-48 w-full object-cover"
                    />
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-[#1a2413]">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm text-[#1a2413]/60">{card.text}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
