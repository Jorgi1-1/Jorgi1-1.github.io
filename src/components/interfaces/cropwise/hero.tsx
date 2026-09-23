"use client";

import { HeroScene } from "./hero-scene";

export function CropwiseHero() {
  function scrollToProducts() {
    document
      .getElementById("cw-productos")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-[#111809] text-[#eae6d9]">
      <HeroScene />

      <div className="relative z-10 flex h-full flex-col justify-between px-6 pb-12 pt-28 sm:px-10 sm:pt-32 lg:px-14">
        <h1
          className="max-w-[13ch] font-light leading-[0.9] tracking-[-0.025em]"
          style={{ fontSize: "clamp(2.6rem, 7vw, 8.5rem)" }}
        >
          Titular de
          <br />
          ejemplo.
        </h1>

        <div className="max-w-md md:self-end">
          <p
            className="font-light leading-[1.04] tracking-[-0.015em]"
            style={{ fontSize: "clamp(1.55rem, 3.1vw, 3.6rem)" }}
          >
            Para tu campo.
            <br />
            Para el planeta.
          </p>

          <p className="mt-5 max-w-[36ch] text-[10px] uppercase leading-[1.7] tracking-[0.14em] text-[#eae6d9]/70 sm:text-[11px]">
            Texto de descripción de ejemplo en mayúsculas que resume la
            propuesta de valor del producto placeholder.
          </p>

          <button
            type="button"
            onClick={scrollToProducts}
            className="mt-7 inline-flex items-center gap-3 border border-[#eae6d9]/35 px-6 py-3.5 text-[10px] uppercase tracking-[0.18em] text-[#eae6d9] transition-colors hover:border-[#eae6d9]/70 hover:bg-[#eae6d9]/5 sm:text-[11px]"
          >
            <span aria-hidden className="size-1 rounded-full bg-[#eae6d9]/70" />
            Explorar productos
            <span aria-hidden className="size-1 rounded-full bg-[#eae6d9]/70" />
          </button>
        </div>
      </div>
    </section>
  );
}
