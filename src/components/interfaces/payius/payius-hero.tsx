"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Menu,
  Repeat,
  X,
} from "lucide-react";

import { OrbitGraphic } from "./orbit-graphic";
import "./payius-hero.css";

const NAV_LINKS = ["Product", "Features", "Pricing", "About", "Contact"];

const INVOICE_OPTIONS = [
  { label: "Blank invoice", icon: FileText },
  { label: "From a template", icon: Check },
  { label: "Recurring invoice", icon: Repeat },
];

export function PayiusHero() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // rAF rather than a synchronous setState so the initial (hidden) styles
    // get a frame to paint — otherwise the transition never runs.
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className="relative isolate min-h-[46rem] w-full overflow-hidden bg-[#080E18] text-white lg:min-h-[52rem]">
      {/* Ambient wash keeps the flat navy from reading as a dead rectangle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 55% at 78% 42%, rgba(37,99,235,0.22) 0%, transparent 70%)",
        }}
      />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <PayiusNav shown={shown} />

        <div className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:py-24">
          <div>
            <h1
              className="payius-reveal max-w-[16ch] text-[clamp(2.5rem,5.6vw,4.25rem)] font-bold leading-[1.05] tracking-[-0.03em]"
              data-shown={shown}
              style={{ ["--reveal-delay" as string]: "80ms" }}
            >
              Modern payments for forward-thinking teams
            </h1>

            <p
              className="payius-reveal mt-6 max-w-[46ch] text-base leading-relaxed text-[#9CA3AF] sm:text-[17px]"
              data-shown={shown}
              style={{ ["--reveal-delay" as string]: "200ms" }}
            >
              Send invoices, collect payments, and reconcile revenue from a
              single dashboard. No hidden fees, no month-end spreadsheet
              archaeology.
            </p>

            <div
              className="payius-reveal mt-9 flex flex-wrap items-center gap-x-7 gap-y-4"
              data-shown={shown}
              style={{ ["--reveal-delay" as string]: "320ms" }}
            >
              <CreateInvoiceButton />

              <a
                href="#"
                className="group inline-flex items-center gap-1.5 rounded text-sm font-medium text-white/85 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080E18]"
              >
                Try free for 30 days
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <OrbitGraphic shown={shown} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ nav --- */

function PayiusNav({ shown }: { shown: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="payius-reveal relative flex items-center justify-between gap-4"
      data-shown={shown}
    >
      <a
        href="#"
        className="text-xl font-bold tracking-[-0.02em] text-white sm:text-[22px]"
      >
        payius
      </a>

      <ul className="hidden items-center gap-8 lg:flex">
        {NAV_LINKS.map((link) => (
          <li key={link}>
            <a
              href="#"
              className="text-sm text-[#9CA3AF] transition-colors hover:text-white"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <a
          href="#"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] sm:px-5 sm:py-2.5"
        >
          <span className="whitespace-nowrap">Login / Sign Up</span>
          <ArrowRight className="size-4" aria-hidden />
        </a>

        {/* Without this the nav links are unreachable below lg. */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="payius-mobile-nav"
          aria-label="Abrir menú"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] lg:hidden"
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Menu className="size-5" aria-hidden />
          )}
        </button>
      </div>

      {menuOpen ? (
        <ul
          id="payius-mobile-nav"
          className="absolute left-0 right-0 top-full z-30 mt-3 space-y-1 rounded-xl border border-white/10 bg-[#111827] p-2 shadow-2xl lg:hidden"
        >
          {NAV_LINKS.map((link) => (
            <li key={link}>
              <a
                href="#"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-[#9CA3AF] transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}

/* --------------------------------------------------------------- actions --- */

function CreateInvoiceButton() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.7)] transition-colors hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080E18]"
      >
        Create Invoice
        <ChevronDown
          className={`size-4 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#111827] p-1.5 shadow-2xl"
        >
          {INVOICE_OPTIONS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-[#9CA3AF] transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:bg-white/[0.07] focus-visible:text-white"
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
