"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ArrowRight, Hand, Mouse, MousePointer2, MousePointerClick, Pointer, X } from "lucide-react";

import { getSections, getReadableTextColor, getNeonColor, type SectionId } from "./section-config";
import { WorkSection } from "./sections/work-section";
import { AboutSection } from "./sections/about-section";
import { StackSection } from "./sections/stack-section";
import { ContactSection } from "./sections/contact-section";
import { useReducedMotion } from "./use-reduced-motion";
import { useMediaQuery } from "./use-media-query";
import { SectionQull } from "@/components/qull/section-qull";
import {
  onOpenSectionRequest,
  setHeroCovered,
  setTotemAccentColor,
  setTotemChromaWaveColor,
  setTotemWaveColor,
} from "./totem-hover";
import { LumaSpin } from "@/components/ui/luma-spin";
import { StrokeAsciiTitle } from "@/components/ui/stroke-ascii-title";
import { HeroFooter } from "./hero-footer";
import { Hint, markHintUsed, suspendHints, useHintUsed } from "./hint";
import "./color-totem-nav.css";

// Only rendered inside an open section, so kept out of the first-load
// bundle and warmed on idle once the intro settles.
const loadSplashCursor = () => import("@/components/ui/splash-cursor");
const SplashCursor = dynamic(() => loadSplashCursor().then((m) => m.SplashCursor), { ssr: false });
const ClickSpark = dynamic(() => import("@/components/ui/click-spark").then((m) => m.ClickSpark), { ssr: false });

// Hero accent per theme (see hero-marquee.css), used for click sparks.
const HERO_ACCENT = { dark: "#c3d809", light: "#16130f" } as const;

function preloadSectionEffects() {
  const run = () => {
    void loadSplashCursor();
  };
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 2500 });
  else window.setTimeout(run, 1200);
}

// Set by the inline script in HomePage before first paint, so a slow
// hydration never flashes the hero before the intro.
const INTRO_ATTR = "data-home-intro";
// Set once this frame has taken over from the server-rendered bars, which
// then hide (hero-marquee.css).
const INTRO_HANDOFF_ATTR = "data-home-intro-handoff";

// When the server-rendered bars started sweeping (HomePage's inline script).
function introStartedAt(): number | undefined {
  const t0 = (window as Window & { __homeIntroT0?: number }).__homeIntroT0;
  return typeof t0 === "number" ? t0 : undefined;
}

// Pause between the color covering the screen and the content appearing.
// First opening of the visit only: after that the visitor knows the ritual
// and the loader, which loads nothing, would just be a wait.
const LOADER_HOLD_MS = 450;

// Wall-clock backstop for the body: the title's draw-on reports when it's
// done through a GSAP tween, which stalls when rAF is throttled (background
// tab, low-power mode, a busy main thread). A section must never sit blank.
const BODY_REVEAL_FALLBACK_MS = 1500;

// Touch has no hover preview, so a tap plays the hover wave first and the
// reveal starts while its tail is still leaving.
const TAP_WAVE_LEAD_MS = 210;

const SECTION_CONTENT: Record<SectionId, React.ComponentType<{ revealed?: boolean }>> = {
  work: WorkSection,
  about: AboutSection,
  stack: StackSection,
  contact: ContactSection,
};

// Every section but the last hands off to the one after it in the totem's
// order, flooding its color in place, so the tour runs Work → About → Stack →
// Contact without going back through the totem, and always ends on Contact.
const NEXT_SECTION: Partial<Record<SectionId, SectionId>> = {
  work: "about",
  about: "stack",
  stack: "contact",
};

const WIPE_SESSION_KEY = "home-wipe-seen";

type Box = { top: number; left: number; width: number; height: number };

function getFullscreenBox(): Box {
  return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
}

function getRestBox(): Box {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const narrow = vw < 640;
  const width = narrow ? Math.min(vw * 0.9, 480) : Math.min(vw * 0.75, 960);
  const height = narrow ? 60 : 72;
  return { top: (vh - height) / 2, left: (vw - width) / 2, width, height };
}

// Unscaled size of the reveal circle, a plain round <div> animated only
// through `transform: scale` around its own center.
const REVEAL_DIAMETER = 100;
const REVEAL_RADIUS = REVEAL_DIAMETER / 2;

function farthestCornerDistance(x: number, y: number, vw: number, vh: number) {
  const corners: [number, number][] = [
    [0, 0],
    [vw, 0],
    [0, vh],
    [vw, vh],
  ];
  return Math.max(...corners.map(([cx, cy]) => Math.hypot(cx - x, cy - y)));
}

/**
 * The on-screen stripe for a section. The track holds two copies of every
 * stripe and scrolls, so the one worth pointing at is whichever copy sits
 * inside the bar right now, nearest its center.
 */
