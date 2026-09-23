"use client";

import { useEffect, useRef, useState } from "react";
import { Inter } from "next/font/google";
import { ArrowUpRight, Award, Crown, X } from "lucide-react";

import "./vanguard-hero.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const NAV_LINKS = ["Projects", "Studio", "Offerings", "Inquire"];

const STATS = [
  { value: "250+", label: "Brands Transformed" },
  { value: "95%", label: "Client Retention" },
  { value: "10+", label: "Years in the Game" },
];

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_154941_df1a96e1-a06f-450c-bd02-d863414cc1a0.mp4";

export function VanguardHero() {
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React's `muted` prop doesn't reliably reach the DOM property in time
    // for the browser's autoplay check on first paint — setting it directly
    // closes that gap. Without it, autoplay can silently no-op.
    video.muted = true;

    // The autoplay attribute alone isn't reliable everywhere — some browsers
    // need an explicit play() call once the element is mounted.
    const tryPlay = () => video.play().catch(() => {});
    tryPlay();

    // Browsers can silently re-pause video that loads in a background tab;
    // retry once the tab is visible or the visitor interacts.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("pointerdown", tryPlay, { once: true });
    document.addEventListener("keydown", tryPlay, { once: true });

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("pointerdown", tryPlay);
      document.removeEventListener("keydown", tryPlay);
    };
  }, []);

  return (
    <section
      className={`${inter.className} relative h-screen w-full overflow-hidden bg-black text-white`}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 -z-10 size-full object-cover"
        src={VIDEO_SRC}
        autoPlay
        muted
        loop
        playsInline
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/35" />

      <VanguardNav menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="relative flex h-full items-center px-6 sm:px-10 lg:px-16">
        <div className="max-w-2xl">
          <p className="animate-fade-up mb-6 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70 sm:text-sm lg:mb-8">
            <Crown className="size-4 text-white/70" aria-hidden />
            World-Class Digital Collective
          </p>

          <h1 className="font-podium animate-fade-up-delay-1 uppercase leading-[0.92] tracking-tight text-white">
            <span
              className="block"
              style={{ fontSize: "clamp(2.8rem, 8vw, 7rem)" }}
            >
              Design.
            </span>
            <span
              className="block"
              style={{ fontSize: "clamp(2.8rem, 8vw, 7rem)" }}
            >
              Disrupt.
            </span>
            <span
              className="block"
              style={{ fontSize: "clamp(2.8rem, 8vw, 7rem)" }}
            >
              Conquer.
            </span>
          </h1>

          <p className="animate-fade-up-delay-2 mt-6 max-w-md text-sm leading-relaxed text-white/70 sm:text-base lg:mt-8">
            We build fierce brand identities
            <br />
            that don&apos;t just turn heads —{" "}
            <span className="font-bold text-white">they lead.</span>
          </p>

          <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center gap-4 sm:gap-6 lg:mt-10">
            <button
              type="button"
              className="group inline-flex items-center gap-2 bg-black px-5 py-3 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-neutral-900 sm:px-7 sm:py-4 sm:text-xs"
            >
              See Our Work
              <ArrowUpRight
                className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <Award className="size-8 text-white/50" aria-hidden />
              <p className="text-xs uppercase leading-tight tracking-wider text-white/60">
                Top-Rated
                <br />
                Brand Studio
              </p>
            </div>
          </div>

          <div className="animate-fade-up-delay-4 mt-8 flex flex-wrap gap-6 sm:mt-10 sm:gap-12 lg:mt-14 lg:gap-16">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-white/50 sm:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ nav --- */

function VanguardNav({
  menuOpen,
  onToggleMenu,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    <nav className="relative flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16 lg:py-7">
      <span className="font-podium text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
        VANGUARD
      </span>

      <ul className="hidden items-center gap-8 md:flex">
        {NAV_LINKS.map((link) => (
          <li key={link}>
            <a
              href="#"
              className="text-sm uppercase tracking-widest text-white/80 transition-colors hover:text-white"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      <a
        href="#"
        className="hidden items-center gap-2 border border-white/30 px-6 py-3 text-xs uppercase tracking-widest text-white transition-colors hover:border-white/60 hover:bg-white/10 md:inline-flex"
      >
        Get in Touch
        <ArrowUpRight className="size-4" aria-hidden />
      </a>

      <button
        type="button"
        onClick={onToggleMenu}
        aria-expanded={menuOpen}
        aria-controls="vanguard-mobile-menu"
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        className="flex flex-col items-end justify-center gap-1.5 md:hidden"
      >
        <div className="h-0.5 w-6 bg-white" />
        <div className="h-0.5 w-6 bg-white" />
        <div className="h-0.5 w-4 bg-white" />
      </button>
    </nav>
  );
}

/* -------------------------------------------------------------- overlay --- */

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      id="vanguard-mobile-menu"
      className={`fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm transition-all duration-500 md:hidden ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <div className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="font-podium text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
          VANGUARD
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="text-white"
        >
          <X className="size-7" aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-start justify-center gap-6 px-6 sm:px-10">
        {NAV_LINKS.map((link, i) => (
          <a
            key={link}
            href="#"
            onClick={onClose}
            className="font-podium text-4xl uppercase text-white transition-all duration-500 sm:text-5xl"
            style={{
              transitionDelay: `${i * 80 + 100}ms`,
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(20px)",
            }}
          >
            {link}
          </a>
        ))}

        <a
          href="#"
          onClick={onClose}
          className="mt-4 inline-flex items-center gap-2 border border-white/30 px-6 py-3 text-xs uppercase tracking-widest text-white transition-all duration-500 hover:border-white/60 hover:bg-white/10"
          style={{
            transitionDelay: `${NAV_LINKS.length * 80 + 100}ms`,
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0)" : "translateY(20px)",
          }}
        >
          Get in Touch
          <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}
