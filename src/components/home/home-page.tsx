"use client";

import dynamic from "next/dynamic";

import { ThemeToggle } from "@/components/theme-toggle";
import { HeroMarquee } from "./hero-marquee";
import { getIntroStripes } from "./section-config";

// Client-only: the totem's palette depends on the resolved theme class,
// which the server can't know. It's fully animation-driven, so SSR would
// add nothing.
const ColorTotemNav = dynamic(() => import("./color-totem-nav").then((m) => m.ColorTotemNav), {
  ssr: false,
});

// Runs before first paint so a first visit opens on the intro. Mirrors
// ColorTotemNav's check; ColorTotemNav clears the attribute once the intro
// settles. It also stamps when the server-rendered bars started sweeping, so
// the totem can take over at the same point.
// The timeout is a watchdog in case the totem's chunk never arrives: the page
// can't sit on the intro forever, and marking it seen stops a late totem from
// replaying the wipe over a hero that's already showing.
const INTRO_SCRIPT = `try{if(sessionStorage.getItem("home-wipe-seen")!=="1"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){var r=document.documentElement;r.setAttribute("data-home-intro","");window.__homeIntroT0=performance.now();setTimeout(function(){if(!r.hasAttribute("data-home-intro"))return;r.removeAttribute("data-home-intro");r.removeAttribute("data-home-intro-handoff");try{sessionStorage.setItem("home-wipe-seen","1")}catch(e){}},9000)}}catch(e){}`;

const INTRO_STRIPES = getIntroStripes();

export function HomePage() {
  return (
    <main className="relative">
      {/* type flips to text/plain on the client so React doesn't warn about
          rendering a script; suppressHydrationWarning accepts the mismatch.
          See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md */}
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }}
      />
      {/* The entry wipe, server-rendered so the bars sweep in from the first
          paint instead of waiting on the totem's chunk. Hidden unless the
          script above marked this visit for the intro; the totem takes over
          at the same frame and this steps aside (hero-marquee.css). */}
      <div className="home-intro" aria-hidden="true">
        {INTRO_STRIPES.map((stripe, index) => (
          <div
            key={stripe.id}
            className="home-intro-stripe"
            style={
              {
                "--i": index,
                "--intro-dark": stripe.dark,
                "--intro-light": stripe.light,
                "--intro-dark-ink": stripe.darkInk,
                "--intro-light-ink": stripe.lightInk,
              } as React.CSSProperties
            }
          >
            <span className="home-intro-label">{stripe.label}</span>
          </div>
        ))}
      </div>
      <HeroMarquee />
      <ColorTotemNav />
      <div className="home-theme-toggle fixed top-4 right-4 z-40">
        <ThemeToggle />
      </div>
    </main>
  );
}
