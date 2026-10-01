/**
 * The footer splash's goo filter (hero-footer.tsx), on a 2D canvas: the same
 * shapes blurred, their alpha thresholded so neighbors merge into one fluid,
 * and the crisp shapes drawn back on top. For WebKit, which runs the SVG
 * filter on the CPU over the whole splash and drops to a few frames a second.
 *
 * The shapes stay the SVG's own <rect>s and <circle>s: GSAP keeps tweening
 * their attributes, and each frame is painted from them. The blur runs in
 * JS on a half-size field, because reading a canvas back (the other way to
 * threshold a blur) waits on the GPU process, which is busy with the hero.
 */

// The SVG filter's feGaussianBlur stdDeviation, in CSS px.
const SIGMA = 8;
// Its feColorMatrix on alpha: a * 20 - 8.
const ALPHA_GAIN = 20;
const ALPHA_CUT = 8;
// Field pixels per CSS pixel. The field only has to carry a blur.
const FIELD = 0.5;
// Two box blurs of these widths (field px) come close to a Gaussian of
// SIGMA * FIELD.
const BOXES = [9, 11];
// How far a shape's blur reaches past its edge, in field px.
const REACH = Math.ceil(SIGMA * FIELD * 3) + 1;
// How much of a base shape's top takes part in the goo, in CSS px.
const BASE_STRIP = SIGMA * 4;

export type GooShape = {
  el: SVGElement;
  color: string;
  /**
   * A large shape the others land on (the pool). Only its top edge joins
   * the goo; the rest is painted plain, which spares blurring its whole area.
   */
  base?: boolean;
};

type Box = { left: number; top: number; right: number; bottom: number; r: number };
type Region = { x0: number; y0: number; x1: number; y1: number };
type Drawn = { box: Box; rgb: [number, number, number]; color: string; base: boolean };

type Goo = {
  ctx: CanvasRenderingContext2D;
  /** Canvas pixels per CSS pixel. */
  ratio: number;
  field: HTMLCanvasElement;
  fieldCtx: CanvasRenderingContext2D;
  image: ImageData;
  alpha: Float32Array;
  scratch: Float32Array;
  weight: Float32Array;
  red: Float32Array;
  green: Float32Array;
  blue: Float32Array;
  colors: Map<string, [number, number, number]>;
};

const num = (el: Element, name: string) => parseFloat(el.getAttribute(name) ?? "") || 0;

// The shape's box and corner radius, in CSS px; null when it has no area.
function boxOf(el: SVGElement): Box | null {
  if (el.tagName === "circle") {
    const r = num(el, "r");
    if (r <= 0) return null;
    const cx = num(el, "cx");
    const cy = num(el, "cy");
    return { left: cx - r, top: cy - r, right: cx + r, bottom: cy + r, r };
  }
  const width = num(el, "width");
  const height = num(el, "height");
  if (width <= 0 || height <= 0) return null;
  const x = num(el, "x");
  const y = num(el, "y");
  return { left: x, top: y, right: x + width, bottom: y + height, r: Math.min(num(el, "rx"), width / 2, height / 2) };
}

function fillShape(ctx: CanvasRenderingContext2D, { box, color }: Drawn) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(box.left + box.r, box.top);
  ctx.arcTo(box.right, box.top, box.right, box.bottom, box.r);
  ctx.arcTo(box.right, box.bottom, box.left, box.bottom, box.r);
  ctx.arcTo(box.left, box.bottom, box.left, box.top, box.r);
  ctx.arcTo(box.left, box.top, box.right, box.top, box.r);
  ctx.closePath();
  ctx.fill();
}

