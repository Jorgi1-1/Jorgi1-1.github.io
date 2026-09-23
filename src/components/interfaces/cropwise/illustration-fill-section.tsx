"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SplitHeading } from "./split-heading";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const IMG_SEED = "cropwise-field-fill";

export function IllustrationFillSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const colorImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const colorImg = colorImgRef.current;
    if (!container || !colorImg) return;

    const tween = gsap.fromTo(
      colorImg,
      { clipPath: "inset(0% 0% 100% 0%)" },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top 75%",
          end: "bottom 60%",
          scrub: 1,
        },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section className="bg-[#eae6d9] px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <SplitHeading className="max-w-xl text-3xl font-extrabold tracking-tight text-[#1a2413] sm:text-5xl">
          {"Resultados visibles, campo por campo."}
        </SplitHeading>
        <p className="mt-4 max-w-xl text-sm text-[#1a2413]/70 sm:text-base">
          Texto de apoyo genérico. La versión a color se revela
          progresivamente a medida que avanza el scroll.
        </p>

        <div
          ref={containerRef}
          className="relative mt-12 aspect-[16/9] w-full overflow-hidden rounded-3xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://picsum.photos/seed/${IMG_SEED}-outline/1200/675`}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover grayscale contrast-75"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={colorImgRef}
            src={`https://picsum.photos/seed/${IMG_SEED}-color/1200/675`}
            alt="Ilustración de ejemplo de resultados en campo"
            className="absolute inset-0 size-full object-cover"
            style={{ clipPath: "inset(0% 0% 100% 0%)" }}
          />
        </div>
      </div>
    </section>
  );
}
