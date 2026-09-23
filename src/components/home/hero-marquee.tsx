"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MuseoModerno } from "next/font/google";

import { HeroShaderEffect } from "./hero-shader-effect";
import { useReducedMotion } from "./use-reduced-motion";
import "./hero-marquee.css";

const museoModerno = MuseoModerno({
  subsets: ["latin"],
  weight: ["700", "900"],
});

// Rows alternate between the headline's two clauses; the <h1>'s
// aria-label still carries the full sentence.
const HEADLINE = "FULLSTACK DEVELOPER — UX/UI DESIGNER";
const PHRASES = ["FULLSTACK DEVELOPER", "UX/UI DESIGNER"];
// Below this fitted size a clause no longer reads as display type, so rows
// switch to one word per line. Content-driven, not a device breakpoint.
const WORD_PHRASES = ["FULLSTACK", "DEVELOPER", "UX/UI", "DESIGNER"];
const SPLIT_BELOW = 44;
// Every row shares the size fitted to the longer clause, so the shorter one
// has slack and the tight line-height never lets glyphs collide.
const longest = (phrases: string[]) => phrases.reduce((a, b) => (a.length >= b.length ? a : b));
const FONT_MIN = 24;
const FONT_MAX = 160;
const MIN_ROWS = 6;
const MAX_ROWS = 24;
const DEFAULT_ROW_COUNT = 10;
// Must match .hero-marquee-row's line-height; predicts row pitch so the
// row count can be solved without a layout round-trip.
const LINE_HEIGHT = 0.86;
// Headroom for letter-spacing and hinting the canvas measurement ignores.
const FIT_MARGIN = 0.94;
// The centered block must overshoot the viewport to leave no dead margin.
const VERTICAL_OVERSHOOT = 1.3;

type RowMetric = { x: number; y: number; fontSize: number; text: string };

let sharedMeasureCanvas: HTMLCanvasElement | null = null;
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!sharedMeasureCanvas) sharedMeasureCanvas = document.createElement("canvas");
  return sharedMeasureCanvas.getContext("2d");
}

// Font size at which `text` fills `availableWidth`, minus FIT_MARGIN.
function fitFontSize(text: string, availableWidth: number, weight: number, family: string): number {
  const ctx = getMeasureCtx();
  if (!ctx || availableWidth <= 0) return FONT_MIN;
  const referenceSize = 100;
  ctx.font = `${weight} ${referenceSize}px ${family}`;
  const measuredWidth = ctx.measureText(text).width || 1;
  const fitted = (availableWidth * FIT_MARGIN * referenceSize) / measuredWidth;
  return Math.min(FONT_MAX, Math.max(FONT_MIN, fitted));
}

/**
 * Typographic backdrop: one accessible <h1> plus decorative rows that fill
 * the viewport as texture, all at one fitted size.
 *
 * Once the WebGPU shader is running, the glyphs turn transparent and the
 * liquid-glass effect shows through them via an SVG mask. Until then (or
 * under reduced motion, or without WebGPU) the text stays solid ink.
 *
 * The mask and outline are native SVG <text> measured off the DOM rows:
 * foreignObject inside a CSS mask doesn't rasterize reliably, and
 * `-webkit-text-stroke` over the shader's soft edge reads as a blur.
 */