// Any CSS color as 0..255 channels, through the canvas's own parser.
function channels(goo: Goo, color: string): [number, number, number] {
  let rgb = goo.colors.get(color);
  if (!rgb) {
    goo.fieldCtx.fillStyle = "#000";
    goo.fieldCtx.fillStyle = color;
    const hex = goo.fieldCtx.fillStyle;
    rgb = /^#[0-9a-f]{6}$/i.test(hex)
      ? [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
      : [0, 0, 0];
    goo.colors.set(color, rgb);
  }
  return rgb;
}

/** Sizes the canvas for the viewport and sets up the blur's buffers. */
export function createGoo(canvas: HTMLCanvasElement): Goo | null {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  const field = document.createElement("canvas");
  field.width = Math.ceil(window.innerWidth * FIELD);
  field.height = Math.ceil(window.innerHeight * FIELD);
  const ctx = canvas.getContext("2d");
  const fieldCtx = field.getContext("2d");
  if (!ctx || !fieldCtx) return null;
  const size = field.width * field.height;
  return {
    ctx,
    ratio,
    field,
    fieldCtx,
    image: fieldCtx.createImageData(field.width, field.height),
    alpha: new Float32Array(size),
    scratch: new Float32Array(size),
    weight: new Float32Array(size),
    red: new Float32Array(size),
    green: new Float32Array(size),
    blue: new Float32Array(size),
    colors: new Map(),
  };
}

// A CSS-px box as the field region its blur can reach, or null off the field.
function regionOf(goo: Goo, left: number, top: number, right: number, bottom: number): Region | null {
  const region = {
    x0: Math.max(0, Math.floor(left * FIELD) - REACH),
    y0: Math.max(0, Math.floor(top * FIELD) - REACH),
    x1: Math.min(goo.field.width, Math.ceil(right * FIELD) + REACH),
    y1: Math.min(goo.field.height, Math.ceil(bottom * FIELD) + REACH),
  };
  return region.x1 > region.x0 && region.y1 > region.y0 ? region : null;
}

/*
 * The per-pixel loops below read no globals (Math's functions are taken as
 * locals, abs/min/max written out): a dev build runs modules inside eval,
 * where JavaScriptCore looks each global up by name, and that alone made
 * them a hundred times slower.
 */

// Adds one shape to the field: its coverage, and near its edge its color,
// weighted by how close each pixel is to it.
function stamp(goo: Goo, { box, rgb }: Drawn, { x0, y0, x1, y1 }: Region) {
  const { alpha, weight, red, green, blue } = goo;
  const { sqrt, exp } = Math;
  const width = goo.field.width;
  const sigma = SIGMA * FIELD;
  const falloff = 1 / (2 * sigma * sigma);
  const cx = ((box.left + box.right) / 2) * FIELD;
  const cy = ((box.top + box.bottom) / 2) * FIELD;
  const hw = ((box.right - box.left) / 2) * FIELD;
  const hh = ((box.bottom - box.top) / 2) * FIELD;
  const r = box.r * FIELD;
  const left = Math.max(x0, Math.floor(cx - hw) - REACH);
  const right = Math.min(x1, Math.ceil(cx + hw) + REACH);
  const top = Math.max(y0, Math.floor(cy - hh) - REACH);
  const bottom = Math.min(y1, Math.ceil(cy + hh) + REACH);
  const [cr, cg, cb] = rgb;
  for (let y = top; y < bottom; y++) {
    const dy = y + 0.5 - cy;
    const qy = (dy < 0 ? -dy : dy) - hh + r;
    const oy = qy > 0 ? qy : 0;
    const row = y * width;
    for (let x = left; x < right; x++) {
      // Signed distance to the rounded box: negative inside.
      const dx = x + 0.5 - cx;
      const qx = (dx < 0 ? -dx : dx) - hw + r;
      const ox = qx > 0 ? qx : 0;
      const inner = qx > qy ? qx : qy;
      const d = (ox > 0 && oy > 0 ? sqrt(ox * ox + oy * oy) : ox + oy) + (inner < 0 ? inner : 0) - r;
      const i = row + x;
      if (d < 0.5) alpha[i] += d < -0.5 ? 1 : 0.5 - d;
      // Deep inside, the crisp shape covers the goo: its color isn't needed.
      if (d < -1.5) continue;
      const w = d <= 0 ? 1 : exp(-d * d * falloff);
      weight[i] += w;
      red[i] += w * cr;
      green[i] += w * cg;
      blue[i] += w * cb;
    }
  }
}

// One box blur along rows (step 1) or columns (step = width), src → dst.
function boxBlur(
  src: Float32Array,
  dst: Float32Array,
  lines: number,
  length: number,
  first: number,
  lineStep: number,
  step: number,
  size: number
) {
  const half = (size - 1) / 2;
  const scale = 1 / size;
  for (let line = 0; line < lines; line++) {
    const start = first + line * lineStep;
    let sum = 0;
    for (let i = 0; i <= half && i < length; i++) sum += src[start + i * step];
    for (let i = 0; i < length; i++) {
      dst[start + i * step] = sum * scale;
      const enter = i + half + 1;
      const leave = i - half;
      if (enter < length) sum += src[start + enter * step];
      if (leave >= 0) sum -= src[start + leave * step];
    }
  }
}

// Thresholds the blurred coverage into the goo, in the color of whatever is
// nearest, as RGBA.
function resolve(goo: Goo, { x0, y0, x1, y1 }: Region) {
  const { alpha, weight, red, green, blue } = goo;
  const data = goo.image.data;
  const width = goo.field.width;
  for (let y = y0; y < y1; y++) {
    const row = y * width;
    for (let x = x0; x < x1; x++) {
      const i = row + x;
      const o = i * 4;
      const a = alpha[i] * ALPHA_GAIN - ALPHA_CUT;
      if (a <= 0) {
        data[o + 3] = 0;
        continue;
      }
      const w = weight[i] > 0 ? 1 / weight[i] : 0;
      data[o] = red[i] * w;
      data[o + 1] = green[i] * w;
      data[o + 2] = blue[i] * w;
      data[o + 3] = a >= 1 ? 255 : a * 255;
    }
  }
}

// Blurs and thresholds everything that reaches one region of the field, and
// draws the result onto the canvas.
function paintRegion(goo: Goo, drawn: Drawn[], region: Region) {
  const { x0, y0, x1, y1 } = region;
  const { ctx, ratio, field, fieldCtx, alpha, scratch } = goo;
  const width = field.width;
  const buffers = [alpha, goo.weight, goo.red, goo.green, goo.blue];
  for (let y = y0; y < y1; y++) {
    for (const buffer of buffers) buffer.fill(0, y * width + x0, y * width + x1);
  }
  for (const shape of drawn) stamp(goo, shape, region);
  // Overlapping shapes can't cover a pixel more than once.
  for (let y = y0; y < y1; y++) {
    const row = y * width;
    for (let x = x0; x < x1; x++) if (alpha[row + x] > 1) alpha[row + x] = 1;
  }
  const first = y0 * width + x0;
  for (const size of BOXES) {
    boxBlur(alpha, scratch, y1 - y0, x1 - x0, first, width, 1, size);
    boxBlur(scratch, alpha, x1 - x0, y1 - y0, first, 1, width, size);
  }
  resolve(goo, region);
  fieldCtx.putImageData(goo.image, 0, 0, x0, y0, x1 - x0, y1 - y0);
  const up = ratio / FIELD;
  ctx.drawImage(field, x0, y0, x1 - x0, y1 - y0, x0 * up, y0 * up, (x1 - x0) * up, (y1 - y0) * up);
}

/** Paints one frame of the splash from the shapes' current attributes. */
export function paintGoo(goo: Goo, shapes: GooShape[]) {
  const { ctx, ratio } = goo;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const drawn: Drawn[] = [];
  for (const shape of shapes) {
    const box = boxOf(shape.el);
    if (box) drawn.push({ box, rgb: channels(goo, shape.color), color: shape.color, base: !!shape.base });
  }
  if (!drawn.length) return;

  // 1. The base shapes, plain.
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  for (const shape of drawn) if (shape.base) fillShape(ctx, shape);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 2. The goo: where the moving shapes are, and along the top of each base
  //    shape. Blurred as one region when those meet, otherwise separately,
  //    so the empty air between falling drops and the pool costs nothing.
  const movers = drawn.filter((shape) => !shape.base);
  const regions: Region[] = [];
  if (movers.length) {
    const region = regionOf(
      goo,
      Math.min(...movers.map((s) => s.box.left)),
      Math.min(...movers.map((s) => s.box.top)),
      Math.max(...movers.map((s) => s.box.right)),
      Math.max(...movers.map((s) => s.box.bottom))
    );
    if (region) regions.push(region);
  }
  for (const { box, base } of drawn) {
    if (!base) continue;
    const strip = regionOf(goo, box.left, box.top, box.right, Math.min(box.bottom, box.top + BASE_STRIP));
    if (!strip) continue;
    const near = regions.find((r) => strip.x0 < r.x1 && strip.x1 > r.x0 && strip.y0 < r.y1 && strip.y1 > r.y0);
    if (near) {
      near.x0 = Math.min(near.x0, strip.x0);
      near.y0 = Math.min(near.y0, strip.y0);
      near.x1 = Math.max(near.x1, strip.x1);
      near.y1 = Math.max(near.y1, strip.y1);
    } else {
      regions.push(strip);
    }
  }
  ctx.imageSmoothingEnabled = true;
  for (const region of regions) paintRegion(goo, drawn, region);

  // 3. The shapes themselves, crisp, wherever there is goo (or a base).
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.globalCompositeOperation = "source-atop";
  for (const shape of drawn) fillShape(ctx, shape);
  ctx.globalCompositeOperation = "source-over";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
