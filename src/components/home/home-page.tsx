"use client";

import dynamic from "next/dynamic";

import { ThemeToggle } from "@/components/theme-toggle";
import { HeroMarquee } from "./hero-marquee";

// Client-only: the totem's palette depends on the resolved theme class,
// which the server can't know. It's fully animation-driven, so SSR would
// add nothing.
const ColorTotemNav = dynamic(() => import("./color-totem-nav").then((m) => m.ColorTotemNav), {
  ssr: false,
});

// Runs before first paint so a first visit opens on the intro's black
// frame. Mirrors ColorTotemNav's check; ColorTotemNav clears the attribute
// once the intro settles. The timeout is a watchdog in case hydration never
// completes, so the page can't get stuck on black.
const INTRO_SCRIPT = `try{if(sessionStorage.getItem("home-wipe-seen")!=="1"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.setAttribute("data-home-intro","");setTimeout(function(){document.documentElement.removeAttribute("data-home-intro")},4500)}}catch(e){}`;

export function HomePage() {
  return (
    <div className="relative">
      {/* type flips to text/plain on the client so React doesn't warn about
          rendering a script; suppressHydrationWarning accepts the mismatch.
          See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md */}
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }}
      />
      <HeroMarquee />
      <ColorTotemNav />
      <div className="fixed top-4 right-4 z-40">
        <ThemeToggle />
      </div>
    </div>
  );
}
