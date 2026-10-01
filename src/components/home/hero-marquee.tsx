"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { HeroShaderEffect } from "./hero-shader-effect";
import { useReducedMotion } from "./use-reduced-motion";
import { IdentityLine } from "./identity-line";
import { displayFont } from "@/lib/fonts";
import {
  QULL_REST_POSE,
  QULL_SPARK_PATH,
  QULL_VIEWBOX,
  QULL_VIEWBOX_ORIGIN,
  QULL_VIEWBOX_SIZE,
  type QullMood,
} from "@/components/qull/qull-motion";
import { useQullMotion } from "@/components/qull/use-qull-motion";
import type { SectionId } from "./section-config";
import "./hero-marquee.css";

const museoModerno = displayFont;

// The name heads the block, then rows alternate the two roles. The <h1>'s
// aria-label carries the sentence.
const HEADLINE = "Jorge Tovar. Fullstack developer and UX/UI designer.";
const NAME = ["JORGE", "TOVAR"] as const;
const PHRASES = ["FULLSTACK DEVELOPER", "UX/UI DESIGNER"];
// Below this fitted size a clause no longer reads as display type, so rows
// switch to one word per line. Content-driven, not a device breakpoint.
const WORD_PHRASES = ["FULLSTACK", "DEVELOPER", "UX/UI", "DESIGNER"];
const SPLIT_BELOW = 44;
const longest = (phrases: string[]) => phrases.reduce((a, b) => (a.length >= b.length ? a : b));
const FONT_MIN = 24;
const FONT_MAX = 200;
// Role rows are justified: each is fitted to the full width on its own, so
// both edges of the block are clean and the two phrases alternate sizes.
// A short word can't balloon past this multiple of the smallest row.
const MAX_ROW_RATIO = 1.35;
// The name row: JORGE flush left, TOVAR flush right, and Qull, the mascot,
// centered in the negative space between them. It takes the size of the
// largest role row, capped so Qull always keeps air on both sides.
// When words split, the name staggers over two lines (JORGE + Qull, then
// TOVAR flush right) so it keeps the rows' size instead of shrinking.
// Qull's box, sized so its body (tip to base) is a bit over a cap height. The
// box is wider than the body, so the gap adds less air than the box size.
const MARK_SIZE_EM = 0.94;
const NAME_MIN_GAP_EM = MARK_SIZE_EM + 0.4;
// Descenders (the G of JORGE and DESIGNER) hang below the tight line box.
// Rows that have one get just enough room below that the tail clears the
// next row's capitals; the tail itself fills that room, so the optical
// rhythm between rows stays even.
const DESCENDER_CLEARANCE_EM = 0.03;
const hasDescender = (text: string) => /[GJQ]/.test(text);
const MIN_ROWS = 6;
const MAX_ROWS = 24;
const DEFAULT_ROW_COUNT = 10;
// Must match .hero-marquee-row's line-height and letter-spacing; they predict
// row pitch and text width without a layout round-trip.
const LINE_HEIGHT = 0.86;
const LETTER_SPACING_EM = -0.01;
// Headroom for hinting the canvas measurement can't see.
const FIT_MARGIN = 0.99;
// The centered block must overshoot the viewport to leave no dead margin.
const VERTICAL_OVERSHOOT = 1.3;
// Center of Qull's box, in em of the name row: its base sits under the
// baseline, which also leaves the spark room below the top of the page.
const MARK_CENTER_EM = 0.55;
// Outline stroke of the shaded pass, in em of each row.
const OUTLINE_EM = 0.022;
// Qull's detail is finer than a glyph's; the letters' stroke would clog
// its eyes, so its outline is lighter.
const QULL_OUTLINE_RATIO = 0.51;
// How Qull reacts to each hovered totem section.
const QULL_MOODS: Record<SectionId, QullMood> = {
  work: "curious",
  about: "happy",
  stack: "idea",
  contact: "bold",
};
const QULL_OPTIONS = { totemMoods: QULL_MOODS, pauseWhenHeroCovered: true };

// The shader is swapped for its CSS stand-in if it holds the page under
// about 25fps: a median frame over STALL_FRAME_MS in STALL_WINDOWS windows of
// STALL_WINDOW_MS running, some five seconds of it.
const STALL_FRAME_MS = 40;
const STALL_WINDOW_MS = 1500;
const STALL_WINDOWS = 3;

type Layout = {
  split: boolean;
  /** Fitted size per role phrase, and for the name row. */
  sizes: Record<string, number>;
  nameSize: number;
  /** Room below a row whose descenders would hit the next row, per text. */
  spaceAfter: Record<string, number>;
  /** Room between the name's two lines when it staggers. */
  nameLineGap: number;
  /** Width every row reaches: the justified measure. */
  measure: number;
  rowCount: number;
};

