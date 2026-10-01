"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

import "./stroke-ascii-title.css";

// A fusion of three React Bits pieces:
// - StrokeText: on start, each glyph's outline draws itself on (no fill).
// - ScrambledText: on hover, a lens follows the pointer; cells inside it
//   scramble...
// - ASCIIText: ...and settle as ASCII art of the real glyphs, while the rest
//   of the title keeps its outline. Characters are picked by shape, not just
//   density: each cell and each candidate character is described by its
//   coverage in a 2x3 grid of sub-regions, and the nearest match wins, so
//   edges get / \ | _ instead of a blurry ramp. Drawn on a DPR-aware canvas; no WebGL scene.

const FONT_UNITS = 100; // SVG user-space font size; the viewBox scales it.
const LETTER_SPACING = -2;
const DRAW_DURATION = 1;
// onDrawn fires once the outline is this far along, so whatever follows
// (the panel body) overlaps the draw instead of queueing behind it.
const DRAWN_AT = 0.6;
const DRAW_STAGGER = 0.06;
// The draw-on's dash, in font sizes (see `dash` below).
const DASH_GLYPHS = 14;

const ROWS_TARGET = 21; // Cells across the title's full height.
const MIN_CELL_H = 4.5;
const MAX_CELL_H = 10;
const SUPERSAMPLE = 3; // Glyph raster resolution per CSS pixel.
const SHAPE_CONTRAST = 1.8; // Sharpens each cell's sub-region vector.

const LENS_RADIUS = 0.62; // Lens radius as a share of the title's height.
const LENS_SOFT_PX = 10; // Soft rim where the outline fades under the lens.
const LENS_FOLLOW_MS = 55; // Easing constant for the lens chasing the pointer.
const LENS_GROW_MS = 110; // Easing constant for the lens opening and closing.
const JITTER_MS = 70;
const SCRAMBLE_MIN_MS = 140;
const SCRAMBLE_MAX_MS = 300;
const FLICK_MIN_MS = 45; // Scrambling cells change glyph at ~15-20Hz,
const FLICK_MAX_MS = 85; // not every frame, so it reads as type, not static.
const SHIMMER_EVERY_MS = 90; // While hovered, a few settled cells re-decode.
const SHIMMER_CELLS = 2;
const HOT_MIX = 0.5; // Scrambling glyphs run hotter (toward white).
const CORE_ALPHA = 0.7; // Interior cells sit back so the contour carries the letter.

const CHARSET =
  " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

type Box = { x: number; y: number; width: number; height: number };

type Grid = {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  fontPx: number;
  /** Charset index per cell; 0 (space) means no ink. */
  target: Uint8Array;
  /** 1 where the cell sits on the glyph's contour. */
  edge: Uint8Array;
  /** Charset indices sorted by density, and each glyph's rank in that order. */
  byDensity: number[];
  rankOf: number[];
};

type ShapeTable = { key: string; vectors: Float32Array; density: Float32Array };

let shapeCache: ShapeTable | null = null;

