"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ArrowRight, ArrowUp, ArrowUpRight, Check, Copy, Mail, X } from "lucide-react";

import { TextType } from "@/components/ui/text-type";
import { isWebKit } from "@/lib/engine";
import { SITE } from "@/lib/site";
import { createGoo, paintGoo, type GooShape } from "./goo-canvas";
import { useLocalTime } from "./identity-line";
import type { SectionConfig, SectionId } from "./section-config";
import { markHintUsed, suspendHints } from "./hint";
import "./hero-footer.css";

// The invitation retypes itself: same voice, three ways of saying it.
const INVITES = ["Get in touch!", "Let's talk!", "Say hello!"];
const COPIED_MS = 2000;
// How much wheel travel (px) or finger travel counts as meaning to scroll.
const WHEEL_INTENT = 24;
const SWIPE_INTENT = 48;
// Loose drops thrown up where the colors land.
const SPLASH_DROPLETS = 14;
// Wall-clock backstops: GSAP's ticker stalls when rAF is throttled
// (background tab, low power), and the card must never be left unseen.
const SHOW_BACKSTOP_MS = 2200;
const HIDE_BACKSTOP_MS = 1000;

// Runs the timeline to its end if the clock gets there first.
function backstop(tl: gsap.core.Timeline, ms: number) {
  const timer = window.setTimeout(() => {
    if (tl.progress() < 1) tl.progress(1);
  }, ms);
  tl.eventCallback("onInterrupt", () => window.clearTimeout(timer));
}

const ELSEWHERE = [
  { label: "LinkedIn", href: SITE.linkedin, note: "Fastest reply" },
  { label: "Kanso Studio", href: SITE.studio, note: "My studio" },
  { label: "GitHub", href: SITE.github, note: "The code" },
];

type Props = {
  sections: SectionConfig[];
  frameRef: RefObject<HTMLDivElement | null>;
  trackRef: RefObject<HTMLDivElement | null>;
  /** Whether the hero is free to trade the totem for the footer. */
  canOpen: () => boolean;
  pauseMarquee: () => void;
  resumeMarquee: () => void;
  /** Opens a section from a footer link; the footer is already gone. */
  onOpenSection: (id: SectionId, trigger: HTMLElement) => void;
  onOpenChange: (open: boolean) => void;
  reducedMotion: boolean;
};

type Stripe = { rect: DOMRect; color: string };

// The stripes on show in the bar right now, clipped to it, left to right.
function visibleStripes(frame: HTMLElement, track: HTMLElement): Stripe[] {
  const bar = frame.getBoundingClientRect();
  return Array.from(track.children)
    .map((el) => {
      const r = el.getBoundingClientRect();
      const left = Math.max(r.left, bar.left);
      const right = Math.min(r.right, bar.right);
      return { rect: new DOMRect(left, bar.top, right - left, bar.height), color: getComputedStyle(el).backgroundColor };
    })
    .filter((stripe) => stripe.rect.width > 2)
    .sort((a, b) => a.rect.left - b.rect.left);
}

/**
 * The hero has nothing below it, so a scroll there is read as "what else?":
 * the totem drips out of the air, its colors fall onto a floating card
 * rising from the bottom, splash, and stay on as its top edge. The card is a
 * footer that floats rather than scrolls: a way to get in touch, the
 * sections, the work elsewhere, where and when he is. Scrolling back up (or
 * Esc, or its close button) sends it down and the totem back.
 */