export function HeroMarquee() {
  const reducedMotion = useReducedMotion();
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const [rowCount, setRowCount] = useState(DEFAULT_ROW_COUNT);
  const [fontSize, setFontSize] = useState<number | null>(null);
  const [phrases, setPhrases] = useState(PHRASES);
  const [metrics, setMetrics] = useState<RowMetric[]>([]);
  const [shaderStatus, setShaderStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading"
  );
  // "loading" keeps solid ink so the letters never blank out mid-startup.
  const filled = !reducedMotion && shaderStatus !== "loading";

  // Layout fitting applies with or without motion.
  useEffect(() => {
    function fit() {
      const row = rowRefs.current.find((el): el is HTMLElement => Boolean(el));
      if (!row) return;
      const cs = getComputedStyle(row);
      const family = cs.fontFamily || "sans-serif";
      const paddingLeft = parseFloat(cs.paddingLeft) || 0;
      const paddingRight = parseFloat(cs.paddingRight) || 0;
      const available = row.clientWidth - paddingLeft - paddingRight;
      // Fit against the heavier (wider) of the two weights in use.
      let fitted = fitFontSize(longest(PHRASES), available, 900, family);
      const split = fitted < SPLIT_BELOW;
      if (split) fitted = fitFontSize(longest(WORD_PHRASES), available, 900, family);
      setPhrases(split ? WORD_PHRASES : PHRASES);
      setFontSize(fitted);

      const gap = parseFloat(getComputedStyle(row.parentElement ?? row).rowGap) || 0;
      const pitch = fitted * LINE_HEIGHT + gap;
      const needed = pitch > 0 ? Math.ceil((window.innerHeight * VERTICAL_OVERSHOOT) / pitch) : DEFAULT_ROW_COUNT;
      setRowCount(Math.min(MAX_ROWS, Math.max(MIN_ROWS, needed)));
    }

    // Resize fires in bursts (orientation changes, mobile URL bar), and each
    // fit() re-measures text and re-renders every row: one pass per frame.
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Re-measure after fontSize/rowCount have been laid out.
  useEffect(() => {
    if (reducedMotion) return;

    function measure() {
      const next = rowRefs.current
        .filter((el): el is HTMLElement => Boolean(el))
        .map((el, index) => {
          const rect = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const paddingLeft = parseFloat(cs.paddingLeft) || 0;
          const rowFontSize = parseFloat(cs.fontSize) || 0;
          // Approximate baseline for all-caps display text; a few px of
          // drift is invisible under the moving fill.
          return {
            x: rect.left + paddingLeft,
            y: rect.top + rowFontSize * 0.78,
            fontSize: rowFontSize,
            text: phrases[index % phrases.length],
          };
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
  }, [reducedMotion, fontSize, rowCount, phrases]);

  const rowStyle = fontSize ? ({ "--hero-row-font-size": `${fontSize}px` } as CSSProperties) : undefined;

  return (
    <section
      className={`hero-marquee${filled ? " hero-marquee--shaded" : ""}`}
      aria-label={`Jorge Tovar. ${HEADLINE}`}
      style={rowStyle}
    >
      <h1
        ref={(el) => {
          rowRefs.current[0] = el;
        }}
        aria-label={HEADLINE}
        className={`hero-marquee-row hero-marquee-row--primary ${museoModerno.className}`}
      >
        {phrases[0]}
      </h1>
      {Array.from({ length: rowCount - 1 }).map((_, index) => {
        const rowIndex = index + 1;
        return (
          <p
            key={rowIndex}
            ref={(el) => {
              rowRefs.current[rowIndex] = el;
            }}
            aria-hidden="true"
            className={`hero-marquee-row hero-marquee-row--recede ${museoModerno.className}`}
          >
            {phrases[rowIndex % phrases.length]}
          </p>
        );
      })}

      {!reducedMotion ? (
        <>
          {/* The liquid fill, full-bleed: the WebGPU shader where the
              browser has it (secure context + support), otherwise a
              compositor-only CSS stand-in so the letters are never flat. */}
          <div className="hero-fill" aria-hidden="true">
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

          {/* Paints the background over the fill everywhere except the
              glyphs. SVG masking SVG, not a CSS mask-image pointing at an
              SVG <mask> from an HTML element — that combination is not
              reliable in WebKit. The totem wave lives inside the same
              masked group so it sweeps the background, never the letters. */}
          <svg className="hero-knockout" aria-hidden="true" focusable="false">
            <defs>
              <mask id="hero-knockout-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                <rect width="100%" height="100%" fill="#fff" />
                {filled
                  ? metrics.map((metric, index) => (
                      <text
                        key={index}
                        x={metric.x}
                        y={metric.y}
                        fontSize={metric.fontSize}
                        fill="#000"
                        className={`hero-marquee-row ${index === 0 ? "hero-marquee-row--primary" : ""} ${museoModerno.className}`}
                      >
                        {metric.text}
                      </text>
                    ))
                  : null}
              </mask>
              <linearGradient id="hero-wave-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" className="hero-wave-stop hero-wave-stop--clear" />
                <stop offset="0.42" className="hero-wave-stop hero-wave-stop--clear" />
                <stop offset="0.5" className="hero-wave-stop hero-wave-stop--peak" />
                <stop offset="0.58" className="hero-wave-stop hero-wave-stop--clear" />
                <stop offset="1" className="hero-wave-stop hero-wave-stop--clear" />
              </linearGradient>
            </defs>

            <g mask="url(#hero-knockout-mask)">
              <rect className="hero-knockout-ground" width="100%" height="100%" />
              <rect
                className="hero-wave"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
                fill="url(#hero-wave-gradient)"
              />
            </g>

            {filled ? (
              <g aria-hidden="true">
                {metrics.map((metric, index) => (
                  <text
                    key={index}
                    x={metric.x}
                    y={metric.y}
                    fontSize={metric.fontSize}
                    fill="none"
                    style={{ stroke: "var(--totem-hover-accent, var(--home-accent))" }}
                    strokeWidth={metric.fontSize * 0.022}
                    strokeLinejoin="round"
                    className={`hero-marquee-row ${index === 0 ? "hero-marquee-row--primary" : "hero-marquee-row--recede"} ${museoModerno.className}`}
                  >
                    {metric.text}
                  </text>
                ))}
              </g>
            ) : null}
          </svg>
        </>
      ) : null}

      <span className="hero-marquee-name">Jorge Tovar</span>
    </section>
  );
}