// Coverage of each charset glyph in 2 columns x 3 rows of sub-regions,
// normalised per region so the nearest-neighbour match weighs them evenly.
function shapeTable(fontFamily: string): ShapeTable {
  if (shapeCache?.key === fontFamily) return shapeCache;
  const size = 64;
  const canvas = document.createElement("canvas");
  const probe = canvas.getContext("2d");
  const vectors = new Float32Array(CHARSET.length * 6);
  const density = new Float32Array(CHARSET.length);
  if (!probe) return { key: fontFamily, vectors, density };
  probe.font = `${size}px ${fontFamily}`;
  const w = Math.ceil(probe.measureText("M").width);
  const h = size;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.font = `${size}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";

  for (let i = 0; i < CHARSET.length; i++) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillText(CHARSET[i], w / 2, h / 2);
    const data = ctx.getImageData(0, 0, w, h).data;
    const sums = new Float32Array(6);
    const counts = new Float32Array(6);
    for (let y = 0; y < h; y++) {
      const ry = Math.min(2, Math.floor((y / h) * 3));
      for (let x = 0; x < w; x++) {
        const region = ry * 2 + (x < w / 2 ? 0 : 1);
        sums[region] += data[(y * w + x) * 4 + 3];
        counts[region]++;
      }
    }
    let total = 0;
    for (let r = 0; r < 6; r++) {
      const v = sums[r] / counts[r] / 255;
      vectors[i * 6 + r] = v;
      total += v;
    }
    density[i] = total / 6;
  }
  for (let r = 0; r < 6; r++) {
    let max = 0;
    for (let i = 0; i < CHARSET.length; i++) max = Math.max(max, vectors[i * 6 + r]);
    if (max > 0) for (let i = 0; i < CHARSET.length; i++) vectors[i * 6 + r] /= max;
  }
  shapeCache = { key: fontFamily, vectors, density };
  return shapeCache;
}

function nearestChar(sample: Float32Array, table: ShapeTable) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < CHARSET.length; i++) {
    let dist = 0;
    for (let r = 0; r < 6; r++) {
      const d = sample[r] - table.vectors[i * 6 + r];
      dist += d * d;
    }
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function parseRgb(color: string): [number, number, number] {
  const match = color.match(/[\d.]+/g);
  if (!match || match.length < 3) return [255, 255, 255];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

export type StrokeAsciiTitleProps = {
  text: string;
  color: string;
  /** Start the draw-on; before this the outline is hidden. onDrawn fires
      once the outline is mostly drawn (DRAWN_AT), not at its very end. */
  start: boolean;
  /** Hover turns it to ASCII; off for touch and reduced motion. */
  interactive?: boolean;
  reducedMotion?: boolean;
  strokeWidth?: number;
  onDrawn?: () => void;
  className?: string;
};

export function StrokeAsciiTitle({
  text,
  color,
  start,
  interactive = true,
  reducedMotion = false,
  strokeWidth = 2.2,
  onDrawn,
  className = "",
}: StrokeAsciiTitleProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const outlineRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDrawnRef = useRef(onDrawn);
  useEffect(() => {
    onDrawnRef.current = onDrawn;
  }, [onDrawn]);

  const chars = useMemo(() => Array.from(text), [text]);
  const maskId = `stroke-ascii-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [box, setBox] = useState<Box | null>(null);
  // One dash longer than any glyph's whole outline. WebKit dashes a glyph's
  // contours as one continuous run (Skia restarts per contour), so a W came
  // out ~1000 units long there and a shorter dash left its end in the gap:
  // Safari drew "Work" with half a W.
  const dash = FONT_UNITS * DASH_GLYPHS;

  // Measure once the display face has loaded, so the viewBox hugs the glyphs.
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const node = textRef.current;
      if (cancelled || !node) return;
      const bbox = node.getBBox();
      if (!bbox.width) return;
      const pad = strokeWidth * 2;
      setBox({ x: bbox.x - pad, y: bbox.y - pad, width: bbox.width + pad * 2, height: bbox.height + pad * 2 });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [text, strokeWidth]);

  // Draw-on.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !box) return;
    const strokes = Array.from(root.querySelectorAll<SVGTSpanElement>("[data-stroke-char]"));
    gsap.killTweensOf(strokes);
    if (reducedMotion) {
      gsap.set(strokes, { strokeDasharray: "none", strokeDashoffset: 0 });
      if (start) onDrawnRef.current?.();
      return;
    }
    gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash });
    if (!start) return;
    let reported = false;
    const tween = gsap.to(strokes, {
      strokeDashoffset: 0,
      duration: DRAW_DURATION,
      // A pen's steady speed: with a dash this long, an easing that starts
      // fast would finish ordinary glyphs in the first few frames.
      ease: "none",
      stagger: DRAW_STAGGER,
      onUpdate() {
        if (!reported && this.progress() >= DRAWN_AT) {
          reported = true;
          onDrawnRef.current?.();
        }
      },
      onComplete: () => {
        // At rest the outline is whole in every engine, dash or no dash.
        gsap.set(strokes, { strokeDasharray: "none" });
        if (!reported) onDrawnRef.current?.();
      },
    });
    return () => {
      tween.kill();
    };
  }, [box, start, reducedMotion, dash]);

  // Hover: a lens follows the pointer; only cells inside it decode to ASCII,
  // the rest of the title keeps its outline.
  useEffect(() => {
    const root = rootRef.current;
    const outline = outlineRef.current;
    const svgText = textRef.current;
    const canvas = canvasRef.current;
    if (!root || !outline || !svgText || !canvas || !box || !interactive || reducedMotion || !start) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let grid: Grid | null = null;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let monoFamily = "monospace";

    // Per cell: whether it shows ASCII, where it's heading, and its decode window.
    let shown = new Uint8Array(0);
    let wants = new Uint8Array(0);
    let startAt = new Float64Array(0);
    let endAt = new Float64Array(0);
    let flickAt = new Float64Array(0);
    let flickChar = new Uint8Array(0);

    // The lens: pointer target, its eased position, and its eased radius.
    let targetX = 0;
    let targetY = 0;
    let lensX = 0;
    let lensY = 0;
    let radius = 0;
    let hovered = false;
    let lastShimmer = 0;
    let lastFrame = 0;
    let raf: number | null = null;
    let hot = "#fff";
    let cool = "#fff";

    const lensRadius = () => height * LENS_RADIUS;

    const build = () => {
      width = root.clientWidth;
      height = root.clientHeight;
      if (!width || !height) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      monoFamily = getComputedStyle(canvas).fontFamily || "monospace";
      const table = shapeTable(monoFamily);
      const cellH = Math.min(MAX_CELL_H, Math.max(MIN_CELL_H, height / ROWS_TARGET));
      const probe = canvas.getContext("2d")!;
      probe.font = `${cellH}px ${monoFamily}`;
      const cellW = probe.measureText("M").width || cellH * 0.6;
      const cols = Math.max(1, Math.floor(width / cellW));
      const rows = Math.max(1, Math.floor(height / cellH));

      // Rasterize the real glyphs at the same scale the SVG renders them.
      const scale = height / box.height;
      const rw = Math.ceil(width * SUPERSAMPLE);
      const rh = Math.ceil(height * SUPERSAMPLE);
      const raster = document.createElement("canvas");
      raster.width = rw;
      raster.height = rh;
      const rctx = raster.getContext("2d", { willReadFrequently: true });
      if (!rctx) return false;
      const textStyle = getComputedStyle(svgText);
      const s = scale * SUPERSAMPLE;
      rctx.font = `${textStyle.fontWeight} ${FONT_UNITS * s}px ${textStyle.fontFamily}`;
      (rctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${LETTER_SPACING * s}px`;
      rctx.fillStyle = "#fff";
      rctx.textBaseline = "alphabetic";
      rctx.fillText(text, -box.x * s, -box.y * s);
      const pixels = rctx.getImageData(0, 0, rw, rh).data;

      // Center the grid so the leftover sliver splits evenly.
      const offX = (width - cols * cellW) / 2;
      const offY = (height - rows * cellH) / 2;
      const target = new Uint8Array(cols * rows);
      const edge = new Uint8Array(cols * rows);
      const sample = new Float32Array(6);
      const memo = new Map<string, number>();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x0 = (offX + c * cellW) * SUPERSAMPLE;
          const y0 = (offY + r * cellH) * SUPERSAMPLE;
          const w = cellW * SUPERSAMPLE;
          const h = cellH * SUPERSAMPLE;
          let peak = 0;
          for (let region = 0; region < 6; region++) {
            const rx0 = Math.floor(x0 + (region % 2) * (w / 2));
            const ry0 = Math.floor(y0 + Math.floor(region / 2) * (h / 3));
            const rx1 = Math.min(rw, Math.floor(rx0 + w / 2));
            const ry1 = Math.min(rh, Math.floor(ry0 + h / 3));
            let sum = 0;
            let count = 0;
            for (let y = Math.max(0, ry0); y < ry1; y++) {
              for (let x = Math.max(0, rx0); x < rx1; x++) {
                sum += pixels[(y * rw + x) * 4 + 3];
                count++;
              }
            }
            sample[region] = count ? sum / count / 255 : 0;
            peak = Math.max(peak, sample[region]);
          }
          if (peak < 0.08) continue;
          // Contrast: push weak sub-regions down relative to the strongest,
          // so a cell half-covered by a stem reads as an edge, not a smear.
          for (let region = 0; region < 6; region++) {
            sample[region] = Math.pow(sample[region] / peak, SHAPE_CONTRAST) * peak;
          }
          const key = Array.from(sample, (v) => Math.round(v * 12)).join("");
          let index = memo.get(key);
          if (index === undefined) {
            index = nearestChar(sample, table);
            memo.set(key, index);
          }
          target[r * cols + c] = index;
          if (peak < 0.9 || sample.some((v) => v < peak * 0.75)) edge[r * cols + c] = 1;
        }
      }
      // Any inked cell touching an empty one is contour too.
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          if (!target[i] || edge[i]) continue;
          if (
            c === 0 || c === cols - 1 || r === 0 || r === rows - 1 ||
            !target[i - 1] || !target[i + 1] || !target[i - cols] || !target[i + cols]
          ) {
            edge[i] = 1;
          }
        }
      }

      const byDensity = Array.from(CHARSET, (_, i) => i)
        .filter((i) => i !== 0)
        .sort((a, b) => table.density[a] - table.density[b]);
      const rankOf: number[] = [];
      byDensity.forEach((charIndex, rank) => {
        rankOf[charIndex] = rank;
      });

      grid = { cols, rows, cellW, cellH, fontPx: cellH, target, edge, byDensity, rankOf };
      const cells = cols * rows;
      shown = new Uint8Array(cells);
      wants = new Uint8Array(cells);
      startAt = new Float64Array(cells);
      endAt = new Float64Array(cells);
      flickAt = new Float64Array(cells);
      flickChar = new Uint8Array(cells);

      const ink = parseRgb(getComputedStyle(root).color);
      const mix = (v: number) => Math.round(v + (255 - v) * HOT_MIX);
      hot = `rgb(${mix(ink[0])} ${mix(ink[1])} ${mix(ink[2])})`;
      cool = `rgb(${ink[0]} ${ink[1]} ${ink[2]})`;
      return true;
    };

    // A glyph of similar weight to the target, so scrambling cells shimmer
    // inside the letterform instead of flashing as solid blocks.
    const scrambleChar = (g: Grid, targetChar: number) => {
      const rank = g.rankOf[targetChar] ?? g.byDensity.length / 2;
      const spread = 14;
      const pick = Math.round(rank + (Math.random() * 2 - 1) * spread);
      return g.byDensity[Math.max(0, Math.min(g.byDensity.length - 1, pick))];
    };

    // The outline gives way under the lens, with a soft rim. The mask goes
    // on the outline's wrapper, not on the <svg>: the <svg> is a layer of its
    // own (see the CSS), so a moving lens never redraws its glow.
    const setOutlineMask = () => {
      if (radius < 0.5) {
        outline.style.maskImage = "";
        outline.style.webkitMaskImage = "";
        return;
      }
      const inner = Math.max(0, radius - LENS_SOFT_PX);
      const mask = `radial-gradient(circle at ${lensX.toFixed(1)}px ${lensY.toFixed(1)}px, transparent ${inner.toFixed(1)}px, black ${(radius + LENS_SOFT_PX).toFixed(1)}px)`;
      outline.style.maskImage = mask;
      outline.style.webkitMaskImage = mask;
    };

    const paint = (now: number) => {
      raf = null;
      const g = grid;
      if (!g) return;
      const dt = lastFrame ? Math.min(64, now - lastFrame) : 16;
      lastFrame = now;
      let busy = false;

      // Ease the lens toward the pointer, and grow or shrink it.
      const follow = 1 - Math.exp(-dt / LENS_FOLLOW_MS);
      lensX += (targetX - lensX) * follow;
      lensY += (targetY - lensY) * follow;
      const goalRadius = hovered ? lensRadius() : 0;
      radius += (goalRadius - radius) * (1 - Math.exp(-dt / LENS_GROW_MS));
      if (Math.abs(goalRadius - radius) < 0.3) radius = goalRadius;
      else busy = true;
      if (Math.abs(targetX - lensX) > 0.3 || Math.abs(targetY - lensY) > 0.3) busy = true;

      // Idle shimmer: a couple of settled cells under the lens re-decode.
      if (hovered && now - lastShimmer > SHIMMER_EVERY_MS) {
        lastShimmer = now;
        // Random probes; most land outside the lens, so try a few extra.
        let picked = 0;
        for (let tries = 0; tries < 40 && picked < SHIMMER_CELLS; tries++) {
          const i = (Math.random() * g.target.length) | 0;
          if (g.target[i] && shown[i] && wants[i] && now >= endAt[i]) {
            startAt[i] = now;
            endAt[i] = now + SCRAMBLE_MIN_MS + Math.random() * 120;
            picked++;
          }
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${g.fontPx}px ${monoFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const offX = (width - g.cols * g.cellW) / 2;
      const offY = (height - g.rows * g.cellH) / 2;
      const r2 = radius * radius;

      for (let r = 0; r < g.rows; r++) {
        const y = offY + (r + 0.5) * g.cellH;
        const dy = y - lensY;
        for (let c = 0; c < g.cols; c++) {
          const i = r * g.cols + c;
          const targetChar = g.target[i];
          if (!targetChar) continue;
          const x = offX + (c + 0.5) * g.cellW;
          const dx = x - lensX;

          // Crossing the lens rim schedules a decode (in) or dissolve (out).
          const want = radius > 0.5 && dx * dx + dy * dy < r2 ? 1 : 0;
          if (want !== wants[i]) {
            wants[i] = want;
            startAt[i] = now + Math.random() * JITTER_MS;
            endAt[i] = startAt[i] + SCRAMBLE_MIN_MS + Math.random() * (SCRAMBLE_MAX_MS - SCRAMBLE_MIN_MS);
            flickAt[i] = 0;
          }

          if (now >= startAt[i] && now < endAt[i]) {
            busy = true;
            if (now >= flickAt[i]) {
              flickChar[i] = scrambleChar(g, targetChar);
              flickAt[i] = now + FLICK_MIN_MS + Math.random() * (FLICK_MAX_MS - FLICK_MIN_MS);
            }
            const p = (now - startAt[i]) / (endAt[i] - startAt[i]);
            // Decoding in: brightens fast. Dissolving out: thins away.
            ctx.globalAlpha = wants[i] ? 0.35 + 0.65 * Math.min(1, p * 2.5) : 1 - p * p;
            ctx.fillStyle = hot;
            ctx.fillText(CHARSET[flickChar[i]], x, y);
            continue;
          }
          if (endAt[i] > 0 && now >= endAt[i]) {
            shown[i] = wants[i];
            startAt[i] = 0;
            endAt[i] = 0;
          } else if (now < startAt[i]) {
            busy = true;
          }
          if (shown[i]) {
            ctx.globalAlpha = g.edge[i] ? 1 : CORE_ALPHA;
            ctx.fillStyle = cool;
            ctx.fillText(CHARSET[targetChar], x, y);
          }
        }
      }
      ctx.globalAlpha = 1;
      setOutlineMask();

      if (busy || hovered) raf = requestAnimationFrame(paint);
    };

    const run = () => {
      if (raf === null) {
        lastFrame = 0;
        raf = requestAnimationFrame(paint);
      }
    };

    const aim = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
    };
    const onEnter = (event: PointerEvent) => {
      if (!grid && !build()) return;
      aim(event);
      // Start the lens where the pointer is, not sliding in from the last exit.
      if (radius < 0.5) {
        lensX = targetX;
        lensY = targetY;
      }
      hovered = true;
      run();
    };
    const onMove = (event: PointerEvent) => {
      if (!hovered) return;
      aim(event);
      run();
    };
    const onLeave = (event: PointerEvent) => {
      aim(event);
      hovered = false;
      run();
    };

    const observer = new ResizeObserver(() => {
      if (!grid) return;
      if (root.clientWidth === width && root.clientHeight === height) return;
      grid = null;
      if (build()) run();
    });
    observer.observe(root);

    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      observer.disconnect();
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      outline.style.maskImage = "";
      outline.style.webkitMaskImage = "";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [box, text, interactive, reducedMotion, start]);

  return (
    <span
      ref={rootRef}
      className={`stroke-ascii-title ${className}`.trim()}
      style={{ color, aspectRatio: box ? `${box.width} / ${box.height}` : undefined }}
      aria-hidden="true"
    >
      <span ref={outlineRef} className="stroke-ascii-title__outline">
        <svg
          className="stroke-ascii-title__svg"
          viewBox={box ? `${box.x} ${box.y} ${box.width} ${box.height}` : `0 ${-FONT_UNITS} 600 ${FONT_UNITS * 1.3}`}
          preserveAspectRatio="xMinYMid meet"
        >
          {/* The face builds some glyphs from overlapping contours (the bar of
              a "t" over its stem) and tight tracking makes letters touch, so a
              plain stroke draws their seams. Stroke at twice the width and mask
              out the filled letters: only the outer edge of the union remains. */}
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="-10000" y="-10000" width="20000" height="20000">
              <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
              {/* Same per-glyph tspans as the stroke below, not one run of
                  text: WebKit drops kerning across tspan boundaries, so a
                  plain string here kerns differently (Wo, St) and the mask
                  slides off the outline, cutting it apart on Safari. */}
              <text
                x="0"
                y="0"
                fill="black"
                className="stroke-ascii-title__text"
                style={{ fontSize: FONT_UNITS, letterSpacing: LETTER_SPACING }}
              >
                {chars.map((char, index) => (
                  <tspan key={index}>{char}</tspan>
                ))}
              </text>
            </mask>
          </defs>
          <text
            ref={textRef}
            x="0"
            y="0"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth * 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            mask={`url(#${maskId})`}
            className="stroke-ascii-title__text"
            style={{ fontSize: FONT_UNITS, letterSpacing: LETTER_SPACING }}
          >
            {chars.map((char, index) => (
              <tspan key={index} data-stroke-char="">
                {char}
              </tspan>
            ))}
          </text>
        </svg>
      </span>
      <canvas ref={canvasRef} className="stroke-ascii-title__ascii" />
    </span>
  );
}
