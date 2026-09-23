"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { X } from "lucide-react";

import { getSections, getReadableTextColor, getNeonColor, type SectionId } from "./section-config";
import { GaleriaSection } from "./sections/galeria-section";
import { KansoSection } from "./sections/kanso-section";
import { AboutSection } from "./sections/about-section";
import { StackSection } from "./sections/stack-section";
import { ContactSection } from "./sections/contact-section";
import { useReducedMotion } from "./use-reduced-motion";
import { useMediaQuery } from "./use-media-query";
import { setHeroCovered, setTotemAccentColor, setTotemChromaWaveColor, setTotemWaveColor } from "./totem-hover";
import { Component as LumaSpin } from "@/components/ui/luma-spin";
import "./color-totem-nav.css";

// Only rendered inside an open section, so kept out of the first-load
// bundle and warmed on idle once the intro settles.
const loadParticleText = () => import("@/components/ui/particle-text");
const loadSplashCursor = () => import("@/components/ui/splash-cursor");
const ParticleText = dynamic(() => loadParticleText().then((m) => m.ParticleText), { ssr: false });
const SplashCursor = dynamic(() => loadSplashCursor().then((m) => m.SplashCursor), { ssr: false });

function preloadSectionEffects() {
  const run = () => {
    void loadParticleText();
    void loadSplashCursor();
  };
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 2500 });
  else window.setTimeout(run, 1200);
}

// Set by the inline script in HomePage before first paint, so a slow
// hydration never flashes the hero before the intro.
const INTRO_ATTR = "data-home-intro";

// Pause between the color covering the screen and the content appearing.
const LOADER_HOLD_MS = 700;

// Touch has no hover preview, so a tap plays the hover wave first and the
// reveal starts while its tail is still leaving.
const TAP_WAVE_LEAD_MS = 210;