function visibleStripeFor(
  id: SectionId,
  frame: HTMLElement | null,
  track: HTMLElement | null,
  sections: { id: SectionId }[]
): HTMLElement | null {
  if (!frame || !track || !sections.length) return null;
  const bar = frame.getBoundingClientRect();
  const center = bar.left + bar.width / 2;
  let best: HTMLElement | null = null;
  let bestDistance = Infinity;
  Array.from(track.children).forEach((el, index) => {
    if (sections[index % sections.length]?.id !== id) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    if (x < bar.left || x > bar.right) return;
    const distance = Math.abs(x - center);
    if (distance < bestDistance) {
      best = el as HTMLElement;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * Primary navigation: a bar of section colors that scrolls as a continuous
 * carousel.
 *
 * - The carousel is a GSAP tween held in a ref and paused imperatively, so a
 *   re-render can never restart it.
 * - Opening a section grows a separate overlay from the clicked stripe. The
 *   bar's geometry is never animated after the intro, so no interrupted
 *   transition can leave it mispositioned or unclickable.
 */
export function ColorTotemNav() {
  const reducedMotion = useReducedMotion();
  // Cursor-driven effects (fluid sim, magnet, parallax) are desktop only.
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");

  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<gsap.core.Tween | null>(null);
  const stripeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayContentRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);

  const targetScaleRef = useRef(0);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  // Set when one open section hands off to another: the next open floods the
  // new color from this point over the old one instead of growing from a stripe.
  const switchOriginRef = useRef<{ x: number; y: number } | null>(null);
  const activeIdRef = useRef<SectionId | null>(null);
  const readyRef = useRef(false);
  const transitioningRef = useRef(false);
  const tapWaveTimerRef = useRef<number | null>(null);

  const [activeId, setActiveId] = useState<SectionId | null>(null);
  // Starts the title's draw-on when the content becomes visible, not while
  // it's still hidden behind the reveal. Also gates the fluid cursor.
  const [contentReady, setContentReady] = useState(false);
  // True once the body is visible, so sections can start their own entrances.
  const [bodyRevealed, setBodyRevealed] = useState(false);
  // The intro has settled into the resting bar: hints may start counting.
  const [settled, setSettled] = useState(false);
  // The floating footer has taken the totem's place (hero-footer.tsx).
  const [footerOpen, setFooterOpen] = useState(false);
  const footerOpenRef = useRef(false);
  // Guards the body reveal so the draw-on and the fallback can't both fire it.
  const bodyShownRef = useRef(false);
  const bodyFallbackRef = useRef<number | null>(null);
  const loaderShownRef = useRef(false);

  // Client-only component (see home-page.tsx), so the resolved theme class
  // can be read on mount without a hydration mismatch.
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  // Mirrored in a ref so imperative callbacks always read the current
  // theme's palette without re-subscribing.
  const sections = useMemo(() => getSections(isDark), [isDark]);
  const sectionsRef = useRef(sections);
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  // next-themes toggles `.dark` on <html> without remounting this component.
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // The marquee also runs on touch, where nothing pauses it before a tap
  // lands. Known tradeoff: a tap can hit the neighbor of the stripe that
  // was read. Kept intentionally until the totem's touch model is redesigned.
  const startMarquee = useCallback(() => {
    if (reducedMotion || marqueeRef.current) return;
    const el = trackRef.current;
    if (!el) return;
    // The track holds two identical copies of the section sequence, so -50%
    // lands exactly on the seam and the loop is invisible.
    marqueeRef.current = gsap.to(el, {
      xPercent: -50,
      duration: 24,
      ease: "none",
      repeat: -1,
    });
  }, [reducedMotion]);

  // Entry: hold on black, sweep the colors in full-screen, then shrink the
  // very same bars into the resting bar. This is the only time the bar's
  // geometry is ever animated.
  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(WIPE_SESSION_KEY) === "1";
    } catch {
      // No sessionStorage: treat the visit as unseen.
    }

    const frame = frameRef.current;
    const stripes = sectionsRef.current.map((section) => stripeRefs.current[section.id]).filter(
      (el): el is HTMLButtonElement => Boolean(el)
    );

    const settle = () => {
      gsap.killTweensOf(frame);
      gsap.set(stripes, { clearProps: "transform" });
      gsap.set(frame, { ...getRestBox(), borderRadius: getRestBox().height / 2, autoAlpha: 1, backgroundColor: "transparent" });
      document.documentElement.removeAttribute(INTRO_ATTR);
      document.documentElement.removeAttribute(INTRO_HANDOFF_ATTR);
      readyRef.current = true;
      setSettled(true);
      startMarquee();
      preloadSectionEffects();
      try {
        sessionStorage.setItem(WIPE_SESSION_KEY, "1");
      } catch {
        // Ignore.
      }
    };

    // Read directly: useReducedMotion is still false on this first render,
    // so it alone would play the intro for reduced-motion visitors.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (alreadySeen || reducedMotion || prefersReduced) {
      settle();
      return;
    }

    gsap.set(frame, { ...getFullscreenBox(), borderRadius: 0, autoAlpha: 1, backgroundColor: "#0a0a0a" });
    gsap.set(stripes, { scaleX: 0, transformOrigin: "left center" });

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      settle();
    };

    const rest = getRestBox();
    const tl = gsap.timeline();
    // Same beats as the server-rendered bars' CSS (hero-marquee.css).
    tl.to({}, { duration: 0.4 }) // hold on black
      .to(stripes, { scaleX: 1, duration: 0.45, ease: "power3.inOut", stagger: 0.05 })
      .addLabel("swept")
      .to({}, { duration: 0.15 })
      .to(frame, {
        ...rest,
        borderRadius: rest.height / 2,
        duration: 0.75,
        ease: "expo.inOut",
        onComplete: finish,
      });

    // The server-rendered bars have been sweeping since the first paint. Pick
    // the timeline up at the same moment (never past the full sweep, so a
    // slow chunk only lengthens the hold on full bars), then take the screen
    // from them: this frame is now identical and on top.
    const t0 = introStartedAt();
    if (t0 !== undefined) tl.seek(Math.min((performance.now() - t0) / 1000, tl.labels.swept));
    document.documentElement.setAttribute(INTRO_HANDOFF_ATTR, "");

    // A throttled or backgrounded tab can suspend animation frames entirely.
    // A timer still fires, so the intro can never strand the page full-screen.
    const fallback = window.setTimeout(finish, 3200);

    return () => {
      tl.kill();
      window.clearTimeout(fallback);
      document.documentElement.removeAttribute(INTRO_ATTR);
      document.documentElement.removeAttribute(INTRO_HANDOFF_ATTR);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Never leave the hero's accent, background wave, or shader wave hijacked
  // if the nav itself unmounts mid-hover.
  useEffect(() => {
    return () => {
      if (tapWaveTimerRef.current !== null) window.clearTimeout(tapWaveTimerRef.current);
      setTotemAccentColor(null);
      setTotemWaveColor(null);
      setTotemChromaWaveColor(null);
      setHeroCovered(false);
    };
  }, []);

  // Keep the resting bar sized to the viewport (never while a section is open).
  useEffect(() => {
    let frame = 0;
    function handleResize() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!readyRef.current || activeIdRef.current) return;
        const rest = getRestBox();
        gsap.set(frameRef.current, { ...rest, borderRadius: rest.height / 2 });
      });
    }
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Invariant: with no section open, the bar is always visible and
  // interactive. Any path that ends with nothing open restores it, so no
  // interrupted transition can leave the nav transparent or unusable.
  useEffect(() => {
    if (activeId) return;
    gsap.set(frameRef.current, { autoAlpha: 1 });
  }, [activeId]);

  const openSection = useCallback(
    (id: SectionId, triggerEl?: HTMLElement, keepWave = false) => {
      if (!readyRef.current || activeIdRef.current || transitioningRef.current) return;
      transitioningRef.current = true;
      suspendHints(true);
      markHintUsed("totem-hover");
      markHintUsed("totem-click");
      lastTriggerRef.current = triggerEl ?? null;
      setContentReady(false);
      setBodyRevealed(false);
      bodyShownRef.current = false;

      // Freeze the carousel, then grow the reveal from the stripe's center.
      marqueeRef.current?.pause();
      // From a stripe or a footer link, the color grows from what was pressed.
      const source =
        triggerEl?.classList.contains("totem-stripe") || triggerEl?.closest(".hero-footer")
        ? triggerEl
        : visibleStripeFor(id, frameRef.current, trackRef.current, sectionsRef.current) ?? stripeRefs.current[id];
      const rect = source?.getBoundingClientRect();
      const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const target =
        (farthestCornerDistance(originX, originY, window.innerWidth, window.innerHeight) + 32) /
        REVEAL_RADIUS;
      targetScaleRef.current = target;

      const section = sectionsRef.current.find((item) => item.id === id) ?? null;
      const reveal = revealRef.current;
      if (reveal) {
        // Centered on the origin via a negative margin (see CSS), so the
        // default transform-origin already sits on it.
        reveal.style.left = `${originX}px`;
        reveal.style.top = `${originY}px`;
        reveal.style.backgroundColor = section?.color ?? "transparent";
        gsap.set(reveal, { scale: 0 });
      }

      // Hide the bar in the same frame the overlay appears.
      gsap.set(frameRef.current, { autoAlpha: 0 });
      // A tap-triggered wave keeps sweeping under the growing color and is
      // reset once the hero is covered.
      if (!keepWave) {
        setTotemAccentColor(null);
        setTotemWaveColor(null);
        setTotemChromaWaveColor(null);
      }

      activeIdRef.current = id;
      setActiveId(id);
    },
    []
  );

  const waveThenOpen = useCallback(
    (color: string, id: SectionId, triggerEl: HTMLElement) => {
      if (!readyRef.current || activeIdRef.current || transitioningRef.current) return;
      if (tapWaveTimerRef.current !== null) return;
      // Freeze the stripe so the reveal grows from where the finger landed.
      marqueeRef.current?.pause();
      setTotemAccentColor(color, id);
      setTotemWaveColor(color);
      setTotemChromaWaveColor(color);
      tapWaveTimerRef.current = window.setTimeout(() => {
        tapWaveTimerRef.current = null;
        openSection(id, triggerEl, true);
      }, TAP_WAVE_LEAD_MS);
    },
    [openSection]
  );

  // Openings requested from outside the totem (the identity chip). The
  // color still grows from the section's own stripe.
  useEffect(
    () =>
      onOpenSectionRequest((id, trigger) => {
        if (!sectionsRef.current.some((item) => item.id === id)) return;
        openSection(id as SectionId, trigger);
      }),
    [openSection]
  );

  // Where the color shrinks back to on close: the section's own stripe while
  // it's inside the (hidden, paused) bar, otherwise the bar's center.
  const aimRevealAt = useCallback((id: SectionId) => {
    const reveal = revealRef.current;
    const frameRect = frameRef.current?.getBoundingClientRect();
    if (!reveal || !frameRect) return;
    const stripeRect = visibleStripeFor(id, frameRef.current, trackRef.current, sectionsRef.current)?.getBoundingClientRect();
    const x = stripeRect ? stripeRect.left + stripeRect.width / 2 : frameRect.left + frameRect.width / 2;
    const y = frameRect.top + frameRect.height / 2;
    const target =
      (farthestCornerDistance(x, y, window.innerWidth, window.innerHeight) + 32) / REVEAL_RADIUS;
    targetScaleRef.current = target;
    reveal.style.left = `${x}px`;
    reveal.style.top = `${y}px`;
    gsap.set(reveal, { scale: target });
  }, []);

  // One open section hands off to another: the current content leaves, then
  // the next section's color floods from the control that asked for it.
  const switchSection = useCallback(
    (id: SectionId, triggerEl: HTMLElement) => {
      if (!activeIdRef.current || activeIdRef.current === id || transitioningRef.current) return;
      transitioningRef.current = true;
      suspendHints(true);
      const rect = triggerEl.getBoundingClientRect();
      const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      setContentReady(false);

      const swap = () => {
        // Closed before React repaints the backdrop in the new color, so no
        // frame of it can show at full size ahead of the flood.
        if (!reducedMotion) {
          gsap.set(backdropRef.current, { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` });
        }
        bodyRef.current?.classList.remove("neon-flicker-in");
        bodyShownRef.current = false;
        setBodyRevealed(false);
        switchOriginRef.current = origin;
        activeIdRef.current = id;
        setActiveId(id);
      };

      const content = overlayContentRef.current;
      if (reducedMotion || !content) {
        swap();
        return;
      }
      gsap.killTweensOf(Array.from(content.children));
      gsap.to(content, { autoAlpha: 0, duration: 0.15, ease: "power2.in", onComplete: swap });
    },
    [reducedMotion]
  );

  // Reveals the body once the title's outline has drawn on.
  const handleTitleSettled = useCallback(() => {
    const body = bodyRef.current;
    if (!body || bodyShownRef.current) return;
    bodyShownRef.current = true;
    if (bodyFallbackRef.current !== null) {
      window.clearTimeout(bodyFallbackRef.current);
      bodyFallbackRef.current = null;
    }
    setBodyRevealed(true);
    if (reducedMotion) {
      gsap.set(body, { autoAlpha: 1 });
      return;
    }
    body.classList.remove("neon-flicker-in");
    // Reflow so re-adding the class restarts the animation.
    void body.offsetWidth;
    body.classList.add("neon-flicker-in");
  }, [reducedMotion]);

  // The fluid cursor paints the inverse of what's under it: neon over the
  // base background, base over elements marked data-cursor-neon.
  const resolveCursorColor = useCallback((clientX: number, clientY: number) => {
    const activeSection = sectionsRef.current.find((item) => item.id === activeIdRef.current);
    if (!activeSection) return "#000000";
    const target = document.elementFromPoint(clientX, clientY);
    const overNeon = target?.closest('[data-cursor-neon="true"]');
    return overNeon ? activeSection.color : getNeonColor(activeSection.color);
  }, []);

  // Pointer response inside an open section: the CTA pulls toward the cursor
  // within a short radius.
  useEffect(() => {
    if (!contentReady || !finePointer || reducedMotion) return;
    const container = overlayContentRef.current;
    const cta = container?.querySelector<HTMLElement>(".section-overlay-cta") ?? null;
    if (!container) return;

    const ctaX = cta ? gsap.quickTo(cta, "x", { duration: 0.35, ease: "power3.out" }) : null;
    const ctaY = cta ? gsap.quickTo(cta, "y", { duration: 0.35, ease: "power3.out" }) : null;

    const MAGNET_RADIUS = 90;
    const MAGNET_PULL = 0.3;

    function handleMove(event: PointerEvent) {
      if (cta && ctaX && ctaY) {
        const rect = cta.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < MAGNET_RADIUS) {
          ctaX(dx * MAGNET_PULL);
          ctaY(dy * MAGNET_PULL);
        } else {
          ctaX(0);
          ctaY(0);
        }
      }
    }

    container.addEventListener("pointermove", handleMove);
    return () => {
      container.removeEventListener("pointermove", handleMove);
      if (cta) gsap.killTweensOf(cta, "x,y");
      if (cta) gsap.set(cta, { x: 0, y: 0 });
    };
  }, [contentReady, finePointer, reducedMotion, activeId]);

  // Open: grow the section color from its stripe to cover the screen, then
  // hand off to a static backdrop, a short loader beat, and the content. A
  // hand-off from another section floods the new color over the old instead.
  useEffect(() => {
    if (!activeId) return;
    const content = overlayContentRef.current;
    const backdrop = backdropRef.current;
    const loader = loaderRef.current;
    const reveal = revealRef.current;
    const target = targetScaleRef.current;
    const switchFrom = switchOriginRef.current;
    switchOriginRef.current = null;
    gsap.set(content, { autoAlpha: 0 });
    gsap.set(loader, { autoAlpha: 0 });
    if (!switchFrom) gsap.set(backdrop, { autoAlpha: 0 });

    let settled = false;
    let loaderDelay: number | null = null;

    const revealContent = () => {
      suspendHints(false);
      if (!content) return;
      // The body stays hidden until the title forms (handleTitleSettled).
      gsap.set(content, { autoAlpha: 1 });
      // Only now: focus() is ignored on anything still visibility:hidden,
      // and focus left outside would strand keyboard and reader users.
      closeButtonRef.current?.focus({ preventScroll: true });
      setContentReady(true);
      const body = bodyRef.current;
      if (reducedMotion && body) gsap.set(body, { autoAlpha: 1 });
      if (bodyFallbackRef.current !== null) window.clearTimeout(bodyFallbackRef.current);
      bodyFallbackRef.current = window.setTimeout(() => {
        bodyFallbackRef.current = null;
        handleTitleSettled();
      }, BODY_REVEAL_FALLBACK_MS);
    };

    if (switchFrom) {
      // The old color stays on screen as the reveal circle underneath while
      // the backdrop, already in the new color, opens over it.
      const finishSwitch = () => {
        if (settled) return;
        settled = true;
        gsap.killTweensOf(backdrop);
        gsap.set(backdrop, { autoAlpha: 1, clearProps: "clipPath" });
        const section = sectionsRef.current.find((item) => item.id === activeId);
        if (reveal && section) reveal.style.backgroundColor = section.color;
        aimRevealAt(activeId);
        transitioningRef.current = false;
        revealContent();
      };
      if (reducedMotion || !backdrop) {
        finishSwitch();
        return;
      }
      const radius = farthestCornerDistance(switchFrom.x, switchFrom.y, window.innerWidth, window.innerHeight) + 32;
      const at = `at ${switchFrom.x}px ${switchFrom.y}px`;
      gsap.set(backdrop, { autoAlpha: 1 });
      const tween = gsap.fromTo(
        backdrop,
        { clipPath: `circle(0px ${at})` },
        { clipPath: `circle(${radius}px ${at})`, duration: 0.6, ease: "power3.out", onComplete: finishSwitch }
      );
      const fallback = window.setTimeout(finishSwitch, 1100);
      return () => {
        tween.kill();
        window.clearTimeout(fallback);
        if (bodyFallbackRef.current !== null) {
          window.clearTimeout(bodyFallbackRef.current);
          bodyFallbackRef.current = null;
        }
      };
    }

    const finish = () => {
      if (settled) return;
      settled = true;
      gsap.killTweensOf(reveal);
      gsap.set(reveal, { scale: target });
      // A static backdrop replaces the scaled circle once it covers the screen.
      gsap.set(backdrop, { autoAlpha: 1 });
      // Opened from the footer, which is gone now: close back into the stripe.
      if (lastTriggerRef.current?.closest(".hero-footer")) aimRevealAt(activeId);
      setHeroCovered(true);
      // Reset in the same flush that hides the wave layer, so it never sweeps back.
      setTotemAccentColor(null);
      setTotemWaveColor(null);
      setTotemChromaWaveColor(null);
      transitioningRef.current = false;
      if (!content) return;

      if (reducedMotion || !loader || loaderShownRef.current) {
        revealContent();
        return;
      }
      loaderShownRef.current = true;
      gsap.set(loader, { autoAlpha: 1 });
      // A wall-clock timer, not gsap.delayedCall: GSAP's ticker stalls with
      // throttled rAF, and this beat must never stretch into a long wait.
      loaderDelay = window.setTimeout(() => {
        // The title starts forming while the loader fades, not after.
        gsap.to(loader, { autoAlpha: 0, duration: 0.2, ease: "power2.out" });
        revealContent();
      }, LOADER_HOLD_MS);
    };

    if (reducedMotion || !reveal) {
      finish();
      return;
    }

    const tween = gsap.to(reveal, { scale: target, duration: 0.6, ease: "power3.out", onComplete: finish });
    const fallback = window.setTimeout(finish, 1100);
    return () => {
      if (loaderDelay !== null) window.clearTimeout(loaderDelay);
      tween.kill();
      window.clearTimeout(fallback);
      if (bodyFallbackRef.current !== null) {
        window.clearTimeout(bodyFallbackRef.current);
        bodyFallbackRef.current = null;
      }
    };
  }, [activeId, reducedMotion, handleTitleSettled, aimRevealAt]);

  const closeSection = useCallback(() => {
    const closingId = activeIdRef.current;
    if (!closingId) return;
    suspendHints(true);
    const content = overlayContentRef.current;
    const backdrop = backdropRef.current;
    const loader = loaderRef.current;
    const reveal = revealRef.current;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      gsap.killTweensOf(reveal);
      gsap.set(reveal, { scale: 0 });
      // Runs on every path, including the fallback, so the nav always returns.
      gsap.set(frameRef.current, { autoAlpha: 1 });
      setHeroCovered(false);
      activeIdRef.current = null;
      transitioningRef.current = false;
      setActiveId(null);
      setBodyRevealed(false);
      bodyShownRef.current = false;
      marqueeRef.current?.resume();
      setTotemAccentColor(null);
      setTotemWaveColor(null);
      setTotemChromaWaveColor(null);
      suspendHints(false);
      // Stripes are aria-hidden, so focus never goes back to one: it lands on
      // the section's entry in the accessible nav instead. A trigger outside
      // the totem (the identity chip) gets its focus back as-is.
      const trigger = lastTriggerRef.current;
      const fromOutside = trigger?.isConnected && !trigger.closest(".totem-frame, .totem-a11y-nav, .hero-footer");
      const returnTo = fromOutside
        ? trigger
        : document.querySelector<HTMLElement>(`.totem-a11y-trigger[data-section="${closingId}"]`);
      returnTo?.focus({ preventScroll: true });
    };

    if (reducedMotion || !reveal) {
      finish();
      return;
    }

    // Bring the hero back before any of it can show around the shrinking color.
    setHeroCovered(false);
    transitioningRef.current = true;
    // Everything but the color leaves first, so nothing of the section
    // floats over the hero while the circle shrinks: the content (title
    // included) and the fluid cursor (unmounted here).
    setContentReady(false);
    if (content) {
      gsap.killTweensOf(Array.from(content.children));
      gsap.to(content, { autoAlpha: 0, duration: 0.15, ease: "power2.in" });
    }
    // Closing can land mid-loader.
    gsap.killTweensOf(loader);
    gsap.set(loader, { autoAlpha: 0 });
    // Hand the color back to the circle before it shrinks.
    gsap.set(backdrop, { autoAlpha: 0 });
    // Exit is faster than entry and accelerates back into the stripe.
    gsap.to(reveal, { scale: 0, duration: 0.4, delay: 0.1, ease: "power2.in", onComplete: finish });
    window.setTimeout(finish, 850);
  }, [reducedMotion]);

  useEffect(() => {
    if (!activeId) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSection();
        return;
      }
      // Modal: keep Tab cycling inside the open section.
      if (event.key !== "Tab") return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const focusable = Array.from(
        overlay.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !overlay.contains(active))) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && (active === lastEl || !overlay.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeId, closeSection]);

  // Keyboard focus on the accessible nav gets what hover gets: the carousel
  // holds still, the hero takes the section's color, and the focused entry
  // sits under its own stripe instead of in a detached row at the top.
  // Mouse-driven focus (returning from a closed section) previews nothing.
  const previewFromKeyboard = useCallback((id: SectionId, hover: string, trigger: HTMLElement) => {
    if (activeIdRef.current || !trigger.matches(":focus-visible")) return;
    marqueeRef.current?.pause();
    const frameRect = frameRef.current?.getBoundingClientRect();
    const stripeRect = visibleStripeFor(id, frameRef.current, trackRef.current, sectionsRef.current)?.getBoundingClientRect();
    if (frameRect) {
      const x = stripeRect ? stripeRect.left + stripeRect.width / 2 : frameRect.left + frameRect.width / 2;
      trigger.style.setProperty("--anchor-x", `${x}px`);
      trigger.style.setProperty("--anchor-y", `${frameRect.bottom + 12}px`);
    }
    setTotemAccentColor(hover, id);
    setTotemWaveColor(hover);
    setTotemChromaWaveColor(hover);
  }, []);

  const endKeyboardPreview = useCallback(() => {
    if (activeIdRef.current) return;
    marqueeRef.current?.resume();
    setTotemAccentColor(null);
    setTotemWaveColor(null);
    setTotemChromaWaveColor(null);
  }, []);

  // A transition cut short by unmounting must not leave every hint hidden.
  useEffect(() => () => suspendHints(false), []);

  // The footer may take the totem's place only when the hero is at rest.
  const canOpenFooter = useCallback(
    () => readyRef.current && !activeIdRef.current && !transitioningRef.current && tapWaveTimerRef.current === null,
    []
  );
  const pauseMarquee = useCallback(() => marqueeRef.current?.pause(), []);
  const resumeMarquee = useCallback(() => marqueeRef.current?.resume(), []);
  const handleFooterOpen = useCallback((open: boolean) => {
    footerOpenRef.current = open;
    setFooterOpen(open);
  }, []);

  const frameBox = useCallback(() => frameRef.current?.getBoundingClientRect() ?? null, []);
  const titleBox = useCallback(() => {
    const rect = document.querySelector(".section-overlay-title .stroke-ascii-title")?.getBoundingClientRect();
    return rect && rect.width > 0 ? rect : null;
  }, []);
  const heroAtRest = settled && !activeId && !footerOpen;
  // The totem teaches in two steps under a mouse: hover first, then click.
  const totemHovered = useHintUsed("totem-hover");
  // Qull lives in the hero and in every section. On the hero the hint
  // anchors to the fixed box Qull stands in; in a section, to the whole
  // figure (limbs, spark and marks included) where it is when the hint shows.
  const qullParts = useCallback(() => {
    const scope = document.querySelector(".section-overlay-content .section-qull");
    return [...(scope?.querySelectorAll("path") ?? [])]
      .map((part) => part.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
  }, []);
  const qullBox = useCallback(() => {
    if (!activeIdRef.current) {
      const rect = document.querySelector(".hero-name-mark")?.getBoundingClientRect();
      return rect && rect.width > 0 ? rect : null;
    }
    const parts = qullParts();
    if (!parts.length) return null;
    const left = Math.min(...parts.map((r) => r.left));
    const top = Math.min(...parts.map((r) => r.top));
    const right = Math.max(...parts.map((r) => r.right));
    const bottom = Math.max(...parts.map((r) => r.bottom));
    return new DOMRect(left, top, right - left, bottom - top);
  }, [qullParts]);

  const section = activeId ? sections.find((item) => item.id === activeId) ?? null : null;
  const ActiveContent = activeId ? SECTION_CONTENT[activeId] : null;
  const nextSection = activeId && NEXT_SECTION[activeId]
    ? sections.find((item) => item.id === NEXT_SECTION[activeId]) ?? null
    : null;
  const ink = section ? getReadableTextColor(section.color) : null;
  // Foreground color for everything inside an open section.
  const neon = section ? getNeonColor(section.color) : null;
  // Readable text on top of a neon fill (the CTA button).
  const neonInk = neon ? getReadableTextColor(neon) : null;

  return (
    <>
      {/* Always mounted so openSection can position it synchronously. */}
      <div ref={revealRef} className="section-reveal" aria-hidden="true" />

      <div
        ref={frameRef}
        className="totem-frame"
        aria-hidden="true"
        onMouseEnter={() => {
          if (finePointer) marqueeRef.current?.pause();
        }}
        onMouseLeave={() => {
          if (!finePointer) return;
          if (!activeIdRef.current) marqueeRef.current?.resume();
          setTotemAccentColor(null);
          setTotemWaveColor(null);
          setTotemChromaWaveColor(null);
        }}
      >
        {/* Stripes handle enter only. A per-stripe leave would clear the
            wave between neighbors and break its replay (see totem-hover.ts);
            the frame-level leave above clears it instead. */}
        <div
          ref={trackRef}
          className="totem-track"
          style={{ "--totem-stripes": sections.length * 2 } as React.CSSProperties}
        >
          {[...sections, ...sections].map((item, index) => {
            const isPrimaryCopy = index < sections.length;
            return (
              <button
                key={`${item.id}-${index}`}
                ref={
                  isPrimaryCopy
                    ? (el) => {
                        stripeRefs.current[item.id] = el;
                      }
                    : undefined
                }
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className="totem-stripe"
                style={{ backgroundColor: item.color, color: getReadableTextColor(item.color) }}
                onClick={(event) => {
                  if (finePointer || reducedMotion) openSection(item.id, event.currentTarget);
                  else waveThenOpen(item.hover, item.id, event.currentTarget);
                }}
                onMouseEnter={() => {
                  // iOS fires an emulated mouseenter on tap with no matching
                  // leave, which would strand the wave lit.
                  if (!finePointer || activeIdRef.current) return;
                  setTotemAccentColor(item.hover, item.id);
                  setTotemWaveColor(item.hover);
                  setTotemChromaWaveColor(item.hover);
                }}
              >
                <span className="totem-stripe-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {section && ActiveContent ? (
        <div
          ref={overlayRef}
          className="section-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="section-overlay-title"
        >
          {/* Static stand-in for the reveal circle once it covers the screen. */}
          <div ref={backdropRef} className="section-overlay-backdrop" style={{ backgroundColor: section.color }} />
          {/* Spinner draws with currentColor. */}
          <div ref={loaderRef} className="section-overlay-loader" style={{ color: ink ?? undefined }}>
            <LumaSpin />
          </div>
          {/* Viewport-sized from the first frame so the copy never reflows. */}
          <div
            ref={overlayContentRef}
            className="section-overlay-content"
            style={
              {
                color: neon ?? undefined,
                "--panel-fg": neon,
                "--panel-bg": section.color,
                "--panel-ink": neonInk,
                "--panel-text": ink,
                // The other side of the ink pick: a wash of it always pushes
                // the ground away from the ink, never toward it.
                "--panel-shade": ink === "#16130f" ? "#f4efe2" : "#16130f",
              } as React.CSSProperties
            }
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="section-overlay-close"
              onClick={closeSection}
              aria-label="Close"
              data-cursor-neon="true"
            >
              <X className="size-5" />
            </button>
            {/* Names the dialog; the visible title draws on as an outline and
                turns to ASCII on hover. */}
            <h2
              id="section-overlay-title"
              className="section-overlay-title"
              data-cursor-neon="true"
            >
              <span className="sr-only">{section.label}</span>
              <StrokeAsciiTitle
                text={section.label}
                color={neon ?? "#ffffff"}
                start={contentReady}
                interactive={finePointer}
                reducedMotion={reducedMotion}
                onDrawn={handleTitleSettled}
              />
            </h2>
            {/* Hidden until handleTitleSettled adds .neon-flicker-in. */}
            <div ref={bodyRef} className="section-overlay-body" data-cursor-neon="true">
              <ActiveContent revealed={bodyRevealed} />
              {nextSection ? (
                <button
                  type="button"
                  className="section-next"
                  onClick={(event) => switchSection(nextSection.id, event.currentTarget)}
                >
                  <span className="section-next-lead">Next</span>
                  <span className="section-next-label">{nextSection.label}</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            {/* Inside the content, so it fades out with it on close. */}
            <SectionQull
              key={section.id}
              section={section.id}
              ready={bodyRevealed}
              neon={neon ?? "#ffffff"}
              ground={section.color}
              reducedMotion={reducedMotion}
            />
          </div>
          {/* Mounted after the reveal: compiling WebGL mid-animation stalls it. */}
          {finePointer && contentReady ? <SplashCursor resolveColor={resolveCursorColor} /> : null}
        </div>
      ) : null}

      {!reducedMotion ? (
        <ClickSpark
          sparkColor={neon ?? HERO_ACCENT[isDark ? "dark" : "light"]}
          sparkSize={10}
          sparkRadius={15}
          sparkCount={8}
          duration={400}
        />
      ) : null}

      <HeroFooter
        sections={sections}
        frameRef={frameRef}
        trackRef={trackRef}
        canOpen={canOpenFooter}
        pauseMarquee={pauseMarquee}
        resumeMarquee={resumeMarquee}
        onOpenSection={openSection}
        onOpenChange={handleFooterOpen}
        reducedMotion={reducedMotion}
      />

      {/* Hints for what the page does under a pointer, each once a visit. */}
      <Hint
        id="totem-hover"
        label={finePointer ? "Hover a color" : "Tap a color to open"}
        gesture={finePointer ? "hover" : "click"}
        icon={finePointer ? MousePointer2 : Pointer}
        anchor={frameBox}
        enabled={heroAtRest}
        delay={900}
        duration={6000}
        usedBy={finePointer ? "hover" : "press"}
        placement="above"
        slot="totem"
      />
      <Hint
        id="totem-click"
        label="Click it to open"
        gesture="click"
        icon={MousePointerClick}
        anchor={frameBox}
        placement="above"
        slot="totem"
        enabled={heroAtRest && finePointer && totemHovered}
        delay={350}
        duration={5000}
      />
      <Hint
        id="scroll"
        label={finePointer ? "Scroll for more" : "Swipe up for more"}
        gesture="scroll"
        icon={finePointer ? Mouse : Hand}
        anchor={frameBox}
        enabled={heroAtRest}
        delay={10000}
      />
      <Hint
        id="qull"
        label={finePointer ? "I'm Qull, click me!" : "I'm Qull, tap me!"}
        gesture="click"
        icon={finePointer ? MousePointerClick : Pointer}
        anchor={qullBox}
        enabled={heroAtRest || bodyRevealed}
        delay={4500}
        duration={5000}
        usedBy="press"
        // Never above, where its spark plays and its marks pop: below it in
        // the hero's row gap; in a section, beside its feet on the ground it
        // stands on, so it doesn't cover what's under it.
        placement={activeId ? "beside" : "below"}
        gap={activeId ? 14 : 6}
        avoid={qullParts}
        tone={activeId ? "panel" : "hero"}
      />
      <Hint
        id="title"
        label="Hover the title!"
        gesture="hover"
        icon={MousePointer2}
        anchor={titleBox}
        placement="right"
        gap={20}
        tone="panel"
        enabled={bodyRevealed && finePointer && !reducedMotion}
        delay={900}
        duration={5000}
        usedBy="hover"
      />

      {/* Static, keyboard-operable nav behind the decorative carousel. */}
      <nav aria-label="Sections" className="totem-a11y-nav">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            className="totem-a11y-trigger"
            data-section={item.id}
            onClick={(event) => openSection(item.id, event.currentTarget)}
            onFocus={(event) => previewFromKeyboard(item.id, item.hover, event.currentTarget)}
            onBlur={(event) => {
              if (event.relatedTarget?.closest?.(".totem-a11y-nav")) return;
              endKeyboardPreview();
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
