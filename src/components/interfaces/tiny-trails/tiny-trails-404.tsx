"use client";

import { useEffect, useState, type RefObject } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { ArrowLeft, Menu, X } from "lucide-react";

import { useStretchScale } from "./use-stretch-scale";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const NAV_LINKS = ["About Us", "Programs", "Reviews", "FAQ", "Contacts"];

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260713_234424_b1332b69-2e69-4302-8dbc-40f86846afbd.mp4";

export function TinyTrails404() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { textRef, scaleY } = useStretchScale();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div
      className={`${inter.className} relative flex h-screen w-full flex-col overflow-hidden`}
      style={{
        background: "linear-gradient(to bottom, #FF8233, #FDAC55)",
      }}
    >
      <BackgroundType textRef={textRef} scaleY={scaleY} />

      <TinyTrailsNav menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <CenterVideo />

      <div className="relative z-30 mt-auto flex flex-col items-center px-4 pb-8 text-center sm:pb-16">
        <h1 className="mb-3 text-lg font-medium text-white sm:mb-4 sm:text-xl md:text-2xl">
          Oops, something went wrong!
        </h1>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-105 hover:shadow-lg sm:px-8 sm:py-4 sm:text-base"
          style={{ backgroundColor: "#F16524" }}
        >
          <ArrowLeft className="size-4 sm:size-5" aria-hidden />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- background --- */

function BackgroundType({
  textRef,
  scaleY,
}: {
  textRef: RefObject<HTMLDivElement | null>;
  scaleY: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: 0.8,
        maskImage: "linear-gradient(to bottom, black 40%, transparent 95%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, black 40%, transparent 95%)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="h-[22vh] w-[clamp(120px,20vw,400px)] rounded-full bg-white sm:h-[26vh] md:h-[50vh]"
          style={{
            transform: `scaleY(${scaleY})`,
            transformOrigin: "center",
          }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={textRef}
          className="whitespace-nowrap font-black leading-none tracking-tighter text-white"
          style={{
            fontSize: "clamp(200px, 48vw, 800px)",
            transform: `scale(1.15, ${scaleY * 1.4})`,
          }}
        >
          404
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ nav --- */

function Logo({ textClassName = "text-lg sm:text-xl" }: { textClassName?: string }) {
  return (
    <div className="flex items-center">
      <div className="grid grid-cols-2 gap-0.5">
        <span className="size-2.5 rounded-full bg-white sm:size-3" />
        <span className="size-2.5 rounded-full bg-white sm:size-3" />
        <span className="size-2.5 rounded-full bg-white sm:size-3" />
        <span className="size-2.5 rounded-full bg-white sm:size-3" />
      </div>
      <span className={`ml-1 font-bold text-white ${textClassName}`}>
        TinyTrails
      </span>
    </div>
  );
}

function TinyTrailsNav({
  onToggleMenu,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    <nav className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 md:px-12">
      <Logo />

      <div className="hidden items-center gap-1 md:flex">
        {NAV_LINKS.map((link) => (
          <a
            key={link}
            href="#"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
            style={{ color: "#F16524" }}
          >
            {link}
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={onToggleMenu}
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-full px-4 py-2 text-white transition-colors hover:opacity-90 sm:px-5 sm:py-2.5"
        style={{ backgroundColor: "#F16524" }}
      >
        <Menu className="size-4" aria-hidden />
        <span className="hidden text-sm font-medium sm:inline">Menu</span>
      </button>
    </nav>
  );
}

/* -------------------------------------------------------------- overlay --- */

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        open ? "visible" : "invisible"
      }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute right-0 top-0 h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[380px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "linear-gradient(135deg, #FF6B1A 0%, #FF9642 100%)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <Logo textClassName="text-xl" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="grid size-10 place-items-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-2 px-6 py-4">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link}
              href="#"
              onClick={onClose}
              className="rounded-2xl bg-white/10 px-6 py-4 text-lg font-semibold text-white transition-all duration-300 hover:bg-white/20"
              style={{
                transitionDelay: open ? `${150 + i * 60}ms` : "0ms",
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(16px)",
              }}
            >
              {link}
            </a>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6">
          <Link
            href="/"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-base font-semibold transition-all duration-300 hover:scale-[1.02]"
            style={{
              color: "#F16524",
              transitionDelay: open ? "450ms" : "0ms",
              opacity: open ? 1 : 0,
            }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- video --- */

function CenterVideo() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ marginTop: "calc(-6vh - 40px)" }}
    >
      <div className="h-[85vh] w-[120vw] sm:h-[70vh] sm:w-[70vw] md:h-[78vh] md:w-[62vw]">
        <video
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          className="pointer-events-none size-full object-contain mix-blend-darken"
        />
      </div>
    </div>
  );
}
