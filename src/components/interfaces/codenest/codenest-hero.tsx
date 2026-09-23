"use client";

import { useEffect, useRef, useState } from "react";
import { Inter, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, Menu, X } from "lucide-react";

import "./codenest-hero.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});

const NAV_LINKS = ["Enlace 1", "Enlace 2", "Enlace 3", "Enlace 4"];

const VIDEO_SRC =
  "https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8";

export function CodeNestHero() {
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    // React's `muted` prop doesn't reliably reach the DOM property in time
    // for the browser's autoplay check on first paint — set it directly.
    video.muted = true;
    const tryPlay = () => video.play().catch(() => {});

    async function setup() {
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (Hls.isSupported()) {
        // enableWorker: false — worker-thread creation is blocked in some
        // sandboxed environments and silently breaks playback there.
        hls = new Hls({ enableWorker: false });
        hls.loadSource(VIDEO_SRC);
        hls.attachMedia(video!);
      } else if (video!.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari lacks MSE support for HLS, but plays it natively.
        video!.src = VIDEO_SRC;
      }
      tryPlay();
    }
    setup();

    // Browsers can silently re-pause video that loads in a background tab;
    // retry once the tab is visible or the visitor interacts.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("pointerdown", tryPlay, { once: true });
    document.addEventListener("keydown", tryPlay, { once: true });

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("pointerdown", tryPlay);
      document.removeEventListener("keydown", tryPlay);
      hls?.destroy();
    };
  }, []);

  return (
    <section
      className={`${inter.className} isolate relative h-screen w-full overflow-hidden bg-[#070b0a] text-white`}
    >
      <video
        ref={videoRef}
        aria-hidden
        className="absolute inset-0 -z-30 size-full object-cover opacity-60"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Left-to-right dark gradient for text legibility */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background: "linear-gradient(to right, #070b0a 15%, transparent 70%)",
        }}
      />
      {/* Bottom-up gradient for readability */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-t from-[#070b0a] via-[#070b0a]/35 to-transparent"
      />

      {/* Grid system: three vertical lines at 25/50/75%, desktop only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden md:block">
        <div className="absolute inset-y-0 left-1/4 w-px bg-white/10" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
        <div className="absolute inset-y-0 left-3/4 w-px bg-white/10" />
      </div>

      {/* Central glow */}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-auto w-[min(900px,100vw)] -translate-x-1/2"
        viewBox="0 0 900 480"
      >
        <defs>
          <filter id="codenest-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="25" />
          </filter>
          <radialGradient id="codenest-glow-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5ed29c" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#0f766e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx="450"
          cy="110"
          rx="380"
          ry="130"
          fill="url(#codenest-glow-fill)"
          filter="url(#codenest-glow)"
        />
      </svg>

      <CodeNestNav menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="relative z-10 flex h-full flex-col items-start justify-start px-6 pt-44 sm:px-10 sm:pt-48 lg:px-16 lg:pt-52">
        <div
          className="codenest-animate-1 codenest-glass-card relative mb-10 flex w-72 translate-y-[-50px] flex-col justify-between rounded-2xl p-4 text-left sm:mb-16"
          style={{ height: "200px" }}
        >
          <span className="text-sm text-white/70">[ 2025 ]</span>
          <p className={`${plusJakarta.className} text-[18px] font-semibold leading-snug text-white`}>
            Encabezado de ejemplo en{" "}
            <span className={`${instrumentSerif.className} text-[#5ed29c]`}>
              cursiva
            </span>
          </p>
          <p className="pr-5 text-[11px] leading-relaxed text-white/60">
            Texto de descripción placeholder para esta tarjeta de ejemplo.
          </p>
          <ArrowRight
            className="absolute bottom-4 right-4 size-4 text-white/50"
            aria-hidden
          />
        </div>

        <p
          className={`${plusJakarta.className} codenest-animate-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#5ed29c]`}
        >
          Categoría de ejemplo
        </p>

        <h1
          className="codenest-animate-2 mt-3 max-w-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-white"
          style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
        >
          Así se ve tu titular principal
          <span className="text-[#5ed29c]">.</span>
        </h1>

        <p className="codenest-animate-3 mt-6 max-w-[512px] text-sm leading-relaxed text-white/70">
          Este es un texto de descripción de ejemplo. Aquí se mostrará el
          copy final una vez aprobado por el cliente.
        </p>

        <button
          type="button"
          className="codenest-animate-4 mt-8 inline-flex items-center gap-2 rounded-full bg-[#5ed29c] px-6 py-3 text-xs font-bold uppercase tracking-wide text-[#070b0a] transition-transform hover:scale-105"
        >
          Ver más
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ nav --- */

function CodeNestNav({
  menuOpen,
  onToggleMenu,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    <nav className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
      <span className={`${plusJakarta.className} text-lg font-extrabold tracking-tight text-white`}>
        MARCA
      </span>

      <ul className="hidden flex-1 items-center justify-center gap-8 md:flex">
        {NAV_LINKS.map((link) => (
          <li key={link}>
            <a
              href="#"
              className="text-base uppercase tracking-wide text-white transition-colors hover:text-[#5ed29c]"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      <a
        href="#"
        className={`${plusJakarta.className} hidden text-xs font-bold uppercase tracking-widest text-white transition-colors hover:text-[#5ed29c] md:inline-block`}
      >
        [ Enlace 5 ]
      </a>

      <button
        type="button"
        onClick={onToggleMenu}
        aria-expanded={menuOpen}
        aria-controls="codenest-mobile-menu"
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        className="text-white md:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </button>
    </nav>
  );
}

/* -------------------------------------------------------------- overlay --- */

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      id="codenest-mobile-menu"
      className={`fixed inset-0 z-40 flex flex-col bg-[#070b0a]/98 backdrop-blur-sm transition-all duration-500 md:hidden ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <div className="flex items-center justify-between px-6 py-6 sm:px-10">
        <span className={`${plusJakarta.className} text-lg font-extrabold tracking-tight text-white`}>
          MARCA
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
            className="text-4xl font-bold uppercase text-white transition-all duration-500 hover:text-[#5ed29c] sm:text-5xl"
            style={{
              transitionDelay: `${i * 80 + 100}ms`,
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(20px)",
            }}
          >
            {link}
          </a>
        ))}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#5ed29c] px-6 py-3 text-xs font-bold uppercase tracking-wide text-[#070b0a] transition-all duration-500"
          style={{
            transitionDelay: `${NAV_LINKS.length * 80 + 100}ms`,
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0)" : "translateY(20px)",
          }}
        >
          Ver más
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