const SECTION_CONTENT: Record<SectionId, () => React.ReactElement> = {
  galeria: GaleriaSection,
  kanso: KansoSection,
  about: AboutSection,
  stack: StackSection,
  contact: ContactSection,
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
  const titleSlotRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);

  const targetScaleRef = useRef(0);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const activeIdRef = useRef<SectionId | null>(null);
  const readyRef = useRef(false);
  const transitioningRef = useRef(false);
  const tapWaveTimerRef = useRef<number | null>(null);

  const [activeId, setActiveId] = useState<SectionId | null>(null);
  // Gates the title's ParticleText mount so its intro starts when the
  // content becomes visible, not while it's still hidden behind the reveal.
  const [contentReady, setContentReady] = useState(false);
  // Where the full-screen particle title converges, measured from the
  // empty slot that reserves its layout space.
  const [titleAnchor, setTitleAnchor] = useState<{ x: number; y: number; maxWidth: number } | null>(null);

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
      // sessionStorage unavailable — treat as unseen.
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
      readyRef.current = true;
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
    tl.to({}, { duration: 0.4 }) // hold on black
      .to(stripes, { scaleX: 1, duration: 0.45, ease: "power3.inOut", stagger: 0.05 })
      .to({}, { duration: 0.15 })
      .to(frame, {
        ...rest,
        borderRadius: rest.height / 2,
        duration: 0.75,
        ease: "expo.inOut",
        onComplete: finish,
      });

    // A throttled or backgrounded tab can suspend animation frames entirely.
    // A timer still fires, so the intro can never strand the page full-screen.
    const fallback = window.setTimeout(finish, 3200);

    return () => {
      tl.kill();
      window.clearTimeout(fallback);
      document.documentElement.removeAttribute(INTRO_ATTR);
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
      lastTriggerRef.current = triggerEl ?? null;
      setContentReady(false);

      // Freeze the carousel, then grow the reveal from the stripe's center.
      marqueeRef.current?.pause();
      const source = triggerEl?.classList.contains("totem-stripe")
        ? triggerEl
        : stripeRefs.current[id];
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
      setTotemAccentColor(color);
      setTotemWaveColor(color);
      setTotemChromaWaveColor(color);
      tapWaveTimerRef.current = window.setTimeout(() => {
        tapWaveTimerRef.current = null;
        openSection(id, triggerEl, true);
      }, TAP_WAVE_LEAD_MS);
    },
    [openSection]
  );

  // Reveals the body once the particle title has formed.
  const handleTitleSettled = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (reducedMotion) {
      gsap.set(body, { autoAlpha: 1 });
      return;
    }
    body.classList.remove("neon-flicker-in");
    // Reflow so re-adding the class restarts the animation.
    void body.offsetWidth;
    body.classList.add("neon-flicker-in");
  }, [reducedMotion]);

  // Keep the particle title's anchor in sync with its layout slot.
  useEffect(() => {
    if (!contentReady) return;
    const slot = titleSlotRef.current;
    if (!slot) return;

    function measure() {
      const rect = slot!.getBoundingClientRect();
      setTitleAnchor({ x: rect.left, y: rect.top + rect.height / 2, maxWidth: rect.width });
    }

    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      // Never reuse the previous section's anchor.
      setTitleAnchor(null);
    };
  }, [contentReady]);

  // Pointer response inside an open section: the watermark drifts opposite
  // the cursor and the CTA pulls toward it within a short radius.
  useEffect(() => {
    if (!contentReady || !finePointer || reducedMotion) return;
    const container = overlayContentRef.current;
    const watermark = watermarkRef.current;
    const cta = container?.querySelector<HTMLElement>(".section-overlay-cta") ?? null;
    if (!container) return;

    const watermarkX = watermark ? gsap.quickTo(watermark, "x", { duration: 0.6, ease: "power3.out" }) : null;
    const watermarkY = watermark ? gsap.quickTo(watermark, "y", { duration: 0.6, ease: "power3.out" }) : null;
    const ctaX = cta ? gsap.quickTo(cta, "x", { duration: 0.35, ease: "power3.out" }) : null;
    const ctaY = cta ? gsap.quickTo(cta, "y", { duration: 0.35, ease: "power3.out" }) : null;

    const MAGNET_RADIUS = 90;
    const MAGNET_PULL = 0.3;
    const WATERMARK_DRIFT = 16;

    function handleMove(event: PointerEvent) {
      if (watermarkX && watermarkY) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Opposite the cursor, like a heavy pane of glass leaning away from
        // a touch — centered on the viewport since the watermark itself is
        // anchored to the panel's corner, not the pointer.
        watermarkX(((event.clientX / vw) - 0.5) * -2 * WATERMARK_DRIFT);
        watermarkY(((event.clientY / vh) - 0.5) * -2 * WATERMARK_DRIFT);
      }
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
      gsap.killTweensOf([watermark, cta].filter(Boolean) as HTMLElement[]);
      if (watermark) gsap.set(watermark, { x: 0, y: 0 });
      if (cta) gsap.set(cta, { x: 0, y: 0 });
    };
  }, [contentReady, finePointer, reducedMotion, activeId]);

  // The fluid cursor paints the inverse of what's under it: neon over the
  // base background, base over elements marked data-cursor-neon.
  const resolveCursorColor = useCallback((clientX: number, clientY: number) => {
    const activeSection = sectionsRef.current.find((item) => item.id === activeIdRef.current);
    if (!activeSection) return "#000000";
    const target = document.elementFromPoint(clientX, clientY);
    const overNeon = target?.closest('[data-cursor-neon="true"]');
    return overNeon ? activeSection.color : getNeonColor(activeSection.color);
  }, []);

  // Open: grow the section color from its stripe to cover the screen, then
  // hand off to a static backdrop, a short loader beat, and the content.
  useEffect(() => {
    if (!activeId) return;
    const content = overlayContentRef.current;
    const backdrop = backdropRef.current;
    const loader = loaderRef.current;
    const reveal = revealRef.current;
    const target = targetScaleRef.current;
    gsap.set(content, { autoAlpha: 0 });
    gsap.set(backdrop, { autoAlpha: 0 });
    gsap.set(loader, { autoAlpha: 0 });

    let settled = false;
    let loaderDelay: gsap.core.Tween | null = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      gsap.killTweensOf(reveal);
      gsap.set(reveal, { scale: target });
      // A static backdrop replaces the scaled circle once it covers the screen.
      gsap.set(backdrop, { autoAlpha: 1 });
      setHeroCovered(true);
      // Reset in the same flush that hides the wave layer, so it never sweeps back.
      setTotemAccentColor(null);
      setTotemWaveColor(null);
      setTotemChromaWaveColor(null);
      transitioningRef.current = false;
      closeButtonRef.current?.focus();
      if (!content) return;

      const revealContent = () => {
        // The body stays hidden until the title forms (handleTitleSettled).
        gsap.set(content, { autoAlpha: 1 });
        setContentReady(true);
        const body = bodyRef.current;
        if (reducedMotion && body) gsap.set(body, { autoAlpha: 1 });
      };

      if (reducedMotion || !loader) {
        revealContent();
        return;
      }
      gsap.set(loader, { autoAlpha: 1 });
      loaderDelay = gsap.delayedCall(LOADER_HOLD_MS / 1000, () => {
        // The title starts forming while the loader fades, not after.
        gsap.to(loader, { autoAlpha: 0, duration: 0.2, ease: "power2.out" });
        revealContent();
      });
    };

    if (reducedMotion || !reveal) {
      finish();
      return;
    }

    const tween = gsap.to(reveal, { scale: target, duration: 0.6, ease: "power3.out", onComplete: finish });
    const fallback = window.setTimeout(finish, 1100);
    return () => {
      loaderDelay?.kill();
      tween.kill();
      window.clearTimeout(fallback);
    };
  }, [activeId, reducedMotion]);

  const closeSection = useCallback(() => {
    if (!activeIdRef.current) return;
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
      marqueeRef.current?.resume();
      lastTriggerRef.current?.focus();
      setTotemAccentColor(null);
      setTotemWaveColor(null);
      setTotemChromaWaveColor(null);
    };

    if (reducedMotion || !reveal) {
      finish();
      return;
    }

    // Bring the hero back before any of it can show around the shrinking color.
    setHeroCovered(false);
    transitioningRef.current = true;
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
      if (event.key === "Escape") closeSection();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeId, closeSection]);

  const section = activeId ? sections.find((item) => item.id === activeId) ?? null : null;
  const ActiveContent = activeId ? SECTION_CONTENT[activeId] : null;
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
        <div ref={trackRef} className="totem-track">
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
                  else waveThenOpen(item.color, item.id, event.currentTarget);
                }}
                onMouseEnter={() => {
                  // iOS fires an emulated mouseenter on tap with no matching
                  // leave, which would strand the wave lit.
                  if (!finePointer || activeIdRef.current) return;
                  setTotemAccentColor(item.color);
                  setTotemWaveColor(item.color);
                  setTotemChromaWaveColor(item.color);
                }}
              >
                <span className="totem-stripe-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {section && ActiveContent ? (
        <div ref={overlayRef} className="section-overlay">
          {/* Static stand-in for the reveal circle once it covers the screen. */}
          <div ref={backdropRef} className="section-overlay-backdrop" style={{ backgroundColor: section.color }} />
          {/* Oversized section name, echoing the hero's type-as-texture. */}
          <div ref={watermarkRef} className="section-overlay-watermark" style={{ color: neon ?? undefined }} aria-hidden="true">
            {section.label}
          </div>
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
              } as React.CSSProperties
            }
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="section-overlay-close"
              onClick={closeSection}
              aria-label="Cerrar"
              data-cursor-neon="true"
            >
              <X className="size-5" />
            </button>
            {/* Reserves the title's space; the particles render in the
                full-screen canvas below and converge here. */}
            <div ref={titleSlotRef} className="section-overlay-title-particle" data-cursor-neon="true" />
            {/* Hidden until handleTitleSettled adds .neon-flicker-in. */}
            <div ref={bodyRef} className="section-overlay-body" data-cursor-neon="true">
              <ActiveContent />
            </div>
          </div>
          <div className="section-overlay-title-canvas" aria-hidden="true">
            {contentReady && titleAnchor ? (
              <ParticleText
                text={section.label}
                color={neon ?? "#ffffff"}
                highlightColor={neon ?? "#ffffff"}
                particleSize={2}
                density={3}
                gatherDuration={600}
                stagger={100}
                idleDrift={0.5}
                fontSize="clamp(2.5rem, 10vw, 4rem)"
                align="start"
                fontWeight={800}
                glow
                offsetX={titleAnchor.x}
                offsetY={titleAnchor.y}
                maxWidth={titleAnchor.maxWidth}
                onSettled={handleTitleSettled}
              />
            ) : null}
          </div>
          {/* Mounted after the reveal: compiling WebGL mid-animation stalls it. */}
          {finePointer && contentReady ? <SplashCursor resolveColor={resolveCursorColor} /> : null}
        </div>
      ) : null}

      {/* Static, keyboard-operable nav behind the decorative carousel. */}
      <nav aria-label="Secciones" className="totem-a11y-nav">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            className="totem-a11y-trigger"
            onClick={(event) => openSection(item.id, event.currentTarget)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
