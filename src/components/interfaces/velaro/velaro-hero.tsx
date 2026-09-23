"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  Heart,
  Menu,
  Play,
  Search,
  ShoppingCart,
} from "lucide-react";

const NAV_LINKS = ["NEW ARRIVALS", "MEN", "WOMEN", "COLLECTION"];

/** Placeholder art. Fixed seeds keep the composition stable across reloads. */
const img = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

/** Warm grade unifies whatever imagery loads with the orange palette.
 *  Kept light — heavier sepia turned darkened images to mud. */
const WARM_GRADE = "saturate(1.12) contrast(1.02) sepia(0.08) hue-rotate(-6deg)";

export function VelaroHero() {
  const [liked, setLiked] = useState(false);

  return (
    <section className="relative isolate w-full overflow-hidden bg-[#FF6A00] text-white">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col px-5 pb-12 pt-6 sm:px-8 lg:px-12 lg:pb-16 lg:pt-8">
        <VelaroNav />

        {/* ---- Headline: two near-touching lines, cards inline on line 1 ---- */}
        <div className="mt-10 lg:mt-14">
          <div className="flex flex-col items-center gap-5 lg:flex-row lg:justify-between lg:gap-4">
            <HeadlineWord>DEFINE</HeadlineWord>
            <ThumbnailRow />
            <HeadlineWord>YOUR</HeadlineWord>
          </div>

          {/* Sized to just fill the container: much above ~8.4vw and the
              trailing Y clips off the right edge. */}
          <h2
            className="mt-2 whitespace-nowrap text-center font-black uppercase leading-[0.82] tracking-[-0.01em] lg:mt-0"
            style={{ fontSize: "clamp(1.8rem, 8.4vw, 7.4rem)" }}
          >
            Everyday Luxury
          </h2>
        </div>

        {/* ---- Body: left rail / centred cutout / collection card ---- */}
        <div className="relative mt-8 lg:mt-0">
          {/* Lighter vertical band anchors the cutout to the composition. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-[340px] -translate-x-1/2 bg-white/[0.07] lg:block xl:w-[400px]"
            style={{
              // Without the fade the band ends in a hard rectangle under the
              // cutout, which reads as a stray box.
              maskImage:
                "linear-gradient(to bottom, black 70%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 70%, transparent 100%)",
            }}
          />

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6 xl:gap-10">
            {/* Left rail: pinned to top and bottom of the row. */}
            <div className="order-2 flex flex-col gap-8 lg:order-1 lg:justify-between lg:gap-0 lg:pb-2">
              <LeftTop />
              <LeftBottom />
            </div>

            {/* Pulled up so the hat crosses the baseline of the headline. */}
            <div className="order-1 lg:order-2 lg:-mt-20 xl:-mt-24">
              <ModelShowcase />
            </div>

            {/* Collection card sits low on the right, not full-height. */}
            <div className="order-3 flex justify-center lg:items-end lg:justify-end lg:pb-2">
              <CollectionCard
                liked={liked}
                onToggleLike={() => setLiked(!liked)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ nav --- */

function VelaroMark({ className }: { className?: string }) {
  // Stylised V mark — lucide has no equivalent, and an off-the-shelf leaf
  // read as a different brand.
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <path
        d="M4 6c7.5 0 12 4.2 12 11.5V28C8.8 28 4 22.6 4 15.2V6Z"
        fill="currentColor"
      />
      <path
        d="M28 4c0 8-4.6 13.4-11 14.6C17 10.4 21.4 5 28 4Z"
        fill="#FFE500"
      />
    </svg>
  );
}

function VelaroNav() {
  return (
    <nav className="flex items-center justify-between gap-6">
      <a
        href="#"
        className="flex shrink-0 items-center gap-2.5 text-2xl font-black tracking-[0.06em] sm:text-[1.75rem]"
      >
        <VelaroMark className="size-7 sm:size-8" />
        VELARO
      </a>

      <ul className="hidden items-center gap-9 lg:flex">
        {NAV_LINKS.map((link) => (
          <li key={link}>
            <a
              href="#"
              className="text-[13px] font-semibold tracking-[0.06em] text-white/90 transition-colors hover:text-white"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex shrink-0 items-center gap-5">
        <button
          type="button"
          aria-label="Buscar"
          className="transition-opacity hover:opacity-75"
        >
          <Search className="size-[22px]" aria-hidden />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 text-[15px] font-semibold"
        >
          <span className="hidden sm:inline">Cart</span>
          <span className="relative">
            <ShoppingCart className="size-[22px]" aria-hidden />
            <span className="absolute -right-1.5 -top-1.5 grid size-[15px] place-items-center rounded-full bg-[#FFE500] text-[9px] font-black text-black">
              3
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-label="Abrir menú"
          className="lg:hidden"
        >
          <Menu className="size-[22px]" aria-hidden />
        </button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------- headline --- */

function HeadlineWord({ children }: { children: string }) {
  return (
    <h1
      className="shrink-0 font-black uppercase leading-[0.82] tracking-[-0.01em]"
      style={{ fontSize: "clamp(2.4rem, 8.4vw, 7.4rem)" }}
    >
      {children}
    </h1>
  );
}

/* ----------------------------------------------------------- thumbnails --- */

function ThumbnailRow() {
  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
      <GlassCard solid>
        <Image
          src={img("velaro-thumb-1", 240, 240)}
          alt="Camisa estampada"
          fill
          sizes="112px"
          priority
          className="object-cover"
          style={{ filter: WARM_GRADE }}
        />
      </GlassCard>

      <GlassCard solid>
        <Image
          src={img("velaro-thumb-2", 240, 240)}
          alt="Look de la colección"
          fill
          sizes="112px"
          priority
          className="object-cover"
          style={{ filter: WARM_GRADE }}
        />
      </GlassCard>

      <GlassCard>
        <span className="grid size-full place-items-center">
          <VelaroMark className="size-8 sm:size-10" />
        </span>
      </GlassCard>

      <GlassCard>
        <span className="grid size-full place-items-center">
          <Play className="size-8 fill-white text-white sm:size-10" aria-hidden />
        </span>
      </GlassCard>
    </div>
  );
}

function GlassCard({
  children,
  solid = false,
}: {
  children: React.ReactNode;
  solid?: boolean;
}) {
  return (
    <div
      className={`relative size-[68px] shrink-0 overflow-hidden rounded-[1.25rem] sm:size-[88px] lg:size-[104px] xl:size-[116px] ${
        solid
          ? "bg-[#FFB067]"
          : "border border-white/25 bg-white/20 backdrop-blur-md"
      }`}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- model --- */

function ModelShowcase() {
  return (
    <div className="mx-auto w-[240px] sm:w-[290px] lg:w-[330px] xl:w-[370px]">
      {/* Fixed heights keep the cutout from blowing out the row on any
          viewport, since a tall aspect ratio would scale unbounded. */}
      <div
        className="relative h-[340px] w-full overflow-hidden rounded-t-[11rem] sm:h-[420px] lg:h-[530px] xl:h-[600px]"
        style={{
          // Long fade reproduces the motion-blurred dissolve at the hem.
          maskImage:
            "linear-gradient(to bottom, black 62%, rgba(0,0,0,0.45) 82%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 62%, rgba(0,0,0,0.45) 82%, transparent 100%)",
        }}
      >
        <Image
          src={img("velaro-model", 860, 1200)}
          alt="Modelo con prendas de la colección VELARO"
          fill
          priority
          sizes="(max-width: 640px) 260px, (max-width: 1280px) 380px, 430px"
          className="object-cover object-top"
          style={{ filter: WARM_GRADE }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- left rail --- */

function LeftTop() {
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-[15rem] text-[15px] font-semibold leading-snug">
        Premium fabrics. Clean cuts. Effortless elegance.
      </p>

      <div className="relative size-[150px] overflow-hidden rounded-2xl bg-[#FF8526] lg:size-[170px] xl:size-[190px]">
        <Image
          src={img("velaro-product", 400, 400)}
          alt="Camisa oversize de lino"
          fill
          sizes="190px"
          priority
          className="object-cover"
          style={{ filter: WARM_GRADE }}
        />
      </div>
    </div>
  );
}

function LeftBottom() {
  return (
    <div className="flex flex-col gap-5">
      <SocialProof />

      <p className="max-w-[19rem] text-[15px] leading-relaxed text-white/90">
        Modern clothing crafted for those who value simplicity, quality, and
        timeless appeal.
      </p>

      <button
        type="button"
        className="inline-flex w-fit items-center rounded-lg bg-[#FFE500] px-6 py-3 text-[13px] font-black tracking-[0.06em] text-black transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#FF6A00]"
      >
        SHOP NOW
      </button>
    </div>
  );
}

function SocialProof() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3">
        {["a", "b"].map((seed) => (
          <div
            key={seed}
            className="relative size-9 overflow-hidden rounded-full border-2 border-[#FF6A00]"
          >
            <Image
              src={img(`velaro-avatar-${seed}`, 96, 96)}
              alt=""
              fill
              sizes="36px"
              priority
              className="object-cover"
              style={{ filter: WARM_GRADE }}
            />
          </div>
        ))}
      </div>

      <span aria-hidden className="h-px w-12 bg-white/45" />

      <span className="grid size-9 place-items-center rounded-full border border-white/45">
        <ShoppingCart className="size-4" aria-hidden />
      </span>
    </div>
  );
}

/* ---------------------------------------------------------- right column --- */

function CollectionCard({
  liked,
  onToggleLike,
}: {
  liked: boolean;
  onToggleLike: () => void;
}) {
  return (
    <article className="w-[250px] rounded-2xl border border-white/45 p-2.5 xl:w-[270px]">
      <div className="relative h-[190px] w-full overflow-hidden rounded-xl xl:h-[205px]">
        <Image
          src={img("velaro-collection", 560, 560)}
          alt="Minimal Linen Collection"
          fill
          sizes="270px"
          priority
          className="object-cover"
          style={{ filter: WARM_GRADE }}
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
        />

        <h3 className="absolute inset-x-3 bottom-3 text-[17px] font-bold leading-tight">
          Minimal Linen
          <br />
          Collection
        </h3>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Quitar de favoritos" : "Añadir a favoritos"}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-white/45 transition-colors hover:bg-white/15"
        >
          <Heart
            className={`size-4 transition-colors ${
              liked ? "fill-[#FFE500] text-[#FFE500]" : "fill-white text-white"
            }`}
            aria-hidden
          />
        </button>

        <button
          type="button"
          className="flex-1 rounded-lg bg-white px-3 py-2 text-[12px] font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
        >
          View Collection
        </button>

        <button
          type="button"
          aria-label="Siguiente colección"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-white/45 transition-colors hover:bg-white/15"
        >
          <ArrowUpRight className="size-4" aria-hidden />
        </button>
      </div>
    </article>
  );
}