type TextPart = { text: string; x: number; y: number };
type Mark = { x: number; y: number; size: number };
type RowMetric = { fontSize: number; parts: TextPart[]; marks: Mark[] };

let sharedMeasureCanvas: HTMLCanvasElement | null = null;
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!sharedMeasureCanvas) sharedMeasureCanvas = document.createElement("canvas");
  return sharedMeasureCanvas.getContext("2d");
}

// Width of `text` at 100px, including the row's letter-spacing.
function measureAt100(text: string, weight: number, family: string): number {
  const ctx = getMeasureCtx();
  if (!ctx) return 1;
  ctx.font = `${weight} 100px ${family}`;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${LETTER_SPACING_EM * 100}px`;
  return ctx.measureText(text).width || 1;
}

// Font size at which `text` spans `width`.
function fitFontSize(text: string, width: number, weight: number, family: string): number {
  if (width <= 0) return FONT_MIN;
  const fitted = (width * 100) / measureAt100(text, weight, family);
  return Math.min(FONT_MAX, Math.max(FONT_MIN, fitted));
}

/**
 * Watches the frame rate while the shader runs and calls `onStall` if it
 * stays too low to be the shader's start-up or a passing hitch. A GPU that
 * can't keep up (or a browser that stalls on the canvas) would otherwise
 * drag every animation on the page down with it, for as long as it stays.
 */
function useStallWatch(active: boolean, onStall: () => void) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const deltas: number[] = [];
    let frame = 0;
    let last = 0;
    let elapsed = 0;
    let strikes = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const delta = now - last;
      last = now;
      // Only frames the hero is drawing count: not behind a section or the
      // intro, and not the gap a hidden tab leaves.
      if (root.hasAttribute("data-hero-covered") || root.hasAttribute("data-home-intro") || delta > 1000) {
        deltas.length = 0;
        elapsed = 0;
        return;
      }
      deltas.push(delta);
      elapsed += delta;
      if (elapsed < STALL_WINDOW_MS) return;
      const median = deltas.sort((a, b) => a - b)[deltas.length >> 1];
      deltas.length = 0;
      elapsed = 0;
      strikes = median > STALL_FRAME_MS ? strikes + 1 : 0;
      if (strikes >= STALL_WINDOWS) onStall();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, onStall]);
}

/**
 * Typographic backdrop: an accessible <h1> with the name, then decorative
 * rows of the two roles that fill the viewport as texture. The role rows
 * are justified to one measure; the name row spans the same measure with
 * JORGE and TOVAR at its edges and Qull between them.
 *
 * Once the WebGPU shader is running, the glyphs (and Qull) turn
 * transparent and the liquid-glass effect, clipped to their shapes by an
 * SVG clipPath, shows in their place. Until then (or under reduced motion,
 * or without WebGPU) they stay solid ink.
 *
 * The clip and outline are native SVG measured off the DOM rows:
 * foreignObject inside a CSS mask doesn't rasterize reliably, and
 * `-webkit-text-stroke` over the shader's soft edge reads as a blur.
 */
export function HeroMarquee() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const nameRefs = useRef<(HTMLElement | null)[]>([]);
  const markRefs = useRef<(SVGSVGElement | null)[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [metrics, setMetrics] = useState<RowMetric[]>([]);
  const [shaderStatus, setShaderStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading"
  );
  // "loading" keeps solid ink so the letters never blank out mid-startup.
  const filled = !reducedMotion && shaderStatus !== "loading";
  const dropShader = useCallback(() => setShaderStatus("unavailable"), []);
  useStallWatch(!reducedMotion && shaderStatus === "ready", dropShader);
  const qullAnchor = useCallback(() => markRefs.current.find(Boolean), []);
  // Qull stays still under reduced motion, like the rest of the hero.
  useQullMotion(sectionRef, qullAnchor, !reducedMotion, QULL_OPTIONS);

  // Layout fitting applies with or without motion.
  useEffect(() => {
    function fit() {
      // A role row, not the name row: the <h1>'s width is derived from
      // --hero-measure, so measuring it would feed each fit its own result
      // and shrink the hero ~1% per re-fit.
      const row = rowRefs.current.find((el, index): el is HTMLElement => index > 0 && Boolean(el));
      if (!row) return;
      const cs = getComputedStyle(row);
      const family = cs.fontFamily || "sans-serif";
      const paddingLeft = parseFloat(cs.paddingLeft) || 0;
      const paddingRight = parseFloat(cs.paddingRight) || 0;
      const measure = (row.clientWidth - paddingLeft - paddingRight) * FIT_MARGIN;

      // Split into single words when the longer clause would be too small.
      const split = fitFontSize(longest(PHRASES), measure, 700, family) < SPLIT_BELOW;
      const phrases = split ? WORD_PHRASES : PHRASES;
      const raw = phrases.map((phrase) => fitFontSize(phrase, measure, 700, family));
      const cap = Math.min(...raw) * MAX_ROW_RATIO;
      const sizes: Record<string, number> = {};
      phrases.forEach((phrase, index) => {
        sizes[phrase] = Math.min(raw[index], cap);
      });

      // The name row takes the largest role row's size (UX/UI DESIGNER),
      // unless JORGE and TOVAR would then crowd out Qull.
      const nameWidthAt100 = split
        ? Math.max(...NAME.map((word) => measureAt100(word, 900, family))) + NAME_MIN_GAP_EM * 100
        : measureAt100(NAME.join(""), 900, family) + NAME_MIN_GAP_EM * 100;
      const largest = Math.max(...phrases.map((phrase) => sizes[phrase]));
      const nameSize = Math.max(FONT_MIN, Math.min(largest, (measure * 100) / nameWidthAt100));

      // Where the face puts its baseline, cap top and G tail inside the
      // tight line box, in em.
      const ctx = getMeasureCtx();
      let baseline = 0.78;
      let capTop = 0.08;
      let tail = 0.997;
      if (ctx) {
        ctx.font = `900 100px ${family}`;
        const m = ctx.measureText("HG");
        const ascent = m.fontBoundingBoxAscent / 100;
        const descent = m.fontBoundingBoxDescent / 100;
        baseline = (LINE_HEIGHT - ascent - descent) / 2 + ascent;
        capTop = baseline - ctx.measureText("H").actualBoundingBoxAscent / 100;
        tail = baseline + ctx.measureText("G").actualBoundingBoxDescent / 100;
      }
      const gap = parseFloat(getComputedStyle(row.parentElement ?? row).rowGap) || 0;
      const roomBelow = (text: string, size: number, nextSize: number, rowGap: number) =>
        hasDescender(text)
          ? Math.max(0, (tail - LINE_HEIGHT + DESCENDER_CLEARANCE_EM) * size - rowGap - capTop * nextSize)
          : 0;
      const spaceAfter: Record<string, number> = {};
      phrases.forEach((phrase, index) => {
        spaceAfter[phrase] = roomBelow(phrase, sizes[phrase], sizes[phrases[(index + 1) % phrases.length]], gap);
      });
      spaceAfter[NAME.join(" ")] = roomBelow(split ? NAME[1] : NAME.join(" "), nameSize, sizes[phrases[0]], gap);
      const nameLineGap = split ? roomBelow(NAME[0], nameSize, nameSize, 0) : 0;

      const meanPitch =
        phrases.reduce((sum, phrase) => sum + sizes[phrase] * LINE_HEIGHT + spaceAfter[phrase], 0) / phrases.length;
      const pitch = meanPitch + gap;
      const needed = pitch > 0 ? Math.ceil((window.innerHeight * VERTICAL_OVERSHOOT) / pitch) : DEFAULT_ROW_COUNT;
      setLayout({
        split,
        sizes,
        nameSize,
        spaceAfter,
        nameLineGap,
        measure,
        rowCount: Math.min(MAX_ROWS, Math.max(MIN_ROWS, needed)),
      });
    }

    // Resize fires in bursts (orientation changes, mobile URL bar), and each
    // fit() re-measures text and re-renders every row: one pass per frame.
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    // The fitted sizes depend on the display face's real metrics.
    document.fonts?.ready.then(fit).catch(() => {});
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const phrases = layout?.split ? WORD_PHRASES : PHRASES;
  const rowCount = layout?.rowCount ?? DEFAULT_ROW_COUNT;
  const roleRows = useMemo(
    () => Array.from({ length: rowCount - 1 }, (_, index) => phrases[index % phrases.length]),
    [rowCount, phrases]
  );

  // Re-measure after the fitted layout has been laid out.
  useEffect(() => {
    if (reducedMotion) return;

    function measure() {
      const baselineOf = (rect: DOMRect, size: number) => rect.top + size * 0.78;
      const next: RowMetric[] = [];
      rowRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const fontSize = parseFloat(cs.fontSize) || 0;
        // Approximate baseline for all-caps display text; a few px of drift
        // is invisible under the moving fill.
        const y = baselineOf(rect, fontSize);
        if (index === 0) {
          // Each word sits on its own line box when the name staggers.
          const parts = NAME.map((text, part) => {
            const wordRect = nameRefs.current[part]?.getBoundingClientRect() ?? rect;
            return { text, x: wordRect.left, y: baselineOf(wordRect, fontSize) };
          });
          const marks = markRefs.current
            .filter((el): el is SVGSVGElement => Boolean(el))
            .map((el) => {
              const markRect = el.getBoundingClientRect();
              return { x: markRect.left, y: markRect.top, size: markRect.width };
            });
          next.push({ fontSize, parts, marks });
          return;
        }
        next.push({
          fontSize,
          parts: [{ text: roleRows[index - 1] ?? "", x: rect.left + (parseFloat(cs.paddingLeft) || 0), y }],
          marks: [],
        });
      });
      setMetrics(next);
    }

    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion, layout, roleRows]);

  const sectionStyle = layout
    ? ({ "--hero-row-font-size": `${layout.sizes[phrases[0]]}px`, "--hero-measure": `${layout.measure}px` } as CSSProperties)
    : undefined;
  const sizeOf = (phrase: string) =>
    layout ? { fontSize: `${layout.sizes[phrase]}px`, marginBottom: `${layout.spaceAfter[phrase]}px` } : undefined;

  const rowClass = (index: number, recede: boolean) =>
    `hero-marquee-row ${index === 0 ? "hero-marquee-row--primary" : recede ? "hero-marquee-row--recede" : ""} ${museoModerno.className}`;
  // Maps Qull's viewBox onto the box its mark occupies on screen.
  const markTransform = (mark: Mark) =>
    `translate(${mark.x} ${mark.y}) scale(${mark.size / QULL_VIEWBOX_SIZE}) translate(${-QULL_VIEWBOX_ORIGIN.x} ${-QULL_VIEWBOX_ORIGIN.y})`;

  // The shapes the fill shows through: every glyph, and Qull's face,
  // accents and spark (its body stays ground). A <clipPath> takes shapes and
  // text only, no groups, so each Qull path carries the mark's transform
  // itself; useQullMotion composes the spark's own onto data-qull-frame.
  const renderClipShapes = () =>
    metrics.flatMap((metric, index) => [
      ...metric.parts.map((part) => (
        <text
          key={`${index}-${part.text}`}
          x={part.x}
          y={part.y}
          className={rowClass(index, false)}
          // Inline font-size: the row class sets the shared size in CSS, which
          // would beat a presentation attribute and shrink the justified rows.
          style={{ fontSize: `${metric.fontSize}px` }}
        >
          {part.text}
        </text>
      )),
      ...metric.marks.flatMap((mark, markIndex) => {
        const frame = markTransform(mark);
        return [
          <path key={`${index}-${markIndex}-face`} data-qull="face" d={QULL_REST_POSE.face} transform={frame} />,
          <path key={`${index}-${markIndex}-accents`} data-qull="accents" d={QULL_REST_POSE.accents} transform={frame} />,
          <path
            key={`${index}-${markIndex}-spark`}
            data-qull="spark"
            data-qull-frame={frame}
            d={QULL_SPARK_PATH}
            transform={`${frame} ${QULL_REST_POSE.spark}`}
          />,
        ];
      }),
    ]);

  const renderOutlineRows = () =>
    metrics.map((metric, index) => {
      const className = rowClass(index, true);
      const paint = {
        fill: "none",
        style: { fontSize: `${metric.fontSize}px`, stroke: "var(--totem-hover-accent, var(--home-outline))" },
        strokeWidth: metric.fontSize * OUTLINE_EM,
        strokeLinejoin: "round" as const,
      };
      const qullPaint = { ...paint, strokeWidth: metric.fontSize * OUTLINE_EM * QULL_OUTLINE_RATIO };
      return (
        <g key={index}>
          {metric.parts.map((part) => (
            <text key={part.text} x={part.x} y={part.y} className={className} {...paint}>
              {part.text}
            </text>
          ))}
          {metric.marks.map((mark, markIndex) => (
            <g key={markIndex} transform={markTransform(mark)}>
              {/* The pose is written per frame by useQullMotion. */}
              <path
                data-qull="body"
                d={QULL_REST_POSE.body}
                vectorEffect="non-scaling-stroke"
                className={className}
                {...qullPaint}
              />
              <path
                data-qull="face"
                d={QULL_REST_POSE.face}
                vectorEffect="non-scaling-stroke"
                className={className}
                {...qullPaint}
              />
              <path
                data-qull="accents"
                d={QULL_REST_POSE.accents}
                vectorEffect="non-scaling-stroke"
                className={className}
                {...qullPaint}
              />
              <path
                data-qull="spark"
                d={QULL_SPARK_PATH}
                transform={QULL_REST_POSE.spark}
                vectorEffect="non-scaling-stroke"
                className={className}
                {...qullPaint}
              />
            </g>
          ))}
        </g>
      );
    });

  const nameWord = (index: 0 | 1) => (
    <span
      ref={(el) => {
        nameRefs.current[index] = el;
      }}
    >
      {NAME[index]}
    </span>
  );
  // The flexible slot is the negative space; Qull sits in its center: an
  // outlined body whose face (and spark) is ink, then the shader.
  const mark = (index: number) => (
    <span className="hero-name-space" aria-hidden="true">
      <svg
        ref={(el) => {
          markRefs.current[index] = el;
        }}
        className="hero-name-mark"
        viewBox={QULL_VIEWBOX}
      >
        <path data-qull="body" className="hero-qull-body" d={QULL_REST_POSE.body} />
        <path data-qull="face" d={QULL_REST_POSE.face} />
        <path data-qull="accents" d={QULL_REST_POSE.accents} />
        <path data-qull="spark" d={QULL_SPARK_PATH} transform={QULL_REST_POSE.spark} />
      </svg>
    </span>
  );

  return (
    <section
      ref={sectionRef}
      className={`hero-marquee${filled ? " hero-marquee--shaded" : ""}`}
      aria-label="Introduction"
      style={sectionStyle}
    >
      <h1
        ref={(el) => {
          rowRefs.current[0] = el;
        }}
        aria-label={HEADLINE}
        className={`hero-marquee-row hero-marquee-row--primary hero-marquee-name ${museoModerno.className}`}
        style={
          layout
            ? ({
                fontSize: `${layout.nameSize}px`,
                marginBottom: `${layout.spaceAfter[NAME.join(" ")]}px`,
                "--name-line-gap": `${layout.nameLineGap}px`,
                "--mark-size": `${MARK_SIZE_EM}em`,
                "--mark-center": `${MARK_CENTER_EM}em`,
              } as CSSProperties)
            : undefined
        }
      >
        {layout?.split ? (
          <>
            <span className="hero-name-line">
              {nameWord(0)}
              {mark(0)}
            </span>
            <span className="hero-name-line hero-name-line--end">{nameWord(1)}</span>
          </>
        ) : (
          <span className="hero-name-line">
            {nameWord(0)}
            {mark(0)}
            {nameWord(1)}
          </span>
        )}
      </h1>
      {roleRows.map((phrase, index) => {
        const rowIndex = index + 1;
        return (
          <p
            key={rowIndex}
            ref={(el) => {
              rowRefs.current[rowIndex] = el;
            }}
            aria-hidden="true"
            className={`hero-marquee-row hero-marquee-row--recede ${museoModerno.className}`}
            style={sizeOf(phrase)}
          >
            {phrase}
          </p>
        );
      })}

      {!reducedMotion ? (
        <>
          {/* The totem wave: a band of the section color sweeping the
              ground. Under the fill, so it never crosses the letters. */}
          <div className="hero-wave" aria-hidden="true" />

          {/* The liquid fill, full-bleed, clipped to the glyphs: the WebGPU
              shader where the browser has it (secure context + support),
              otherwise a compositor-only CSS stand-in so the letters are
              never flat. Inline, so the reference resolves against the
              document in every browser. */}
          <div className="hero-fill" aria-hidden="true" style={{ clipPath: "url(#hero-glyph-clip)" }}>
            {shaderStatus === "unavailable" ? (
              <div className="hero-fill-fallback">
                <div className="hero-fill-fallback-swirl" />
                <div className="hero-fill-fallback-flutes" />
              </div>
            ) : (
              <HeroShaderEffect
                onReady={() => setShaderStatus("ready")}
                onUnavailable={() => setShaderStatus("unavailable")}
              />
            )}
          </div>

          {/* The glyph shapes the fill is clipped to, and the outline drawn
              over their edges. The fill is clipped, rather than the ground
              painted over it through an inverted mask: WebKit applies a
              luminance mask on the CPU on every repaint, and Qull redrawing
              itself each frame held the whole hero near 20fps there. Empty
              until the shader runs, which keeps the fill hidden. */}
          <svg className="hero-knockout" aria-hidden="true" focusable="false">
            <defs>
              <clipPath id="hero-glyph-clip" clipPathUnits="userSpaceOnUse">
                {filled ? renderClipShapes() : null}
              </clipPath>
            </defs>
            {filled ? <g className="hero-outline">{renderOutlineRows()}</g> : null}
          </svg>
        </>
      ) : null}

      <IdentityLine />
    </section>
  );
}
