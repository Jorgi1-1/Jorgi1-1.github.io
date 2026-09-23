"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { BrandMark, StarMark } from "./brand-mark";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const NAV_GROUPS = [
  {
    label: "Productos",
    links: ["Línea A", "Línea B", "Línea C", "Catálogo completo"],
  },
  {
    label: "Nosotros",
    links: ["Nuestra historia", "Equipo", "Sostenibilidad"],
  },
  {
    label: "Ciencia",
    links: ["Investigación", "Estudios de campo", "Publicaciones"],
  },
];

function Wordmark() {
  return (
    <span className="flex flex-col items-center gap-1 leading-none">
      <BrandMark className="size-5 text-[#eae6d9]" />
      <span className="text-[13px] font-medium tracking-tight text-[#eae6d9]">
        Cropwise
      </span>
    </span>
  );
}

export function CropwiseNavbar({ onApplyClick }: { onApplyClick: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>("Productos");
  const [scrolled, setScrolled] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // The bar is transparent over the hero and picks up a solid background
  // once the hero has scrolled away, so it stays legible over the cream
  // sections further down the page.
  //
  // This reads scroll through ScrollTrigger rather than a native `scroll`
  // listener: Lenis drives scrolling here and is already wired into
  // ScrollTrigger.update, so this stays on the page's single synced scroll
  // source instead of racing a second one.
  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 80,
      end: "max",
      // onToggle covers crossing the threshold in either direction; onRefresh
      // syncs the initial state for a page that loads already scrolled.
      onToggle: (self) => setScrolled(self.isActive),
      onRefresh: (self) => setScrolled(self.isActive),
    });
    return () => trigger.kill();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
          scrolled
            ? "border-b border-[#eae6d9]/10 bg-[#1a2413]/90 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="relative flex items-center justify-between px-6 py-5 sm:px-10 lg:px-14">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="cw-menu-overlay"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#eae6d9] transition-colors hover:text-[#9fba85] sm:text-[11px]"
          >
            <StarMark className="size-3" />
            Menú
          </button>

          <a
            href="#"
            aria-label="Inicio — Cropwise"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Wordmark />
          </a>

          <button
            type="button"
            onClick={onApplyClick}
            className="text-[10px] uppercase tracking-[0.18em] text-[#eae6d9] transition-colors hover:text-[#9fba85] sm:text-[11px]"
          >
            Contacto
          </button>
        </div>
      </header>

      <div
        id="cw-menu-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
        className={`fixed inset-0 z-50 flex flex-col bg-[#1a2413] transition-opacity duration-300 ${
          menuOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="relative flex items-center justify-between px-6 py-5 sm:px-10 lg:px-14">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#eae6d9] transition-colors hover:text-[#9fba85] sm:text-[11px]"
          >
            <X className="size-3.5" aria-hidden />
            Cerrar
          </button>

          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Wordmark />
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-12 pt-6 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-3xl">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="border-t border-[#eae6d9]/12">
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroup((cur) => (cur === group.label ? null : group.label))
                  }
                  aria-expanded={openGroup === group.label}
                  className="flex w-full items-center justify-between py-6 text-left font-light tracking-tight text-[#eae6d9]"
                  style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
                >
                  {group.label}
                  <ChevronDown
                    className={`size-6 shrink-0 transition-transform duration-300 ${
                      openGroup === group.label ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>

                <div
                  className={`grid overflow-hidden transition-all duration-300 ${
                    openGroup === group.label
                      ? "grid-rows-[1fr] pb-6 opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <ul className="flex min-h-0 flex-col gap-4">
                    {group.links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          onClick={() => setMenuOpen(false)}
                          className="text-sm uppercase tracking-[0.12em] text-[#eae6d9]/60 transition-colors hover:text-[#eae6d9]"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onApplyClick();
              }}
              className="mt-10 inline-flex items-center gap-3 border border-[#eae6d9]/35 px-6 py-3.5 text-[10px] uppercase tracking-[0.18em] text-[#eae6d9] transition-colors hover:border-[#eae6d9]/70 hover:bg-[#eae6d9]/5 sm:text-[11px]"
            >
              <span aria-hidden className="size-1 rounded-full bg-[#eae6d9]/70" />
              Contacto
              <span aria-hidden className="size-1 rounded-full bg-[#eae6d9]/70" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