export function HeroFooter({
  sections,
  frameRef,
  trackRef,
  canOpen,
  pauseMarquee,
  resumeMarquee,
  onOpenSection,
  onOpenChange,
  reducedMotion,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bands, setBands] = useState<string[]>(() => sections.map((section) => section.color));
  const openRef = useRef(false);
  const busyRef = useRef(false);
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const splashRef = useRef<SVGSVGElement>(null);
  const gooRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  // Bumped per opening, so the invitation starts typing from the top each time.
  const [openings, setOpenings] = useState(0);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const time = useLocalTime();

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(id);
  }, [copied]);

  const setOpenBoth = useCallback(
    (next: boolean) => {
      openRef.current = next;
      setOpen(next);
      // The theme toggle steps aside while the card is up (hero-footer.css).
      document.documentElement.toggleAttribute("data-footer-open", next);
      onOpenChange(next);
    },
    [onOpenChange]
  );

  const show = useCallback(
    (fromKeyboard = false) => {
      if (openRef.current || busyRef.current || !canOpen()) return;
      const frame = frameRef.current;
      const track = trackRef.current;
      const card = cardRef.current;
      const svg = splashRef.current;
      if (!frame || !track || !card || !svg) return;
      busyRef.current = true;
      suspendHints(true);
      markHintUsed("scroll");
      pauseMarquee();
      const stripes = visibleStripes(frame, track);
      setBands(stripes.map((stripe) => stripe.color));
      setOpenings((count) => count + 1);
      setOpenBoth(true);
      const veil = veilRef.current;

      const content = card.querySelector<HTMLElement>(".hero-footer-content");
      const done = () => {
        busyRef.current = false;
        suspendHints(false);
        if (fromKeyboard) headingRef.current?.focus({ preventScroll: true });
      };

      tlRef.current?.kill();
      if (reducedMotion) {
        gsap.set(frame, { autoAlpha: 0 });
        gsap.set(veil, { autoAlpha: 1 });
        gsap.set(card, { autoAlpha: 1, y: 0 });
        gsap.set(content, { autoAlpha: 1 });
        done();
        return;
      }

      // The card is laid out (hidden) at its resting place; the splash is
      // drawn to land exactly there.
      gsap.set(card, { autoAlpha: 0, y: 0 });
      const box = card.getBoundingClientRect();
      const drops = Array.from(svg.querySelectorAll<SVGRectElement>("[data-drop]"));
      const droplets = Array.from(svg.querySelectorAll<SVGCircleElement>("[data-droplet]"));
      const pool = svg.querySelector<SVGRectElement>("[data-pool]");
      const n = Math.max(1, stripes.length);
      // WebKit runs the goo filter on the CPU, a few frames a second at this
      // size: there the same shapes are painted on a canvas instead, and the
      // SVG stays hidden as the thing GSAP animates.
      const goo = isWebKit() && gooRef.current ? createGoo(gooRef.current) : null;
      const stage = goo ? gooRef.current : svg;
      const shapes: GooShape[] = goo
        ? [
            ...(pool ? [{ el: pool, color: getComputedStyle(pool).fill, base: true }] : []),
            ...drops.flatMap((el, i) => (stripes[i] ? [{ el, color: stripes[i].color }] : [])),
            ...droplets.flatMap((el, k) => (stripes[k % n] ? [{ el, color: stripes[k % n].color }] : [])),
          ]
        : [];
      const blob = Math.min(64, frame.getBoundingClientRect().height * 0.85);
      const bandH = 22;

      const tl = gsap.timeline({ onComplete: done, onUpdate: goo ? () => paintGoo(goo, shapes) : undefined });
      tlRef.current = tl;
      backstop(tl, SHOW_BACKSTOP_MS);
      tl.set(stage, { autoAlpha: 1 });
      tl.set(content, { autoAlpha: 0 });
      // The drops start as the stripes themselves; the bar goes in the same frame.
      drops.forEach((drop, i) => {
        const stripe = stripes[i];
        if (!stripe) {
          tl.set(drop, { attr: { width: 0, height: 0 } }, 0);
          return;
        }
        const { rect } = stripe;
        tl.set(drop, { attr: { x: rect.left, y: rect.top, width: rect.width, height: rect.height, rx: 6 }, fill: stripe.color }, 0);
      });
      tl.set(frame, { autoAlpha: 0 }, 0);
      // Everything behind softens as the colors fall.
      tl.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power1.out" }, 0.1);
      tl.set(pool, { attr: { x: box.left + box.width * 0.3, y: window.innerHeight + 40, width: box.width * 0.4, height: 40, rx: 40 } }, 0);

      // 1. Each stripe gathers itself into a drop.
      drops.forEach((drop, i) => {
        const stripe = stripes[i];
        if (!stripe) return;
        const cx = stripe.rect.left + stripe.rect.width / 2;
        const cy = stripe.rect.top + stripe.rect.height / 2;
        tl.to(
          drop,
          { attr: { x: cx - blob / 2, y: cy - blob / 2, width: blob, height: blob, rx: blob / 2 }, duration: 0.28, ease: "power2.inOut" },
          i * 0.035
        );
      });

      // 2. The drops fall, stretching as they go, onto where the card's top edge will be.
      const landAt = 0.3 + (n - 1) * 0.05 + 0.4;
      drops.forEach((drop, i) => {
        if (!stripes[i]) return;
        const tx = box.left + (box.width * (i + 0.5)) / n;
        tl.to(
          drop,
          {
            attr: { x: tx - blob * 0.38, y: box.top - blob * 0.9, width: blob * 0.76, height: blob * 1.25, rx: blob * 0.38 },
            duration: 0.4,
            ease: "power2.in",
          },
          0.3 + i * 0.05
        );
        // 3. Impact: it spreads along the edge into its band.
        tl.to(
          drop,
          {
            attr: { x: box.left + (box.width * i) / n - 2, y: box.top, width: box.width / n + 4, height: bandH, rx: bandH / 2 },
            duration: 0.32,
            ease: "power3.out",
          },
          0.7 + i * 0.05
        );
      });

      // Meanwhile the card rises out of the bottom edge like a pool, to meet them.
      // Timed so it's just arriving as the first drop lands: two liquids meeting,
      // not a box that's already there.
      tl.to(
        pool,
        { attr: { x: box.left, y: box.top, width: box.width, height: box.height, rx: 16 }, duration: 0.55, ease: "power2.out" },
        0.22
      );

      // The splash: loose drops thrown up at each landing, falling back in.
      droplets.forEach((droplet, k) => {
        const i = k % n;
        const stripe = stripes[i];
        if (!stripe) return;
        const ox = box.left + (box.width * (i + 0.5)) / n;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
        const reach = 30 + Math.random() * 55;
        const r = 3 + Math.random() * 6;
        const at = 0.7 + i * 0.05;
        tl.set(droplet, { attr: { cx: ox, cy: box.top + 4, r }, fill: stripe.color }, at);
        tl.to(
          droplet,
          { attr: { cx: ox + Math.cos(angle) * reach, cy: box.top + Math.sin(angle) * reach }, duration: 0.3, ease: "power2.out" },
          at
        );
        tl.to(droplet, { attr: { cy: box.top + 6, r: 0 }, duration: 0.28, ease: "power2.in" }, at + 0.3);
      });

      // The real card takes over from its liquid double, then its content powers on.
      const settle = landAt + 0.36;
      tl.to(card, { autoAlpha: 1, duration: 0.18, ease: "power1.out" }, settle);
      tl.to(stage, { autoAlpha: 0, duration: 0.22, ease: "power1.out" }, settle + 0.08);
      tl.add(() => {
        if (!content) return;
        gsap.set(content, { autoAlpha: 1 });
        content.classList.remove("neon-flicker-in");
        void content.offsetWidth;
        content.classList.add("neon-flicker-in");
      }, settle + 0.1);
    },
    [canOpen, frameRef, trackRef, pauseMarquee, reducedMotion, setOpenBoth]
  );

  // Back the other way, quicker: the card sinks, the totem sweeps back in.
  const hide = useCallback(
    (options: { instant?: boolean } = {}) => {
      if (!openRef.current) return;
      const frame = frameRef.current;
      const card = cardRef.current;
      // The splash, whichever of the two drew it.
      const splash = [splashRef.current, gooRef.current];
      const veil = veilRef.current;
      tlRef.current?.kill();
      busyRef.current = true;
      suspendHints(true);
      const finish = () => {
        busyRef.current = false;
        suspendHints(false);
        setOpenBoth(false);
      };
      if (options.instant) {
        gsap.set(veil, { autoAlpha: 0 });
        gsap.set(splash, { autoAlpha: 0 });
        gsap.set(card, { autoAlpha: 0 });
        finish();
        return;
      }
      const stripes = frame ? Array.from(trackRef.current?.children ?? []) : [];
      if (reducedMotion) {
        gsap.set(veil, { autoAlpha: 0 });
        gsap.set(splash, { autoAlpha: 0 });
        gsap.set(card, { autoAlpha: 0 });
        gsap.set(frame, { autoAlpha: 1 });
        resumeMarquee();
        finish();
        return;
      }
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(stripes, { clearProps: "transform" });
          resumeMarquee();
          finish();
        },
      });
      tlRef.current = tl;
      backstop(tl, HIDE_BACKSTOP_MS);
      tl.set(splash, { autoAlpha: 0 });
      tl.to(card, { y: 48, autoAlpha: 0, duration: 0.3, ease: "power2.in" }, 0);
      tl.to(veil, { autoAlpha: 0, duration: 0.35, ease: "power1.in" }, 0.05);
      tl.set(stripes, { scaleX: 0, transformOrigin: "left center" }, 0.18);
      tl.set(frame, { autoAlpha: 1 }, 0.18);
      tl.to(stripes, { scaleX: 1, duration: 0.4, ease: "power3.inOut", stagger: 0.04 }, 0.2);
    },
    [frameRef, trackRef, reducedMotion, resumeMarquee, setOpenBoth]
  );

  // Scroll intent: wheel, a swipe, or the keys that scroll a page.
  useEffect(() => {
    let wheel = 0;
    let wheelReset = 0;
    let touchY: number | null = null;
    const card = () => cardRef.current;
    // Scrolling inside the card (short screens) is the card's own business
    // until it's back at its top.
    const cardScrolls = (target: EventTarget | null, down: boolean) => {
      const el = card();
      if (!el || !(target instanceof Node) || !el.contains(target)) return false;
      return down ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0;
    };

    const onWheel = (event: WheelEvent) => {
      if (busyRef.current) return;
      const down = event.deltaY > 0;
      if (openRef.current && cardScrolls(event.target, down)) return;
      window.clearTimeout(wheelReset);
      wheelReset = window.setTimeout(() => (wheel = 0), 180);
      wheel += event.deltaY;
      if (wheel > WHEEL_INTENT && !openRef.current) {
        wheel = 0;
        show();
      } else if (wheel < -WHEEL_INTENT && openRef.current) {
        wheel = 0;
        hide();
      }
    };
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchY === null || busyRef.current) return;
      const dy = (event.touches[0]?.clientY ?? touchY) - touchY;
      if (dy < -SWIPE_INTENT && !openRef.current) {
        touchY = null;
        show();
      } else if (dy > SWIPE_INTENT && openRef.current && !cardScrolls(event.target, false)) {
        touchY = null;
        hide();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const downKeys = ["ArrowDown", "PageDown", "End"];
      const upKeys = ["ArrowUp", "PageUp", "Home", "Escape"];
      // Space scrolls a page, but on a focused button it presses it.
      if (event.key === " " && !target?.closest("button, a")) downKeys.push(" ");
      if (!openRef.current && downKeys.includes(event.key)) {
        if (!canOpen()) return;
        event.preventDefault();
        show(true);
      } else if (openRef.current && upKeys.includes(event.key) && !cardScrolls(target, false)) {
        event.preventDefault();
        hide();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(wheelReset);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [show, hide, canOpen]);

  useEffect(
    () => () => {
      tlRef.current?.kill();
      document.documentElement.removeAttribute("data-footer-open");
    },
    []
  );

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
    } catch {
      // The address is right there to select.
    }
  };

  const goTo = (id: SectionId, trigger: HTMLElement) => {
    hide({ instant: true });
    onOpenSection(id, trigger);
  };

  const n = bands.length || 4;

  return (
    <>
      {/* Softens the hero behind the card; a press on it puts the card away. */}
      <div ref={veilRef} className="hero-footer-veil" aria-hidden="true" onClick={() => hide()} />

      {/* The liquid double: stripes, drops and the rising card, merged by a
          goo filter so they read as one fluid. Only there mid-splash. */}
      <svg ref={splashRef} className="hero-footer-splash" aria-hidden="true">
        <defs>
          <filter id="hero-footer-goo" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
        <g filter="url(#hero-footer-goo)">
          <rect data-pool="" className="hero-footer-pool" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} data-drop="" />
          ))}
          {Array.from({ length: SPLASH_DROPLETS }, (_, i) => (
            <circle key={i} data-droplet="" r={0} />
          ))}
        </g>
      </svg>
      {/* WebKit's stand-in for the filtered SVG (goo-canvas.ts). */}
      <canvas ref={gooRef} className="hero-footer-splash" aria-hidden="true" />

      <footer
        ref={cardRef}
        className="hero-footer"
        aria-label="Get in touch"
        aria-hidden={!open}
        inert={!open}
      >
        {/* Where the totem's colors landed: one curved band each. */}
        <svg className="hero-footer-bands" viewBox={`0 0 ${n * 100} 30`} preserveAspectRatio="none" aria-hidden="true">
          {bands.map((color, i) => (
            <path
              key={i}
              fill={color}
              d={`M${i * 100 - 1} 0 H${i * 100 + 101} V14 C${i * 100 + 78} 14 ${i * 100 + 70} 28 ${i * 100 + 50} 28 C${i * 100 + 30} 28 ${i * 100 + 22} 14 ${i * 100 - 1} 14 Z`}
            />
          ))}
        </svg>

        <div className="hero-footer-content">
          <button type="button" className="hero-footer-close" aria-label="Close" onClick={() => hide()}>
            <X className="size-4" aria-hidden="true" />
          </button>

          <div className="hero-footer-lead">
            {/* Named once for assistive tech; the typing line is visual. */}
            <h2 ref={headingRef} tabIndex={-1} className="hero-footer-heading" aria-label={`Looking for more? ${INVITES[0]}`}>
              <span aria-hidden="true">Looking for more?</span>
              {open && !reducedMotion ? (
                <TextType
                  key={openings}
                  className="hero-footer-accent"
                  text={INVITES}
                  initialDelay={1200}
                  typingSpeed={70}
                  deletingSpeed={35}
                  pauseDuration={2600}
                  cursorCharacter="_"
                  cursorClassName="hero-footer-cursor"
                />
              ) : (
                <span aria-hidden="true" className="hero-footer-accent">
                  {INVITES[0]}
                </span>
              )}
            </h2>
            <div className="hero-footer-actions">
              <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="hero-footer-cta">
                Message me on LinkedIn
                <ArrowUpRight className="size-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <span className="hero-footer-email">
                <a href={`mailto:${SITE.email}`} className="hero-footer-link">
                  <Mail className="size-4" aria-hidden="true" />
                  {SITE.email}
                </a>
                <button
                  type="button"
                  className="hero-footer-copy"
                  onClick={copyEmail}
                  aria-label={copied ? "Email copied" : "Copy email address"}
                >
                  {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                </button>
                <span className="sr-only" role="status" aria-live="polite">
                  {copied ? "Email address copied" : ""}
                </span>
              </span>
            </div>
          </div>

          <div className="hero-footer-columns">
            <nav aria-label="Sections" className="hero-footer-column">
              <p className="hero-footer-label">Explore</p>
              <ul>
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      className="hero-footer-link hero-footer-section"
                      style={{ "--dot": section.color } as React.CSSProperties}
                      onClick={(event) => goTo(section.id, event.currentTarget)}
                    >
                      {section.label}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="hero-footer-column">
              <p className="hero-footer-label">Elsewhere</p>
              <ul>
                {ELSEWHERE.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} target="_blank" rel="noreferrer" className="hero-footer-link">
                      {item.label}
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                    <span className="hero-footer-note">{item.note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hero-footer-column">
              <p className="hero-footer-label">Based in</p>
              <ul className="hero-footer-facts">
                <li>
                  Puebla, Mexico
                  {time ? (
                    <>
                      {" · "}
                      <time aria-label={`Local time ${time}`}>{time}</time>
                    </>
                  ) : null}
                </li>
                <li>Remote, anywhere</li>
                <li>Spanish · English (C2)</li>
                <li className="hero-footer-available">Open to full-time and freelance work</li>
              </ul>
            </div>
          </div>

          <div className="hero-footer-base">
            <p>
              © {new Date().getFullYear()} <span className="hero-footer-name">{SITE.name}</span> · From interface to
              infrastructure.
            </p>
            <button type="button" className="hero-footer-link hero-footer-back" onClick={() => hide()}>
              <ArrowUp className="size-3.5" aria-hidden="true" />
              Back up
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
