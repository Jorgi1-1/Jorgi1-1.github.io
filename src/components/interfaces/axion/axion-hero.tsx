"use client";

import { useState } from "react";
import { ArrowRight, Clock, Menu, X } from "lucide-react";

import { PartnerBadgeIcon } from "./partner-badge-icon";
import { RollCTAButton } from "./roll-cta-button";
import { ShaderBackground } from "./shader-background";
import { useLondonTime } from "./use-london-time";

const NAV_LINKS = ["Projects", "Studio", "Journal", "Connect"];

export function AxionHero() {
  const [menuOpen, setMenuOpen] = useState(false);
  const time = useLondonTime();

  return (
    <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#EFEFEF]">
      <ShaderBackground />

      <div className="relative z-20 mx-auto w-full max-w-[1440px] p-2 sm:p-3">
        <nav className="flex items-center justify-between gap-4 rounded-full bg-white p-[5px]">
          <div className="flex items-center gap-6">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-900 sm:size-10">
              <span className="text-[10px] font-bold tracking-tight text-white sm:text-[11px]">
                AX
              </span>
            </div>

            <ul className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-[14px] text-gray-900 transition-colors duration-300 hover:text-gray-500"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden items-center gap-5 md:flex">
            <p className="hidden text-[13px] text-gray-600 lg:block">
              Taking on projects for Q1 2026
            </p>

            <p className="flex items-center gap-1.5 text-[13px] text-gray-600">
              <Clock className="size-3.5" aria-hidden />
              {time ? `${time} in London` : " "}
            </p>

            <RollCTAButton
              label="Book a strategy call"
              containerClassName="bg-gray-900 text-white text-[13px] font-medium rounded-full pl-5 pr-2 py-2"
              circleClassName="size-6 bg-white text-gray-900"
              icon={<ArrowRight className="size-3.5" aria-hidden />}
            />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="axion-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Menu"}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white md:hidden"
          >
            {menuOpen ? (
              <X className="size-4" aria-hidden />
            ) : (
              <Menu className="size-4" aria-hidden />
            )}
          </button>
        </nav>
      </div>

      <MobileMenu open={menuOpen} time={time} onClose={() => setMenuOpen(false)} />

      <div className="relative z-20 flex flex-1 flex-col justify-end">
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-14 sm:px-8 sm:pb-16 lg:px-12 lg:pb-20">
          <p className="mb-5 text-[13px] tracking-wide text-gray-900 sm:mb-8 sm:text-[14px]">
            Axion Studio
          </p>

          <h1
            className="font-medium leading-[1.08] tracking-[-0.03em] text-gray-900"
            style={{ fontSize: "clamp(1.75rem, 7vw, 4.2rem)" }}
          >
            <span className="sm:hidden">
              We craft digital experiences for brands ready to dominate their
              category online.
            </span>
            <span className="hidden sm:inline">
              We craft digital experiences
              <br />
              for brands ready to dominate
              <br />
              their category online.
            </span>
          </h1>

          <div className="mt-8 flex flex-col gap-4 sm:mt-12 sm:flex-row sm:items-center sm:gap-5">
            <RollCTAButton
              label="Start a project"
              containerClassName="bg-[#F26522] hover:bg-[#e05a1a] text-white text-[13px] sm:text-[14px] font-medium rounded-full pl-5 sm:pl-6 pr-2 py-2 w-fit"
              circleClassName="size-7 sm:size-8 bg-white text-[#F26522]"
              icon={<ArrowRight className="size-3.5 sm:size-4" aria-hidden />}
            />

            <div className="flex w-fit items-center gap-2.5 rounded-[4px] bg-white px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] sm:gap-3 sm:px-4 sm:py-2.5">
              <PartnerBadgeIcon className="size-5 shrink-0 fill-current text-[#E8704E] sm:size-6" />
              <span className="text-[13px] font-medium text-gray-900 sm:text-[14px]">
                Certified Partner
              </span>
              <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-white sm:px-2 sm:text-[11px]">
                Featured
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- overlay --- */

function MobileMenu({
  open,
  time,
  onClose,
}: {
  open: boolean;
  time: string | null;
  onClose: () => void;
}) {
  return (
    <div
      id="axion-mobile-menu"
      className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${
        open ? "visible bg-black/60 opacity-100" : "invisible bg-black/60 opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-3 bottom-3 rounded-2xl bg-white p-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-8 flex items-center gap-1.5 text-[13px] text-gray-600">
          <Clock className="size-3.5" aria-hidden />
          {time ? `${time} in London` : " "}
        </div>

        <ul className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link}>
              <a
                href="#"
                onClick={onClose}
                className="block py-2 text-[28px] font-medium text-gray-900 sm:text-[32px]"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <RollCTAButton
            label="Start a project"
            href="#"
            onClick={onClose}
            containerClassName="bg-[#F26522] text-white text-[14px] font-medium rounded-full pl-6 pr-2 py-2 w-fit"
            circleClassName="size-8 bg-white text-[#F26522]"
            icon={<ArrowRight className="size-4" aria-hidden />}
          />
        </div>
      </div>
    </div>
  );
}
