/**
 * Qull, the mascot: an organic ink drop with a leaning tip, and its spark
 * companion. The pose comes in layers so each place can draw what it
 * needs: the hero draws body, face, accents and spark; open sections also
 * draw the limbs.
 *
 * Everything is in a 108-unit square viewBox. The body stands on y = 95;
 * the feet reach the bottom of the box. Coordinates come in two frames:
 * "local" (the figure as designed, before posture) and "world" (the box,
 * after posture, hops and movement).
 */

export const QULL_VIEWBOX = "-4 -8 108 108";
export const QULL_VIEWBOX_ORIGIN = { x: -4, y: -8 } as const;
export const QULL_VIEWBOX_SIZE = 108;
/** Where the body stands, in viewBox units: what a placement anchors. */
export const QULL_BASE = { x: 50, y: 95 } as const;

/** The spark: a lopsided four-point star in a 100-unit box, placed by `pose.spark`. */
export const QULL_SPARK_PATH = "M52 0C55 33 67 45 100 52C66 55 55 67 47 100C45 66 33 55 0 48C34 44 46 33 52 0Z";

type Point = readonly [number, number];
type Spot = { x: number; y: number };

const BASE_Y = QULL_BASE.y;
const BASE_X = QULL_BASE.x;
// Hand-placed and uneven on purpose: the irregularity is the drawn look.
// Stretched 8% up from the base.
const BODY: Point[] = (
  [
    [57, 12],
    [65, 25],
    [75, 41],
    [80, 60],
    [79, 79],
    [69, 91],
    [50, 95],
    [31, 92],
    [21, 80],
    [20, 62],
    [26, 45],
    [38, 32],
    [48, 23],
  ] as const
).map(([x, y]) => [x, BASE_Y - (BASE_Y - y) * 1.08] as const);
// Handle length per point; the tip's short handles keep it pointed.
const SHARPNESS = [0.35, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9];
const HEIGHT = BASE_Y - BODY[0][1];
const CENTER = { x: 50, y: 58 };
// Angle of each point around the center, for the smooth wobble modes.
const BODY_ANGLES = BODY.map(([x, y]) => Math.atan2(y - CENTER.y, x - CENTER.x));
// Slightly different sizes and heights, like a hand-drawn face.
const EYES = [
  { x: 41, y: 61, rx: 4.2, ry: 6.6 },
  { x: 59, y: 60.3, rx: 3.7, ry: 6 },
];
const FACE = { x: 50, y: 60 };
// Its little dot nose.
const NOSE = { x: 50.5, y: 69.5, rx: 1.8, ry: 1.35 };
// Turning (yaw): the outline morphs toward this profile (facing right, from
// the turnaround sheet), and features ride a cylinder around the body's
// axis, each at its own depth, so they slide across, foreshorten, and hide
// round the back.
const PROFILE: Point[] = [
  [52, 6],
  [60, 20],
  [70, 38],
  [76, 58],
  [76, 78],
  [67, 91],
  [50, 95],
  [33, 92],
  [24, 80],
  [23, 62],
  [28, 44],
  [38, 28],
  [46, 16],
];
const DEPTH = { eyes: 18, nose: 20, shoulders: 25, feet: 16 };
// Turning is quick, so it's never caught between front and profile for long.
const TURN_RATE = 18;
// Between something the user set off and something it does on its own.
const QUIET_S = 3;
// Nose by mood: lifted and wider when it smiles, smaller when surprised.
const NOSE_MOOD: Partial<Record<string, { dy: number; scale: number }>> = {
  happy: { dy: -1.4, scale: 1.2 },
  surprised: { dy: 0.4, scale: 0.75 },
  sad: { dy: 0.8, scale: 0.9 },
  angry: { dy: -0.6, scale: 1.15 },
  asleep: { dy: 0.4, scale: 0.9 },
};
// Emotion lines fan out around this point.
const HEAD = { x: 50, y: 55 };
// Spark spots and look targets are given relative to this point and follow
// it (without turning) wherever the posture puts the head.
const HEAD_ANCHOR = { x: 50, y: 30 };
// Where ?, ! and z pop out: to its right, away from the spark on its left.
const EMIT: Record<"question" | "bang" | "z", Spot> = {
  question: { x: 88, y: 18 },
  bang: { x: 86, y: 12 },
  z: { x: 82, y: 16 },
};

// Level-2 limbs: short chunky arms hung from the shoulders, boot feet.
const SHOULDERS = [
  { x: 25, y: 62, arm: { x: -8, y: 10 } },
  { x: 75, y: 62, arm: { x: 8, y: 10 } },
];
// Shoulders ride up when the arms reach overhead (hanging on the spark).
const RAISED_SHOULDER_Y = 42;
const ARM = { rx: 8.3, ry: 11.5 };
const FEET = [
  { x: 39, y: 92.5 },
  { x: 61, y: 92.5 },
];
const FOOT = { width: 19, height: 13.5 };

// Hanging: from the spark, held overhead; the body swings under it.
const HANG_STAR = { x: 50, y: -12 };
const HANG_STAR_SCALE = 1.4;

// How far the eyes travel from rest, and where they start to squash
// against the edge of the face (fraction of travel).
const TRAVEL_X = 7;
const TRAVEL_Y = 5;
const SQUASH_FROM = 0.6;
// Distance (viewBox units) at which the gaze reaches ~76% of its travel.
const GAZE_REACH = 120;
// Without pointer movement for this long, Qull looks at its spark instead.
const IDLE_S = 2.2;
// With nothing happening for this long, it dozes off.
const SLEEP_S = 8;
// The pointer near its face makes it perk up.
const INTEREST_RADIUS = 90;
// Resting the pointer on it this long makes it glad.
const PET_S = 1.2;
// A pointer this fast (units per second) nearby startles it.
const WHOA_SPEED = 1600;

const SPARK_RADIUS = 9;
const ORBIT_CENTER = { x: 50, y: 50 };
const ORBIT_RADIUS = 54;

export type QullMode = "stand" | "hang";

export type QullMood =
  | "rest"
  | "curious"
  | "happy"
  | "idea"
  | "bold"
  | "surprised"
  | "sad"
  | "bored"
  | "unimpressed"
  | "flat"
  | "crossed"
  | "asleep"
  | "angry"
  | "confused";

type SparkSpot = { x: number; y: number; scale: number; spin: number; lean: number };
type Brow = readonly [raise: number, angle: number] | null;
type Expression = {
  eyes: "open" | "happy" | "line" | "closed";
  eyeScale: readonly [number, number];
  /** Fraction of each open eye covered by a flat upper lid. */
  lid: number;
  brows: readonly [Brow, Brow];
  tilt: number;
  /** -1 listless → 0 calm → 1 excited: breathing and sway speed and depth. */
  energy: number;
  /** Arm angles (left, right) in degrees; positive swings the left arm out. */
  arms: readonly [number, number];
  /** Where the spark hovers; "circle" circles the head, "tip" rests on it. */
  spark: SparkSpot | "circle" | "tip";
  /** A fixed gaze target, overriding the pointer. */
  look?: Spot;
};

// The spark keeps to its left (the viewer's left); the ?, ! and z pop
// out on the right, so they never collide.
const REST_SPARK: SparkSpot = { x: 22, y: 7, scale: 1, spin: 0.9, lean: 6 };
const LAZY_SPARK: SparkSpot = { ...REST_SPARK, spin: 0.25, lean: 0 };
const calm = {
  eyes: "open",
  eyeScale: [1, 1],
  lid: 0,
  brows: [null, null],
  tilt: 0,
  energy: 0,
  arms: [10, -10],
  spark: REST_SPARK,
} as const satisfies Expression;

const EXPRESSIONS: Record<QullMood, Expression> = {
  rest: calm,
  // Head tilted, one eye opened wider under a raised brow.
  curious: {
    ...calm,
    eyeScale: [1, 1.25],
    brows: [null, [1.8, -14]],
    tilt: -8,
    energy: 0.2,
    arms: [14, -30],
    spark: { x: 19, y: 10, scale: 1, spin: 0.9, lean: 14 },
  },
  // Smiling eyes; the spark circles its head.
  happy: { ...calm, eyes: "happy", energy: 1, arms: [40, -40], spark: "circle" },
  // Looks up at a spark grown into an idea, one hand raised.
  idea: {
    ...calm,
    eyeScale: [0.95, 0.95],
    brows: [
      [1.6, 8],
      [1.6, -8],
    ],
    energy: 0.3,
    arms: [8, -125],
    spark: { x: 44, y: -10, scale: 1.5, spin: 2, lean: 0 },
    look: { x: 60, y: -40 },
  },
  // Half-lidded under angled brows: sure of itself.
  bold: {
    ...calm,
    lid: 0.38,
    brows: [
      [0, 16],
      [0, -16],
    ],
    tilt: 4,
    energy: 0.4,
    arms: [4, -4],
    spark: { x: 22, y: 5, scale: 1.1, spin: 4, lean: 6 },
  },
  surprised: {
    ...calm,
    eyeScale: [0.72, 0.72],
    brows: [
      [4, -4],
      [4, 4],
    ],
    energy: 0.5,
    arms: [50, -50],
    spark: { x: 28, y: -10, scale: 0.9, spin: 5, lean: 0 },
  },
  // Its spark is gone: brows up in the middle, looking at the floor.
  sad: {
    ...calm,
    eyeScale: [0.9, 0.9],
    brows: [
      [1.2, -18],
      [1.2, 18],
    ],
    tilt: -3,
    energy: -0.5,
    arms: [2, -2],
    look: { x: 46, y: 160 },
  },
  // The wave again: heavy lids, looking away.
  bored: {
    ...calm,
    lid: 0.55,
    brows: [
      [-0.4, 4],
      [-0.4, -4],
    ],
    tilt: 2,
    energy: -0.35,
    arms: [4, -4],
    spark: LAZY_SPARK,
    look: { x: -60, y: 90 },
  },
  // "Seriously?": turns to where the wave comes from, one brow up.
  unimpressed: {
    ...calm,
    lid: 0.45,
    brows: [
      [-0.6, 6],
      [2.8, -4],
    ],
    tilt: 7,
    energy: -0.15,
    arms: [6, -18],
    spark: LAZY_SPARK,
    look: { x: 240, y: 190 },
  },
  // -_-
  flat: { ...calm, eyes: "line", energy: -0.35, arms: [4, -4], spark: LAZY_SPARK },
  // Cross-eyed at the spark sitting on its tip.
  crossed: {
    ...calm,
    eyeScale: [1.08, 1.08],
    brows: [
      [1.4, 10],
      [1.4, -10],
    ],
    energy: 0.3,
    arms: [22, -22],
  },
  // Dozing, its spark resting on its tip.
  asleep: { ...calm, eyes: "closed", tilt: -4, energy: -0.7, arms: [3, -3], spark: "tip" },
  // Bonked: brows down to the middle, eyes narrowed, fists out.
  angry: {
    ...calm,
    eyeScale: [0.88, 0.88],
    lid: 0.3,
    brows: [
      [-0.8, 26],
      [-0.8, -26],
    ],
    energy: 0.6,
    arms: [32, -32],
    spark: { x: 14, y: 16, scale: 0.9, spin: 0.4, lean: 0 },
  },
  // One brow up, one down, head cocked.
  confused: {
    ...calm,
    eyeScale: [0.92, 1.18],
    brows: [
      [-0.6, 14],
      [2.8, -10],
    ],
    tilt: 10,
    energy: 0.1,
    arms: [12, -40],
  },
};

type Hop = { start: number; duration: number; height: number };

// Clicks play one of these acts; which ones depends on the posture. On the
// ground, "leave" and "return" are a pair: the spark flies off the screen,
// and the next click brings it back. Hanging from the spark it can't let
// go, so there "tug" plays that part: the spark tries to fly off with it.
// The special act unlocks once each playful act of the set has played (in
// any order) and stays unlocked, weighing more than each of them. Until
// then, unplayed acts weigh more with every click.
type ClickKind = "lap" | "tickle" | "perch" | "leave" | "return" | "swing" | "loop" | "twirl" | "tug";
// Now and then the spark acts on its own: the whims.
type WhimKind = "bonk" | "solo" | "tease" | "spin";
type ActKind = ClickKind | WhimKind;
const ACT_SETS = {
  ground: { playful: ["lap", "tickle", "perch"], special: "leave" },
  hang: { playful: ["swing", "loop", "twirl"], special: "tug" },
} as const satisfies Record<string, { playful: readonly ClickKind[]; special: ClickKind }>;
const SPECIAL_WEIGHT = 2;
const UNPLAYED_WEIGHT_PER_CLICK = 1.5;
const ACT_S: Record<ActKind, number> = {
  lap: 1.4,
  tickle: 1.7,
  perch: 2.6,
  leave: 3.4,
  return: 3.2,
  swing: 2.4,
  loop: 2.2,
  twirl: 1.9,
  tug: 3.4,
  bonk: 1.6,
  solo: 3.4,
  tease: 1.8,
  spin: 2.2,
};
type Act = {
  kind: ActKind;
  start: number;
  duration: number;
  from: Spot;
  path: Spot[];
  cued: boolean;
  whim: boolean;
};
type SparkOverride = {
  x: number;
  y: number;
  follow: number;
  spin: number;
  scale?: number;
  /** Absolute world position rather than relative to the head. */
  world?: boolean;
};
type ActFrame = {
  mood?: QullMood;
  spark?: SparkOverride | "hidden";
  /** Relative to the head (like spark spots), unless `lookWorld`. */
  look?: Spot;
  lookWorld?: boolean;
  cross?: boolean;
  shake?: number;
  arms?: readonly [number, number];
  /** Walking: 0 standing → 1 full stride. */
  stride?: number;
  /** Extra pendulum swing, degrees (hanging). */
  swing?: number;
  /** The spark tugging away from its hold (hanging). */
  pull?: Spot;
  /** Extra movement of the whole figure. */
  drift?: Spot;
  /** Overrides the turn, in degrees (0 front, 90 facing right, 180 back). */
  yaw?: number;
  /** Stands up regardless of posture. */
  upright?: boolean;
};

/**
 * What every Qull on the page shares: it's one character, so the hero and
 * an open section agree on whether its spark is gone, which acts it has
 * shown (and so what's unlocked), and whether it's still glad from a
 * reunion. Times here are wall-clock seconds, since each figure keeps its
 * own animation clock.
 */
const shared = {
  sparkGone: false,
  playedActs: new Set<ClickKind>(),
  clicks: 0,
  lastAct: null as ClickKind | null,
  gladUntil: -Infinity,
};
const wallClock = () => performance.now() / 1000;

// Waves in a row wear out the surprise: three startles, then boredom,
// then "seriously?", then -_- with no hop at all.
const WAVE_STREAK_RESET_S = 5;

// How it arrives in a place: hopping in from the right, dropping in from
// the top, rising from below hanging on to its spark, or drawing itself on
// the spot like a cartoon.
export type QullEntrance = "walk" | "drop" | "fly" | "draw";
const WALK_S = 2;
// A waddle: steps per second at full stride, and how much it bobs, rocks,
// lifts its feet and swings its arms.
const STRIDE = { rate: 11, bob: 2.4, rock: 3.5, lift: 4.5, swing: 12 };
const DROP_S = 0.75;
const FLY_S = 2.1;
const DRAW_S = 1.7;

// Scripted wandering: strolls along a ledge, floating exploration.
type Step =
  | { kind: "move"; to: Spot; style: "walk" | "float" }
  | { kind: "wait"; s: number; mood?: QullMood; ask?: boolean };
type Script = { steps: Step[]; index: number; stepStart: number; from: Spot | null };

type ParticleKind = "tear" | "line" | "question" | "bang" | "z";
type Particle = {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  size: number;
  angle: number;
};
const PARTICLE_LIFE: Record<ParticleKind, number> = { tear: 1.3, line: 0.55, question: 1.6, bang: 0.8, z: 2.2 };
const PARTICLE_SIZE: Record<ParticleKind, number> = { tear: 2, line: 1, question: 2.4, bang: 2.3, z: 1.4 };

const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
// Frame-rate independent easing toward a target; `rate` is per second.
const approach = (from: number, to: number, dt: number, rate: number) => from + (to - from) * (1 - Math.exp(-dt * rate));
const easeInOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
const easeOutBack = (p: number) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
const window01 = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
const chance = (p: number) => Math.random() < p;
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const sign = (n: number) => (n < 0 ? -1 : 1);

function rotateAbout(x: number, y: number, pivot: Spot, deg: number): [number, number] {
  if (deg === 0) return [x, y];
  const a = (deg * Math.PI) / 180;
  const dx = x - pivot.x;
  const dy = y - pivot.y;
  return [pivot.x + dx * Math.cos(a) - dy * Math.sin(a), pivot.y + dx * Math.sin(a) + dy * Math.cos(a)];
}

function hopShape(hop: Hop | undefined, t: number) {
  if (!hop) return { lift: 0, sx: 1, sy: 1 };
  const p = (t - hop.start) / hop.duration;
  if (p < 0 || p >= 1) return { lift: 0, sx: 1, sy: 1 };
  // A hop with no height is a plain landing squash.
  if (hop.height === 0) {
    const squash = Math.sin(Math.PI * p);
    return { lift: 0, sx: 1 + 0.12 * squash, sy: 1 - 0.18 * squash };
  }
  // Anticipation squash, stretched flight, landing squash. Every phase
  // starts and ends at scale 1, so the shape never pops.
  if (p < 0.18) {
    const squash = Math.sin(Math.PI * (p / 0.18));
    return { lift: 0, sx: 1 + 0.08 * squash, sy: 1 - 0.12 * squash };
  }
  if (p < 0.78) {
    const q = (p - 0.18) / 0.6;
    const stretch = Math.abs(Math.sin(2 * Math.PI * q));
    return { lift: hop.height * Math.sin(Math.PI * q), sx: 1 - 0.06 * stretch, sy: 1 + 0.09 * stretch };
  }
  const squash = Math.sin(Math.PI * ((p - 0.78) / 0.22));
  return { lift: 0, sx: 1 + 0.1 * squash, sy: 1 - 0.14 * squash };
}

/**
 * Closed centripetal Catmull-Rom spline as cubic Béziers. Centripetal
 * parameterization never loops or cusps between unevenly spaced points,
 * so the outline stays one clean curve however the body sways.
 */
function smoothClosed(points: Point[]): string {
  const n = points.length;
  const reach = (a: Point, b: Point) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
  let d = `M${r2(points[0][0])} ${r2(points[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const d1 = reach(p0, p1);
    const d2 = reach(p1, p2);
    const d3 = reach(p2, p3);
    const handle = (a: Point, b: Point, c: Point, da: number, db: number, sharp: number) =>
      [0, 1].map((k) => {
        const raw = (da * da * c[k] - db * db * a[k] + (2 * da * da + 3 * da * db + db * db) * b[k]) / (3 * da * (da + db));
        return b[k] + (raw - b[k]) * sharp;
      });
    const c1 = handle(p0, p1, p2, d1, d2, SHARPNESS[i]);
    const c2 = handle(p3, p2, p1, d3, d2, SHARPNESS[(i + 1) % n]);
    d += `C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return `${d}Z`;
}

// Places local shape points around (cx, cy), rotated by `deg`.
function placer(cx: number, cy: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return (x: number, y: number) => `${r2(cx + x * cos - y * sin)} ${r2(cy + x * sin + y * cos)}`;
}

// All closed shapes below wind clockwise, so overlaps union under nonzero.
function ellipse(cx: number, cy: number, rx: number, ry: number, deg = 0) {
  const at = placer(cx, cy, deg);
  const arc = `${r2(rx)} ${r2(ry)} ${r2(deg)} 1 1`;
  return `M${at(-rx, 0)}A${arc} ${at(rx, 0)}A${arc} ${at(-rx, 0)}Z`;
}

// An open eye under a flat upper lid covering `cover` of its height.
function lidded(cx: number, cy: number, rx: number, ry: number, cover: number, deg: number) {
  if (cover < 0.02) return ellipse(cx, cy, rx, ry, deg);
  const at = placer(cx, cy, deg);
  const y0 = -ry + 2 * ry * Math.min(cover, 0.9);
  const x0 = rx * Math.sqrt(Math.max(0, 1 - (y0 * y0) / (ry * ry)));
  const large = y0 < 0 ? 1 : 0;
  return `M${at(-x0, y0)}L${at(x0, y0)}A${r2(rx)} ${r2(ry)} ${r2(deg)} ${large} 1 ${at(-x0, y0)}Z`;
}

// A round-ended band along a circle centered at (ccx, ccy), clockwise from
// angle a0 to a1 (degrees, screen coordinates).
function arcBand(ccx: number, ccy: number, radius: number, a0: number, a1: number, thick: number) {
  const w = thick / 2;
  const on = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${r2(ccx + r * Math.cos(a))} ${r2(ccy + r * Math.sin(a))}`;
  };
  const large = a1 - a0 > 180 ? 1 : 0;
  return (
    `M${on(radius + w, a0)}A${r2(radius + w)} ${r2(radius + w)} 0 ${large} 1 ${on(radius + w, a1)}` +
    `A${r2(w)} ${r2(w)} 0 0 1 ${on(radius - w, a1)}` +
    `A${r2(radius - w)} ${r2(radius - w)} 0 ${large} 0 ${on(radius - w, a0)}` +
    `A${r2(w)} ${r2(w)} 0 0 1 ${on(radius + w, a0)}Z`
  );
}

// A band whose middle sits at (cx, cy), bulging up (∩) at deg = 0: the
// smiling eye and the brows. At deg = 180 it is a closed eye (∪).
function band(cx: number, cy: number, radius: number, spanDeg: number, thick: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const ccx = cx - radius * Math.sin(a);
  const ccy = cy + radius * Math.cos(a);
  return arcBand(ccx, ccy, radius, -90 - spanDeg / 2 + deg, -90 + spanDeg / 2 + deg, thick);
}

// A bar with round ends, `length` between the end centers.
function bar(cx: number, cy: number, length: number, thick: number, deg: number) {
  const at = placer(cx, cy, deg);
  const l = length / 2;
  const w = thick / 2;
  return `M${at(-l, -w)}L${at(l, -w)}A${r2(w)} ${r2(w)} 0 0 1 ${at(l, w)}L${at(-l, w)}A${r2(w)} ${r2(w)} 0 0 1 ${at(-l, -w)}Z`;
}

// An ellipse spanning from `root` to `tip` (a limb), `rx` wide.
function limb(root: Spot, tip: Spot, rx: number) {
  const dx = tip.x - root.x;
  const dy = tip.y - root.y;
  const ry = Math.max(0.5, Math.hypot(dx, dy) / 2);
  const deg = (Math.atan2(-dx, dy) * 180) / Math.PI;
  return ellipse((root.x + tip.x) / 2, (root.y + tip.y) / 2, rx, ry, deg);
}

function particleShape(p: Particle, age: number): string {
  const k = age / p.life;
  // Pops in, holds, shrinks away.
  const pop = k < 0.15 ? easeOutBack(k / 0.15) : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
  const s = p.size * Math.max(0, pop);
  switch (p.kind) {
    case "tear": {
      if (s < 0.05) return "";
      const at = placer(p.x, p.y, 0);
      return (
        `M${at(0, -1.7 * s)}C${at(0.55 * s, -0.85 * s)} ${at(1.05 * s, -0.2 * s)} ${at(1.05 * s, 0.45 * s)}` +
        `A${r2(1.05 * s)} ${r2(1.05 * s)} 0 0 1 ${at(-1.05 * s, 0.45 * s)}` +
        `C${at(-1.05 * s, -0.2 * s)} ${at(-0.55 * s, -0.85 * s)} ${at(0, -1.7 * s)}Z`
      );
    }
    case "line": {
      // Shoots out from the head and retracts outward.
      const length = 7 * Math.sin(Math.PI * k) * p.size;
      if (length < 0.3) return "";
      const a = (p.angle * Math.PI) / 180;
      const reach = 52 + 12 * k;
      return bar(p.x + Math.cos(a) * reach, p.y + Math.sin(a) * reach, length, 2, p.angle);
    }
    case "question":
      if (s < 0.05) return "";
      return (
        arcBand(p.x, p.y - 2.2 * s, 2.2 * s, 195, 415, 1.3 * s) +
        bar(p.x + 0.45 * s, p.y + 0.9 * s, 1.6 * s, 1.3 * s, 105) +
        ellipse(p.x + 0.3 * s, p.y + 3.4 * s, 0.8 * s, 0.8 * s)
      );
    case "bang":
      if (s < 0.05) return "";
      return bar(p.x, p.y - 0.8 * s, 4.4 * s, 1.5 * s, 90) + ellipse(p.x, p.y + 2.8 * s, 0.85 * s, 0.85 * s);
    case "z": {
      if (s < 0.05) return "";
      const h = 1.5 * s;
      return (
        bar(p.x, p.y - h, 2 * h, 0.9 * s, 0) +
        bar(p.x, p.y, 2 * h * Math.SQRT2, 0.9 * s, 135) +
        bar(p.x, p.y + h, 2 * h, 0.9 * s, 0)
      );
    }
  }
}

// Uniform Catmull-Rom through `points`, evaluated at u in [0, 1].
function alongPath(points: Spot[], u: number): Spot {
  const segments = points.length - 1;
  const s = Math.min(segments - 1e-6, Math.max(0, u * segments));
  const i = Math.floor(s);
  const f = s - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(points.length - 1, i + 2)];
  const cr = (a: number, b: number, c: number, e: number) =>
    0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - e) * f * f + (3 * b - a - 3 * c + e) * f * f * f);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) };
}

const sparkTransform = (x: number, y: number, rotation: number, scale: number) =>
  `translate(${r2(x)} ${r2(y)}) rotate(${r2(rotation)}) scale(${r2((SPARK_RADIUS * scale) / 50)}) translate(-50 -50)`;

/**
 * Outside control for screens that move Qull themselves (Stack): where it
 * is (units from home), which way it turns, and what it feels, does with
 * its arms and looks at (world units).
 */
export type QullPuppet = {
  pos: Spot;
  yaw?: number;
  mood?: QullMood;
  arms?: readonly [number, number];
  look?: Spot;
  shake?: number;
  /** Walking: 0 standing → 1 full stride. */
  stride?: number;
  /** In the middle of something: the spark leaves it be. */
  busy?: boolean;
  /** Its hands hold on to these two points (world units), arms stretching. */
  grip?: readonly [Spot, Spot];
};

export type QullPose = {
  /** The body outline. */
  body: string;
  /** Eyes and brows: holes in the body, drawn as filled shapes. */
  face: string;
  /** Tears, emotion lines, ?, ! and z: filled shapes around it. */
  accents: string;
  /** Arms and feet, drawn behind the body (level 2 only). */
  limbs: string;
  /** Limbs that come round in front of the body as it turns (level 2 only). */
  frontLimbs: string;
  /** 0 → 1 while it draws itself in (the "draw" entrance); 1 otherwise. */
  draw: number;
  /** Transform for QULL_SPARK_PATH. */
  spark: string;
};

const restLimbs = () =>
  SHOULDERS.map((s, i) => {
    const deg = i === 0 ? 10 : -10;
    const a = (deg * Math.PI) / 180;
    const ax = s.x + s.arm.x * Math.cos(a) - s.arm.y * Math.sin(a);
    const ay = s.y + s.arm.x * Math.sin(a) + s.arm.y * Math.cos(a);
    return ellipse(ax, ay, ARM.rx, ARM.ry, deg);
  }).join("") + FEET.map((f) => bar(f.x, f.y, FOOT.width - FOOT.height, FOOT.height, 0)).join("");

/** The still figure: server render, reduced motion, and the frame before motion starts. */
export const QULL_REST_POSE: QullPose = {
  body: smoothClosed(BODY),
  face: EYES.map((eye) => ellipse(eye.x, eye.y, eye.rx, eye.ry)).join("") + ellipse(NOSE.x, NOSE.y, NOSE.rx, NOSE.ry),
  accents: "",
  limbs: restLimbs(),
  frontLimbs: "",
  draw: 1,
  spark: sparkTransform(REST_SPARK.x, REST_SPARK.y, 10, 1),
};

/**
 * Qull's life: breathing, a flame-like sway rising up the body, eyes that
 * follow the pointer (squashing at the limits), glance and blink, moods,
 * postures (standing, or hanging from its spark), wandering,
 * hops, click acts, spark whims, a wave streak, dozing off, little accents
 * (tears, emotion lines, ?, !, z) and entrances. Positions are in the
 * figure's viewBox units.
 *
 * Rhythms advance as accumulated phases and every parameter eases toward
 * its target, so changes of mood, posture or speed never jump.
 */
export class QullMotion {
  private time = 0;
  private breathPhase = 0;
  private swayPhase = [0, 0];
  private circlePhase = 0;
  private energy = 0;
  private tilt = 0;
  private lid = 0;
  private cross = 0;
  private interest = 0;
  private eyeScale = [1, 1];
  private eyeVelocity = [0, 0];
  private arms = [10, -10];
  private brows = [
    { grow: 0, raise: 0, angle: 0 },
    { grow: 0, raise: 0, angle: 0 },
  ];
  private gazeX = 0;
  private gazeY = 0;
  private spark = { x: REST_SPARK.x, y: REST_SPARK.y, rotation: 10, scale: 1, spin: REST_SPARK.spin };
  private tip: Spot = { x: BODY[0][0], y: BODY[0][1] };
  private headWorld: Spot = { ...HEAD_ANCHOR };
  private faceWorld: Spot = { ...FACE };
  private box = { left: 0, top: 0, right: 100, bottom: 100 };
  private nextBlink = 1.5;
  private blinkStart = -Infinity;
  private shownMood: QullMood = "rest";
  private baseMood: QullMood = "rest";
  private hops: Hop[] = [];
  private act: Act | null = null;
  private nextWhim = 6 + Math.random() * 5;
  private waveStreak = 0;
  private lastWaveAt = -Infinity;
  private waveMood: { mood: QullMood; from: number; until: number } | null = null;
  private angryUntil = -Infinity;
  private whoaUntil = -Infinity;
  private lastWhoaAt = -Infinity;
  // When the pointer came to rest on it (Infinity: it isn't on it).
  private hoverSince = Infinity;
  // A reaction to something on its screen, and when the last thing the
  // user set off ends (nothing automatic starts until QUIET_S after).
  private reaction: { mood: QullMood; until: number; look?: Spot } | null = null;
  private userUntil = 0;
  private glance: { target: Spot; until: number; brow: number } | null = null;
  private nextGlance = 2;
  private pointer: Spot | null = null;
  private pointerAt = -Infinity;
  private activeAt = 0;
  private particles: Particle[] = [];
  private nextTear = 0;
  private nextZ = 0;
  private tearSide = 0;
  private entrance: { kind: QullEntrance; start: number; from: Spot; landed: boolean } | null = null;
  private draw = 1;
  // Posture.
  private mode: QullMode = "stand";
  private hangK = 0;
  private yaw = 0;
  private yawTarget = 0;
  private swing = 0;
  private swingVelocity = 0;
  private pull: Spot = { x: 0, y: 0 };
  // Movement: the entrance offset, where it has wandered to, and last frame's total.
  private offset: Spot = { x: 0, y: 0 };
  private pos: Spot = { x: 0, y: 0 };
  private prevTotal: Spot | null = null;
  private script: Script | null = null;
  private track: [number, number] | null = null;
  private spots: Spot[] = [];
  private bounds = { left: -300, top: -120, right: 400, bottom: 320 };
  private puppet: QullPuppet | null = null;
  // How much its hands hold something (the star, or what a controller
  // says), and where, kept while letting go so the arms ease back.
  private gripK = 0;
  // The waddle: how much it's walking, and where in its step it is.
  private walkK = 0;
  private stridePhase = 0;
  private holds: [Spot, Spot] | null = null;

  /** Hands Qull's position (and optionally more) to an outside controller. */
  drive(puppet: QullPuppet | null) {
    this.puppet = puppet;
  }

  /** Arriving, or playing a click act: an outside controller should wait. */
  busy() {
    return this.entrance !== null || (this.act !== null && !this.act.whim);
  }

  asleep() {
    return this.shownMood === "asleep";
  }

  /** Busy with something of its own: keeps it from dozing off. */
  stir() {
    this.activeAt = this.time;
  }

  /** A landing squash. */
  land() {
    this.addHop(this.time, 0, 0.3);
  }

  /** A little bounce in place (a walking step). */
  bounce(height: number, duration: number) {
    this.addHop(this.time, height, duration);
  }

  /** Pops a "?" or "!" by its head. */
  say(kind: "question" | "bang") {
    this.emit(kind);
  }

  /** Emotion lines, and glad for a moment. */
  cheer() {
    this.emitBurst(this.time);
    shared.gladUntil = wallClock() + 1.5;
  }

  look(x: number, y: number) {
    const t = this.time;
    if (this.pointer && t > this.pointerAt) {
      // A fast swipe right by its face makes it jump a little.
      const speed = Math.hypot(x - this.pointer.x, y - this.pointer.y) / Math.max(1 / 120, t - this.pointerAt);
      const near = Math.hypot(x - this.faceWorld.x, y - this.faceWorld.y) < 260;
      if (speed > WHOA_SPEED && near && t - this.lastWhoaAt > 4) {
        this.whoaUntil = t + 0.5;
        this.lastWhoaAt = t;
      }
    }
    this.pointer = { x, y };
    this.pointerAt = t;
    const over = x > this.box.left && x < this.box.right && y > this.box.top && y < this.box.bottom;
    if (!over) this.hoverSince = Infinity;
    else if (this.hoverSince === Infinity) this.hoverSince = t;
    this.wake();
  }

  /** The visible area in figure units, where the spark can fly. */
  setBounds(left: number, top: number, right: number, bottom: number) {
    this.bounds = { left, top, right, bottom };
  }

  /** The body's extent in figure units, for hit testing. */
  hitBox() {
    return this.box;
  }

  /** Where it stands or hangs: eased, unless `instant`. */
  setMode(mode: QullMode, instant = false) {
    this.mode = mode;
    if (instant) this.hangK = mode === "hang" ? 1 : 0;
    if (mode === "hang") {
      this.spark.scale = HANG_STAR_SCALE;
    }
  }

  /** Walking range along its ledge, relative to home (x only). */
  setTrack(track: [number, number] | null) {
    this.track = track;
  }

  /** Places worth exploring, relative to home. */
  setSpots(spots: Spot[]) {
    this.spots = spots;
  }

  /**
   * Reacts to something on its screen: a mood for a while, maybe a look
   * (world units), a "?" or "!", a hop. It cuts short anything it was
   * doing on its own.
   */
  react(reaction: { mood: QullMood; s: number; look?: Spot; say?: "question" | "bang"; hop?: boolean }) {
    if (this.entrance || (this.act && !this.act.whim)) return;
    const t = this.time;
    this.wake();
    if (this.act?.whim) this.act = null;
    this.script = null;
    this.yawTarget = 0;
    this.reaction = { mood: reaction.mood, until: t + reaction.s, look: reaction.look };
    this.userUntil = Math.max(this.userUntil, t + reaction.s);
    if (reaction.say) this.emit(reaction.say);
    if (reaction.hop) this.addHop(t, 7, 0.45);
  }

  /** Nothing the user set off has played for a while, nor is the spark up to something. */
  quiet() {
    return !this.busy() && this.act === null && this.time > this.userUntil + QUIET_S;
  }

  /** The mood it holds until changed (null = rest). */
  mood(mood: QullMood | null) {
    const next = mood ?? "rest";
    // Now and then, a new curiosity gets a little "?".
    if (next === "curious" && this.baseMood !== "curious" && chance(0.4)) this.emit("question");
    this.baseMood = next;
    this.userUntil = Math.max(this.userUntil, this.time + 1);
    this.wake();
  }

  /**
   * Arrives from off screen (or draws itself in place). "random" picks one;
   * without its spark, it can't fly in.
   */
  enter(choice: QullEntrance | "random") {
    const options: QullEntrance[] = shared.sparkGone ? ["walk", "drop", "draw"] : ["walk", "drop", "fly", "draw"];
    const kind = choice === "random" ? pick(options) : choice;
    const { right, top, bottom } = this.bounds;
    const from =
      kind === "walk"
        ? { x: Math.max(160, right + 40), y: 0 }
        : kind === "drop"
          ? { x: 0, y: Math.min(-160, top - 140) }
          : kind === "fly"
            ? { x: 0, y: Math.max(160, bottom + 60) }
            : { x: 0, y: 0 };
    this.entrance = { kind, start: this.time, from, landed: false };
    this.offset = { ...from };
    if (kind === "fly") {
      // It rises hanging from its spark. If the spark was gone, it came back
      // to fetch Qull: a reunion on the way up.
      if (shared.sparkGone) {
        shared.sparkGone = false;
        shared.gladUntil = wallClock() + FLY_S + 3;
      }
      this.setMode("hang", true);
    }
    this.spark.x = from.x + (kind === "fly" ? HANG_STAR.x : REST_SPARK.x);
    this.spark.y = from.y + (kind === "fly" ? HANG_STAR.y : REST_SPARK.y);
    if (kind === "drop") {
      this.addHop(this.time + DROP_S, 0, 0.4);
    } else if (kind === "draw") {
      this.draw = 0;
      this.spark.scale = 0;
    }
  }

  /** The totem wave reaches it, `delay` seconds from now. */
  startle(delay = 0) {
    const t = this.time;
    this.wake();
    if (t - this.lastWaveAt > WAVE_STREAK_RESET_S) this.waveStreak = 0;
    this.waveStreak += 1;
    this.lastWaveAt = t;
    const at = t + delay;
    this.userUntil = Math.max(this.userUntil, at + 3);
    if (this.waveStreak <= 3) {
      this.addHop(at, 14, 0.6);
      this.emit("bang", at);
      this.waveMood = { mood: "surprised", from: at, until: at + 0.9 };
    } else if (this.waveStreak === 4) {
      this.addHop(at, 5, 0.75);
      this.waveMood = { mood: "bored", from: at, until: at + 2.3 };
    } else if (this.waveStreak === 5) {
      this.emit("question", at + 0.3);
      this.waveMood = { mood: "unimpressed", from: at, until: at + 2.4 };
    } else {
      this.waveMood = { mood: "flat", from: at, until: at + 3 };
    }
  }

  /** A click on Qull: plays the next act, unless a click act is still playing. */
  poke() {
    const t = this.time;
    this.wake();
    if (this.entrance) return;
    if (this.act && !this.act.whim && t < this.act.start + this.act.duration) {
      // Busy: a puzzled look back, sometimes.
      if (chance(0.5) && !this.particles.some((p) => p.kind === "question")) this.emit("question");
      return;
    }
    // A click cuts any whim, wandering or reaction short.
    this.script = null;
    this.reaction = null;
    this.yawTarget = 0;
    const kind = this.pickAct();
    this.startAct(kind, false);
    this.userUntil = Math.max(this.userUntil, t + ACT_S[kind]);

    if (kind === "lap") this.addHop(t, 8, 0.5);
    if (kind === "tickle") {
      this.addHop(t, 4, 0.35);
      this.addHop(t + 0.6, 4, 0.35);
    }
    if (kind === "return") {
      shared.sparkGone = false;
      // It can't contain itself.
      [0.3, 0.43, 0.56].forEach((at, i) => {
        this.addHop(t + ACT_S.return * at, 11 - i * 2, 0.36);
        this.emitBurst(t + ACT_S.return * at);
      });
    }
  }

  private startAct(kind: ActKind, whim: boolean) {
    const from = this.relative({ x: this.spark.x, y: this.spark.y });
    this.act = {
      kind,
      start: this.time,
      duration: ACT_S[kind],
      from,
      path: this.planPath(kind, { x: this.spark.x, y: this.spark.y }),
      cued: false,
      whim,
    };
  }

  private pickAct(): ClickKind {
    if (this.mode !== "hang" && shared.sparkGone) return "return";
    const set = this.mode === "hang" ? ACT_SETS.hang : ACT_SETS.ground;
    shared.clicks += 1;
    const unlocked = set.playful.every((kind) => shared.playedActs.has(kind));
    const options: { kind: ClickKind; weight: number }[] = set.playful
      .filter((kind) => kind !== shared.lastAct)
      .map((kind) => ({
        kind,
        weight: unlocked || shared.playedActs.has(kind) ? 1 : 1 + UNPLAYED_WEIGHT_PER_CLICK * (shared.clicks - 1),
      }));
    if (unlocked && shared.lastAct !== set.special) options.push({ kind: set.special, weight: SPECIAL_WEIGHT });
    let roll = Math.random() * options.reduce((sum, { weight }) => sum + weight, 0);
    let kind = options[options.length - 1].kind;
    for (const option of options) {
      roll -= option.weight;
      if (roll < 0) {
        kind = option.kind;
        break;
      }
    }
    shared.playedActs.add(kind);
    shared.lastAct = kind;
    return kind;
  }

  // Now and then, on its own: the spark plays with Qull, or Qull wanders.
  private startWhim(t: number, asleep: boolean) {
    this.nextWhim = t + 7 + Math.random() * 7;
    if (this.mode === "hang") {
      const options: ("tease" | "spin" | "explore")[] = asleep ? ["tease"] : ["tease", "spin", "explore", "explore"];
      const kind = pick(options);
      if (kind === "explore") this.explore();
      else this.startAct(kind, true);
      return;
    }
    if (shared.sparkGone) {
      if (this.track && !asleep) this.stroll();
      return;
    }
    // A sleeping Qull only gets bonked awake.
    const options: (WhimKind | "stroll")[] = asleep ? ["bonk"] : ["bonk", "solo"];
    if (!asleep && this.track) options.push("stroll", "stroll");
    const kind = pick(options);
    if (kind === "stroll") this.stroll();
    else this.startAct(kind, true);
  }

  // Walks along its ledge to somewhere else and has a look around.
  private stroll() {
    if (!this.track) return;
    const [lo, hi] = this.track;
    const here = this.pos.x;
    let to = lerp(lo, hi, Math.random());
    if (Math.abs(to - here) < 20) to = here + (to < here ? -1 : 1) * 30;
    to = clamp(to, lo, hi);
    this.runScript([
      { kind: "move", to: { x: to, y: this.pos.y }, style: "walk" },
      { kind: "wait", s: 1.2, mood: "curious", ask: chance(0.3) },
    ]);
  }

  // Floats over to something on the page, looks it over, and comes back.
  private explore() {
    const target = this.spots.length
      ? pick(this.spots)
      : { x: lerp(-60, 60, Math.random()), y: lerp(-80, 10, Math.random()) };
    this.runScript([
      { kind: "move", to: target, style: "float" },
      { kind: "wait", s: 2.2, mood: "curious", ask: chance(0.6) },
      { kind: "move", to: { x: 0, y: 0 }, style: "float" },
    ]);
  }

  private runScript(steps: Step[]) {
    this.script = { steps, index: 0, stepStart: this.time, from: null };
  }

  private wake() {
    if (this.shownMood === "asleep") {
      // Startled awake.
      this.addHop(this.time, 6, 0.45);
      this.emit("bang");
    }
    this.activeAt = this.time;
  }

  private emit(kind: "question" | "bang" | "z", born = this.time) {
    const at = this.post(EMIT[kind].x, EMIT[kind].y);
    const drift = kind === "z" ? { vx: 6, vy: -9 } : { vx: 1.5, vy: -5 };
    this.particles.push({
      kind,
      x: at.x,
      y: at.y,
      ...drift,
      born,
      life: PARTICLE_LIFE[kind],
      size: PARTICLE_SIZE[kind],
      angle: 0,
    });
  }

  // Emotion lines fanned over its head, like a cartoon "yay".
  private emitBurst(born: number) {
    for (let i = 0; i < 7; i++) {
      const angle = -160 + (140 * i) / 6;
      this.particles.push({ kind: "line", ...HEAD, vx: 0, vy: 0, born, life: PARTICLE_LIFE.line, size: 1, angle });
    }
  }

  // World paths for the spark's trips off and back onto the screen.
  private planPath(kind: ActKind, from: Spot): Spot[] {
    const { left, top, right, bottom } = this.bounds;
    const w = right - left;
    const h = bottom - top;
    const inside = () => ({ x: left + w * (0.12 + Math.random() * 0.76), y: top + h * (0.12 + Math.random() * 0.6) });
    const offEdge = () => {
      const edge = Math.floor(Math.random() * 3);
      if (edge === 0) return { x: left + w * Math.random(), y: top - 80 };
      if (edge === 1) return { x: left - 80, y: top + h * Math.random() * 0.7 };
      return { x: right + 80, y: top + h * Math.random() * 0.7 };
    };
    const overHead = this.toWorld({ x: 50, y: -28 });
    if (kind === "leave") return [from, { x: from.x, y: from.y - 18 }, inside(), inside(), inside(), offEdge()];
    if (kind === "return") return [offEdge(), inside(), overHead];
    return [];
  }

  private addHop(start: number, height: number, duration: number) {
    const overlaps = this.hops.some((hop) => start < hop.start + hop.duration && hop.start < start + duration);
    if (!overlaps) this.hops.push({ start, duration, height });
  }

  // The last frame's posture transform, for emitting and planning between frames.
  private post: (x: number, y: number) => Spot = (x, y) => ({ x, y });

  // A head-relative spot in the world: translated with the head, not turned.
  private toWorld(p: Spot): Spot {
    return { x: this.headWorld.x + p.x - HEAD_ANCHOR.x, y: this.headWorld.y + p.y - HEAD_ANCHOR.y };
  }

  private relative(p: Spot): Spot {
    return { x: p.x - this.headWorld.x + HEAD_ANCHOR.x, y: p.y - this.headWorld.y + HEAD_ANCHOR.y };
  }

  private scriptFrame(t: number): ActFrame | null {
    const script = this.script;
    if (!script) return null;
    const step = script.steps[script.index];
    if (!step) {
      this.script = null;
      return null;
    }
    const next = () => {
      script.index += 1;
      script.stepStart = t;
      script.from = null;
    };
    const local = t - script.stepStart;
    switch (step.kind) {
      case "wait":
        this.yawTarget = 0;
        if (local === 0 && step.ask) this.emit("question");
        if (local > step.s) next();
        return { mood: step.mood };
      case "move": {
        if (!script.from) {
          script.from = { ...this.pos };
          const distance = Math.hypot(step.to.x - this.pos.x, step.to.y - this.pos.y);
          const duration = step.style === "walk" ? Math.max(0.8, distance / 38) : Math.max(1.2, distance / 70);
          (script as Script & { duration?: number }).duration = duration;
        }
        const duration = (script as Script & { duration?: number }).duration ?? 1;
        const p = clamp01(local / duration);
        const k = easeInOutSine(p);
        const from = script.from;
        this.pos = { x: lerp(from.x, step.to.x, k), y: lerp(from.y, step.to.y, k) };
        if (p >= 1) next();
        const ahead = { x: 50 + sign(step.to.x - from.x) * 200, y: 60 + (step.to.y - from.y) };
        return {
          mood: step.style === "walk" ? "rest" : "curious",
          look: ahead,
          stride: step.style === "walk" ? 1 : 0,
        };
      }
    }
  }

  private entranceFrame(t: number): ActFrame | null {
    const entrance = this.entrance;
    if (!entrance) return null;
    const local = t - entrance.start;
    switch (entrance.kind) {
      case "walk": {
        const p = clamp01(local / WALK_S);
        this.offset = { x: entrance.from.x * (1 - easeInOutSine(p)), y: 0 };
        if (p >= 1) {
          this.entrance = null;
          // Looks around its new place.
          this.emit("question");
          return null;
        }
        return { mood: "curious", look: { x: -300, y: 60 }, stride: 1, upright: true };
      }
      case "fly": {
        // Rises from below the screen hanging from its spark, swinging a
        // little, and settles into a float.
        const p = clamp01(local / FLY_S);
        const rise = 1 - Math.pow(1 - p, 3);
        this.offset = { x: 0, y: entrance.from.y * (1 - rise) };
        if (p >= 1 && !entrance.landed) {
          entrance.landed = true;
          this.emitBurst(t);
        }
        if (local > FLY_S + 0.4) {
          this.entrance = null;
          return null;
        }
        return { mood: "happy", swing: 10 * Math.sin(local * 4) * (1 - p), look: { x: 50, y: -60 } };
      }
      case "draw": {
        // Lines first, then its fill, then its face and spark pop in; it
        // blinks awake with a little "ta-da".
        const p = clamp01(local / DRAW_S);
        this.draw = p;
        if (p >= 1) {
          this.entrance = null;
          this.blinkStart = t;
          this.addHop(t, 0, 0.35);
          this.emitBurst(t);
          return null;
        }
        return {
          mood: "rest",
          look: { x: 50, y: 60 },
          spark: { ...REST_SPARK, follow: 60, spin: 6, scale: p < 0.85 ? 0 : 1 },
        };
      }
      case "drop": {
        // Falls in upright, lands, and only then settles into its posture.
        const p = clamp01(local / DROP_S);
        this.offset = { x: 0, y: entrance.from.y * (1 - p * p) };
        if (p >= 1 && !entrance.landed) {
          entrance.landed = true;
          this.emitBurst(t);
        }
        if (local > DROP_S + 0.7) {
          this.entrance = null;
          return null;
        }
        return { mood: p < 1 ? "surprised" : "happy", arms: p < 1 ? [80, -80] : [40, -40], upright: true };
      }
    }
  }

  private actFrame(t: number): ActFrame | null {
    const act = this.act;
    if (!act) return null;
    const local = t - act.start;
    const p = local / act.duration;
    // Fires once per act, at the moment it's first asked.
    const once = () => {
      if (act.cued) return false;
      act.cued = true;
      return true;
    };
    if (p >= 1) {
      this.act = null;
      if (act.kind === "leave") shared.sparkGone = true;
      if (act.kind === "return") shared.gladUntil = wallClock() + 5;
      if (["lap", "tickle", "swing", "loop"].includes(act.kind)) shared.gladUntil = wallClock() + 0.4;
      if (act.kind === "twirl" || act.kind === "spin") this.emit("question");
      if (act.kind === "tug" || act.kind === "loop") this.emitBurst(t);
      return null;
    }

    switch (act.kind) {
      case "lap": {
        // Eases out of its spot, speeds round, and settles back into it.
        const dx = act.from.x - ORBIT_CENTER.x;
        const dy = act.from.y - ORBIT_CENTER.y;
        const angle = Math.atan2(dy, dx) + 2 * Math.PI * easeInOutSine(p);
        const radius = lerp(Math.hypot(dx, dy), ORBIT_RADIUS, Math.sin(Math.PI * p));
        return {
          mood: "happy",
          spark: {
            x: ORBIT_CENTER.x + radius * Math.cos(angle),
            y: ORBIT_CENTER.y + radius * Math.sin(angle),
            follow: 40,
            spin: lerp(2, 12, Math.sin(Math.PI * p)),
          },
        };
      }
      case "tickle": {
        // The spark darts from side to side and Qull giggles and wriggles.
        const wriggle = Math.sin(local * 28) * Math.sin(Math.PI * p);
        return {
          mood: "happy",
          shake: 2.4 * wriggle,
          arms: [30 + 25 * wriggle, -30 + 25 * wriggle],
          spark: { x: 50 + 34 * Math.sin(local * 9), y: 50 + 9 * Math.sin(local * 14), follow: 16, spin: 10 },
        };
      }
      case "perch": {
        // Lands on its tip; Qull looks up at it cross-eyed; it hops off.
        const onTip = { x: this.tip.x, y: this.tip.y - 7, follow: 22, spin: 0, scale: 0.8, world: true };
        if (p < 0.25) return { mood: "curious", spark: onTip, look: onTip, lookWorld: true };
        if (p < 0.8) {
          return {
            mood: "crossed",
            cross: true,
            spark: { ...onTip, y: onTip.y - 1.2 * Math.abs(Math.sin(local * 5)) },
          };
        }
        if (once()) this.addHop(t, 6, 0.45);
        return { mood: "happy", spark: { ...REST_SPARK, follow: 9, spin: 6 } };
      }
      case "leave": {
        // Rises, zips around the screen, and flies off an edge.
        const u = window01(p, 0.08, 0.92);
        const at = alongPath(act.path, easeInOutSine(u));
        const spark: ActFrame["spark"] =
          p < 0.92 ? { x: at.x, y: at.y, follow: 60, spin: lerp(3, 14, Math.sin(Math.PI * u)), world: true } : "hidden";
        // Gone once off screen, even if this Qull unmounts before the act ends.
        if (spark === "hidden") shared.sparkGone = true;
        const mood: QullMood = p < 0.1 ? "surprised" : p < 0.7 ? "curious" : "sad";
        return {
          mood,
          spark,
          look: spark === "hidden" ? undefined : at,
          lookWorld: true,
          // Reaches after it.
          arms: p < 0.7 ? [16, -60] : undefined,
        };
      }
      case "return": {
        // Flies back in, laps it once, and settles.
        let spark: SparkOverride;
        if (p < 0.45) {
          const at = alongPath(act.path, easeInOutSine(p / 0.45));
          spark = { x: at.x, y: at.y, follow: 60, spin: 12, world: true };
        } else if (p < 0.82) {
          const q = (p - 0.45) / 0.37;
          const angle = -Math.PI / 2 + 2 * Math.PI * easeInOutSine(q);
          spark = {
            x: ORBIT_CENTER.x + ORBIT_RADIUS * Math.cos(angle),
            y: ORBIT_CENTER.y + (ORBIT_RADIUS + 24) * Math.sin(angle),
            follow: 40,
            spin: 12,
          };
        } else {
          spark = { ...REST_SPARK, follow: 8, spin: 4 };
        }
        // Flaps its arms.
        const flap = 15 * Math.sin(local * 18);
        const world = spark.world ? { x: spark.x, y: spark.y } : this.toWorld(spark);
        return {
          mood: p < 0.1 ? "surprised" : "happy",
          spark,
          look: world,
          lookWorld: true,
          arms: p < 0.1 ? undefined : [75 + flap, -75 - flap],
        };
      }
      case "bonk": {
        // The spark backs up, dives into its head, and bounces off. Qull is
        // not amused.
        if (p < 0.3) return { spark: { x: 36, y: -30, follow: 8, spin: 6 }, mood: "rest" };
        if (p < 0.45) {
          return { spark: { x: 47, y: 24, follow: 30, spin: 16 }, mood: "surprised", look: { x: 40, y: -20 } };
        }
        if (once()) {
          this.addHop(t, 0, 0.35);
          this.emit("bang");
          this.angryUntil = t + 2;
          this.activeAt = t;
        }
        const wobble = 5 * Math.sin(local * 14) * (1 - p);
        return { spark: { x: REST_SPARK.x, y: REST_SPARK.y + wobble, follow: 5, spin: 3 } };
      }
      case "solo": {
        // The spark goes off on a loop of its own; Qull watches, puzzled.
        if (once()) this.emit("question");
        const u = local / act.duration;
        const x = 40 + 48 * Math.sin(2 * Math.PI * u);
        const y = -4 + 16 * Math.sin(4 * Math.PI * u);
        return { spark: { x, y, follow: 10, spin: 8 }, mood: "confused", look: { x, y } };
      }
      case "swing":
        return {
          mood: p < 0.12 ? "surprised" : "happy",
          swing: 34 * Math.sin(local * 4.4) * Math.sin(Math.PI * p),
        };
      case "loop": {
        // A loop-the-loop with Qull in tow.
        const a = 2 * Math.PI * easeInOutSine(p);
        return {
          mood: p < 0.15 ? "surprised" : "happy",
          drift: { x: 42 * Math.sin(a), y: -42 * (1 - Math.cos(a)) },
        };
      }
      case "twirl":
        // Spins it round and round; it comes out dizzy.
        return { mood: "crossed", cross: true, yaw: local * 380 };
      case "tug": {
        // The spark tries to fly off with it; Qull holds on, stretched out,
        // until it gives up and springs back.
        if (p < 0.65) {
          const k = easeInOutSine(p / 0.65);
          return {
            mood: "bold",
            pull: { x: 70 * k + 5 * Math.sin(local * 22), y: -24 * k + 3 * Math.sin(local * 17) },
            drift: { x: 14 * k, y: -6 * k },
          };
        }
        return { mood: p < 0.75 ? "surprised" : "happy", swing: 20 * Math.sin(local * 6) * (1 - p) };
      }
      case "tease":
        // Jiggles it about; Qull gets cross.
        return {
          mood: p < 0.4 ? "surprised" : "angry",
          pull: { x: 9 * Math.sin(local * 16) * Math.sin(Math.PI * p), y: 4 * Math.sin(local * 11) },
          swing: 8 * Math.sin(local * 16) * Math.sin(Math.PI * p),
        };
      case "spin": {
        // A little figure eight overhead; Qull can't work out what it's doing.
        if (once()) this.emit("question");
        const a = 2 * Math.PI * (local / act.duration);
        return { mood: "confused", pull: { x: 16 * Math.sin(2 * a), y: 10 * Math.sin(a) }, look: { x: 50, y: -60 } };
      }
    }
  }

  private resolveMood(frame: ActFrame | null, t: number): QullMood {
    if (frame?.mood) return frame.mood;
    const wave = this.waveMood;
    if (wave && t >= wave.from && t < wave.until) return wave.mood;
    if (this.reaction && t < this.reaction.until) return this.reaction.mood;
    if (t < this.angryUntil) return "angry";
    if (shared.sparkGone && this.mode !== "hang") return "sad";
    if (wallClock() < shared.gladUntil) return "happy";
    if (t < this.whoaUntil) return "surprised";
    if (t - this.hoverSince > PET_S) return "happy";
    if (t - this.activeAt > SLEEP_S) return "asleep";
    return this.baseMood;
  }

  step(dt: number): QullPose {
    this.time += dt;
    const t = this.time;
    this.hops = this.hops.filter((hop) => t < hop.start + hop.duration);

    const asleep = this.shownMood === "asleep";
    // On its own only after a quiet spell since anything the user set off.
    if (
      !this.entrance &&
      !this.act &&
      !this.script &&
      !this.puppet?.busy &&
      t > this.nextWhim &&
      t > this.userUntil + QUIET_S
    ) {
      this.startWhim(t, asleep);
    }
    // An outside controller places it even while the spark plays a whim.
    const puppet = this.entrance ? null : this.puppet;
    if (puppet) {
      this.pos = { ...puppet.pos };
      if (puppet.yaw !== undefined) this.yawTarget = puppet.yaw;
    }
    const puppetFrame: ActFrame | null = puppet
      ? {
          mood: puppet.mood,
          arms: puppet.arms,
          look: puppet.look,
          lookWorld: true,
          shake: puppet.shake,
          stride: puppet.stride,
        }
      : null;
    const frame = this.entranceFrame(t) ?? this.actFrame(t) ?? this.scriptFrame(t) ?? puppetFrame;
    // Arriving counts as something the user set off: it settles in first.
    if (this.entrance) this.userUntil = Math.max(this.userUntil, t);
    const mood = this.resolveMood(frame, t);
    const expression = EXPRESSIONS[mood];
    if (mood !== this.shownMood) {
      // A blink covers the change of eye shape, the way a face resets.
      if (expression.eyes === "open") this.blinkStart = t;
      this.shownMood = mood;
    }

    // Posture.
    this.hangK = approach(this.hangK, this.mode === "hang" ? 1 : 0, dt, 6);
    this.yaw = frame?.yaw ?? approach(this.yaw, this.yawTarget, dt, TURN_RATE);
    const yawRad = (this.yaw * Math.PI) / 180;
    const frontSign = sign(Math.cos(yawRad));
    const sideSign = sign(Math.sin(yawRad));
    const profileK = Math.abs(Math.sin(yawRad));
    // A feature at local x on a cylinder of radius r: where it shows, and
    // how much it faces the viewer (≤ 0: round the back).
    const project = (x: number, r: number) => {
      const a = Math.asin(clamp((x - BASE_X) / r, -1, 1)) + yawRad;
      return { x: BASE_X + r * Math.sin(a), depth: Math.cos(a) };
    };
    // The outline between front (mirrored from behind) and profile.
    const outline = (i: number): Point => {
      const [fx, fy] = BODY[i];
      const [px, py] = PROFILE[i];
      return [
        lerp(BASE_X + (fx - BASE_X) * frontSign, BASE_X + (px - BASE_X) * sideSign, profileK),
        lerp(fy, py, profileK),
      ];
    };

    this.energy = approach(this.energy, expression.energy, dt, 4);
    this.tilt = approach(this.tilt, expression.tilt, dt, 8);
    this.lid = approach(this.lid, expression.lid, dt, 10);
    this.cross = approach(this.cross, frame?.cross ? 1 : 0, dt, 10);
    const speed = lerp(1, 1.6, this.energy);
    this.breathPhase += dt * Math.max(1.2, lerp(3.1, 6.5, this.energy));
    this.swayPhase[0] += dt * 3.6 * speed;
    this.swayPhase[1] += dt * 6.1 * speed;

    // Where it is: entrance offset + wandering + an act's drift + a float.
    const pullTarget = frame?.pull ?? { x: 0, y: 0 };
    this.pull = { x: approach(this.pull.x, pullTarget.x, dt, 10), y: approach(this.pull.y, pullTarget.y, dt, 10) };
    const drift = frame?.drift ?? { x: 0, y: 0 };
    const bob = this.hangK * 2.5 * Math.sin(t * 1.7);
    const total = {
      x: this.offset.x + this.pos.x + drift.x,
      y: this.offset.y + this.pos.y + drift.y + bob,
    };
    // Hanging, the body swings like a pendulum from the spark: it lags
    // behind movement and settles with a little idle sway.
    const vx = this.prevTotal && dt > 0 ? (total.x - this.prevTotal.x) / dt : 0;
    this.prevTotal = total;
    const swingTarget = (frame?.swing ?? 0) + clamp(-vx * 0.3, -35, 35) + 3 * Math.sin(t * 1.3);
    this.swingVelocity += ((swingTarget - this.swing) * 30 - this.swingVelocity * 4) * dt;
    this.swing += this.swingVelocity * dt;
    const swingDeg = this.swing * this.hangK;

    // Breathing: stretch and squash anchored at the base. Hops squash
    // along the world's vertical, whatever its posture.
    const breathDepth = Math.max(0.012, lerp(0.028, 0.05, this.energy));
    const breath = Math.sin(this.breathPhase);
    this.walkK = approach(this.walkK, frame?.stride ?? 0, dt, 8);
    this.stridePhase += dt * STRIDE.rate * this.walkK;
    const stepSin = Math.sin(this.stridePhase);
    // Each step lifts it a little, softly: no squash, no hop.
    const stepBob = Math.abs(stepSin) * STRIDE.bob * this.walkK;
    const hop = hopShape(
      this.hops.find((h) => t >= h.start),
      t
    );
    const hopX = hop.sx;
    const scaleX = (1 - breathDepth * 0.8 * breath) * hop.sx;
    const scaleY = (1 + breathDepth * breath) * hop.sy * (1 + 0.03 * this.hangK);

    // Flame sway: two waves travelling up the body, still at the base and
    // widest at the tip, like paper held from below in the wind.
    const swayGain = Math.max(0.35, lerp(1, 1.4, this.energy));
    const sway = (y: number) => {
      const h = clamp01((BASE_Y - y) / HEIGHT);
      const w = Math.pow(h, 1.6);
      return (
        swayGain * w * (3 * Math.sin(this.swayPhase[0] - h * 4.5) + 1.1 * Math.sin(this.swayPhase[1] - h * 7.5))
      );
    };
    const shake = frame?.shake ?? 0;

    const postDeg = swingDeg;
    // Posture: swing from the spark (hanging), then hop and move. No tilt:
    // feet, accents and anchors use it directly.
    const post = (x: number, y: number): Spot => {
      const [a, b] = rotateAbout(x, y, HANG_STAR, swingDeg);
      return { x: a + total.x, y: b + total.y - hop.lift - stepBob };
    };
    this.post = post;
    this.headWorld = post(HEAD_ANCHOR.x, HEAD_ANCHOR.y);
    // It rocks from foot to foot as it walks.
    const tiltDeg = this.tilt + stepSin * STRIDE.rock * this.walkK;
    const angle = tiltDeg + postDeg;
    // The body: breathing and hop scale, turning (mirror), sway, a lean
    // toward the gaze, the mood's tilt, then posture.
    const place = (x: number, y: number): Spot => {
      const py = BASE_Y + (y - BASE_Y) * scaleY;
      const h = clamp01((BASE_Y - py) / HEIGHT);
      const px =
        BASE_X +
        (x - BASE_X) * scaleX +
        sway(py) +
        this.gazeX * 0.18 * ((BASE_Y - py) / 80) +
        shake * (0.4 + 0.6 * h);
      const [a, b] = rotateAbout(px, py, QULL_BASE, tiltDeg);
      return post(a, b);
    };
    this.faceWorld = place(FACE.x, FACE.y);

    // Gaze: what it looks at, in world units.
    const pointerFresh = this.pointer !== null && t - this.pointerAt < IDLE_S;
    const sparkWorld = { x: this.spark.x, y: this.spark.y };
    if (!pointerFresh && !frame && mood === "rest" && t > this.nextGlance) {
      // Idle glances: mostly at its spark, sometimes around, a brow flicking up.
      const target = chance(0.55) && !shared.sparkGone
        ? sparkWorld
        : this.toWorld({ x: 50 + lerp(-160, 160, Math.random()), y: lerp(-60, 80, Math.random()) });
      this.glance = { target, until: t + 0.9 + Math.random() * 0.8, brow: chance(0.5) ? Math.floor(Math.random() * 2) : -1 };
      this.nextGlance = t + 1.8 + Math.random() * 2;
    }
    const glancing = this.glance && t < this.glance.until ? this.glance : null;
    const reacting = this.reaction && t < this.reaction.until ? this.reaction : null;
    const moodLook = reacting?.look ?? (expression.look && this.toWorld(expression.look));
    const idleTarget = shared.sparkGone && this.mode !== "hang" ? this.toWorld({ x: 46, y: 160 }) : sparkWorld;
    let target: Spot;
    if (frame?.look) target = frame.lookWorld ? frame.look : this.toWorld(frame.look);
    else if (moodLook) target = moodLook;
    else if (pointerFresh && this.pointer && mood !== "asleep") target = this.pointer;
    else if (glancing) target = glancing.target;
    else target = idleTarget;
    const dx = target.x - this.faceWorld.x;
    const dy = target.y - this.faceWorld.y;
    const distance = Math.hypot(dx, dy) || 1;
    const reach = Math.tanh(distance / GAZE_REACH);
    this.gazeX = approach(this.gazeX, (dx / distance) * reach * TRAVEL_X, dt, 15);
    this.gazeY = approach(this.gazeY, (dy / distance) * reach * TRAVEL_Y, dt, 15);

    // Perks up with the pointer near its face.
    const pointerDistance = this.pointer
      ? Math.hypot(this.pointer.x - this.faceWorld.x, this.pointer.y - this.faceWorld.y)
      : Infinity;
    this.interest = approach(
      this.interest,
      pointerFresh && mood !== "asleep" ? clamp01(1 - pointerDistance / INTEREST_RADIUS) : 0,
      dt,
      6
    );

    // A slow, smooth wobble along each point's outward direction: two low
    // modes around the contour, so the outline breathes without lumps.
    const body = BODY.map((_, i) => {
      const [x, y] = outline(i);
      const a = BODY_ANGLES[i];
      const push = 0.55 * Math.sin(2 * a + t * 1.9) + 0.4 * Math.sin(3 * a - t * 2.7);
      const at = place(x + Math.cos(a) * push, y + Math.sin(a) * push);
      return [at.x, at.y] as Point;
    });
    this.tip = { x: body[0][0], y: body[0][1] };
    const xs = body.map((p) => p[0]);
    const ys = body.map((p) => p[1]);
    this.box = { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };

    if (t > this.nextBlink) {
      this.blinkStart = t;
      this.nextBlink = t + 1.5 + Math.random() * 2.8;
    }
    const blinkProgress = (t - this.blinkStart) / 0.13;
    const openness = blinkProgress >= 0 && blinkProgress < 1 ? 1 - 0.92 * Math.sin(Math.PI * blinkProgress) : 1;
    const angleRad = (angle * Math.PI) / 180;

    const eyeBottoms: Spot[] = [];
    const face = EYES.map((eye, i) => {
      // Eyes spring to size, overshooting a little on each change.
      const wanted = expression.eyeScale[i] * (1 + 0.14 * this.interest);
      this.eyeVelocity[i] += ((wanted - this.eyeScale[i]) * 140 - this.eyeVelocity[i] * 13) * dt;
      this.eyeScale[i] += this.eyeVelocity[i] * dt;
      const scale = Math.max(0.3, this.eyeScale[i]);
      // Cross-eyed: each eye turns in and up toward the tip.
      const gx = lerp(this.gazeX, (i === 0 ? 1 : -1) * frontSign * TRAVEL_X * 0.55, this.cross);
      const gy = lerp(this.gazeY, -TRAVEL_Y * 0.95, this.cross);
      // Turned away, this eye is round the side or the back.
      const turned = project(eye.x, DEPTH.eyes);
      const thin = turned.depth;
      if (thin < 0.12) return "";
      const at = place(turned.x, eye.y);
      const cx = at.x + gx;
      const cy = at.y + gy;
      eyeBottoms.push({ x: cx, y: cy + eye.ry * scale });

      // Brows: the mood's, a flick while glancing, a lift when interested.
      const browState = this.brows[i];
      const flick = glancing && glancing.brow === i ? ([2, i === 0 ? 8 : -8] as const) : null;
      const moodBrow = expression.brows[i] ?? flick;
      const wantBrow = moodBrow ?? (this.interest > 0.35 ? ([1.2, 0] as const) : null);
      browState.grow = approach(browState.grow, wantBrow ? 1 : 0, dt, 14);
      if (wantBrow) {
        browState.raise = approach(browState.raise, wantBrow[0] + 1.2 * this.interest, dt, 14);
        browState.angle = approach(browState.angle, wantBrow[1], dt, 14);
      }
      let browPath = "";
      if (browState.grow > 0.05) {
        const gap = lerp(3.4, 1.4, this.lid);
        const rise = eye.ry * scale * (1 - this.lid * 0.5) + gap + browState.raise;
        browPath = band(
          cx + rise * Math.sin(angleRad),
          cy - rise * Math.cos(angleRad),
          10,
          48 * browState.grow * thin,
          2.1,
          angle + browState.angle * frontSign
        );
      }

      if (expression.eyes === "happy") return band(cx, cy - 1.5, 4.6, 140 * thin, 2.4, angle) + browPath;
      if (expression.eyes === "closed") return band(cx, cy + 2, 4.6, 120 * thin, 2.2, angle + 180) + browPath;
      if (expression.eyes === "line") return bar(cx, cy + 1, 6.2 * thin, 2.2, angle) + browPath;

      // Squash against the edge of the face near the limits of travel,
      // keeping roughly the same area.
      const nx = gx / TRAVEL_X;
      const ny = gy / TRAVEL_Y;
      const squashX = 1 - 0.42 * clamp01((Math.abs(nx) - SQUASH_FROM) / (1 - SQUASH_FROM));
      const squashY = 1 - 0.36 * clamp01((Math.abs(ny) - SQUASH_FROM) / (1 - SQUASH_FROM));
      const rx = eye.rx * scale * squashX * (1 + (1 - squashY) * 0.55) * thin;
      const ry = eye.ry * scale * squashY * (1 + (1 - squashX) * 0.6);
      // A squashed eye stays pressed against the side it looks toward.
      const px = Math.sign(nx) * (eye.rx * scale - rx) * 0.5;
      const py = Math.sign(ny) * (eye.ry * scale - ry) * 0.4;
      return lidded(cx + px, cy + py, rx, Math.max(0.4, ry * openness), this.lid, angle) + browPath;
    });

    // The nose: a dot that scrunches up with a smile.
    const nose = project(NOSE.x, DEPTH.nose);
    // In profile it sits right on the silhouette's edge, still showing.
    if (nose.depth > -0.1) {
      const shape = NOSE_MOOD[mood] ?? { dy: 0, scale: 1 };
      const at = place(nose.x, NOSE.y + shape.dy);
      face.push(
        ellipse(
          at.x + this.gazeX * 0.5,
          at.y + this.gazeY * 0.4,
          NOSE.rx * shape.scale * Math.max(0.45, nose.depth),
          NOSE.ry * shape.scale,
          angle
        )
      );
    }

    // The star it hangs from: held overhead, tugged away by the pull.
    const starWorld = {
      x: HANG_STAR.x + total.x + this.pull.x,
      y: HANG_STAR.y + total.y - hop.lift + this.pull.y,
    };

    // Limbs: arms swing from the shoulders, or reach up and hold the star;
    // feet stand planted, or dangle when it sits or hangs.
    const armSwing = stepSin * STRIDE.swing * this.walkK;
    const armTargets = frame?.arms ?? [expression.arms[0] + armSwing, expression.arms[1] + armSwing];
    // Holding on: the star it hangs from, or what the controller hands it.
    const handed = puppet?.grip;
    if (this.hangK > 0.5) {
      this.holds = [
        { x: starWorld.x - 7, y: starWorld.y + 7 },
        { x: starWorld.x + 7, y: starWorld.y + 7 },
      ];
    } else if (handed) {
      const [a, b] = handed;
      this.holds = a.x <= b.x ? [a, b] : [b, a];
    }
    this.gripK = approach(this.gripK, this.hangK > 0.5 || handed ? 1 : 0, dt, 10);
    const grip = this.hangK > 0.5 ? this.hangK : this.gripK;
    // Turned far enough, the near arm comes round in front of the body.
    const frontLimbs: string[] = [];
    const arms = SHOULDERS.map((shoulder, i) => {
        const swing = 2.5 * breath * (i === 0 ? 1 : -1);
        this.arms[i] = approach(this.arms[i], armTargets[i] + swing, dt, 12);
        const turned = project(shoulder.x, DEPTH.shoulders);
        const root = place(turned.x, shoulder.y);
        const deg = this.arms[i] * frontSign + angle;
        const a = (deg * Math.PI) / 180;
        const armX = (8 * (turned.x - BASE_X)) / DEPTH.shoulders;
        const center = {
          x: root.x + armX * Math.cos(a) - shoulder.arm.y * Math.sin(a),
          y: root.y + armX * Math.sin(a) + shoulder.arm.y * Math.cos(a),
        };
        const inFront = turned.depth > 0.35 && profileK > 0.35;
        const shape = (() => {
          if (grip < 0.02 || !this.holds) return ellipse(center.x, center.y, ARM.rx, ARM.ry, deg);
          // Reaching: the arm stretches from its shoulder (riding up when
          // what it holds is overhead) to its hold, thinner as it stretches.
          const along = { x: -ARM.ry * Math.sin(a), y: ARM.ry * Math.cos(a) };
          const near = { x: center.x - along.x, y: center.y - along.y };
          const far = { x: center.x + along.x, y: center.y + along.y };
          const hold = this.holds[root.x < this.faceWorld.x ? 0 : 1];
          const overhead = clamp01((root.y - hold.y) / 30);
          const raised = place(turned.x, lerp(shoulder.y, RAISED_SHOULDER_Y, grip * overhead));
          const from = { x: lerp(near.x, raised.x, grip), y: lerp(near.y, raised.y, grip) };
          const to = { x: lerp(far.x, hold.x, grip), y: lerp(far.y, hold.y, grip) };
          const length = Math.hypot(to.x - from.x, to.y - from.y) / 2;
          return limb(from, to, ARM.rx * clamp(Math.sqrt(ARM.ry / Math.max(1, length)), 0.55, 1));
        })();
        if (inFront) {
          frontLimbs.push(shape);
          return "";
        }
        return shape;
      }).join("");
    const feet = FEET.map((foot, i) => {
      const dangle = this.hangK * 0.8;
      const spread = (hopX - 1) * 30 * (foot.x < BASE_X ? -1 : 1);
      // Turned, the feet line up under it and point their toes the way it faces.
      const turned = project(foot.x + spread, DEPTH.feet);
      const fx = turned.x + sideSign * profileK * 6 - dangle * 3 * (foot.x < BASE_X ? -1 : 1);
      // Walking, each foot lifts in turn; the other stays planted (the bob
      // is taken back out, so it doesn't leave the ground).
      const step = Math.max(0, Math.sin(this.stridePhase + i * Math.PI)) * STRIDE.lift * this.walkK;
      const fy = foot.y + 9.5 * dangle - step + stepBob;
      // Dangling feet kick, one after the other.
      const kick = dangle * 18 * Math.sin(t * 2.4 + i * Math.PI);
      const at = post(fx, fy);
      return bar(at.x, at.y, (FOOT.width - FOOT.height) * lerp(1, 1.5, profileK), FOOT.height, postDeg + kick);
    }).join("");
    const limbs = arms + feet;

    // Accents.
    if (mood === "sad" && !frame && t > this.nextTear && eyeBottoms.length) {
      // From whichever eye shows (turned, one may be round the side).
      const eye = eyeBottoms[this.tearSide % eyeBottoms.length];
      this.particles.push({
        kind: "tear",
        x: eye.x,
        y: eye.y + 1.5,
        vx: 0,
        vy: 2,
        born: t,
        life: PARTICLE_LIFE.tear,
        size: PARTICLE_SIZE.tear,
        angle: 0,
      });
      this.tearSide = 1 - this.tearSide;
      this.nextTear = t + 0.9 + Math.random() * 0.8;
    }
    if (mood === "asleep" && t > this.nextZ) {
      this.emit("z");
      this.nextZ = t + 1.3;
    }
    this.particles = this.particles.filter((p) => t < p.born + p.life);
    const head = place(HEAD.x, HEAD.y);
    let accents = "";
    for (const particle of this.particles) {
      const age = t - particle.born;
      if (age < 0) continue;
      if (particle.kind === "line") {
        // Emotion lines stay centered on the head as it moves.
        particle.x = head.x;
        particle.y = head.y;
      } else {
        if (particle.kind === "tear") particle.vy += 40 * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
      }
      accents += particleShape(particle, age);
    }

    // The spark trails Qull with a lag, leaning toward what it looks at.
    // Hanging, it is the star Qull holds.
    const spark = this.spark;
    let hidden = false;
    let sparkTarget: Spot = sparkWorld;
    let follow = 6.3;
    let sparkScale = 1;
    let spin = REST_SPARK.spin;
    const override = frame?.spark ?? (shared.sparkGone && this.mode !== "hang" ? "hidden" : null);
    if (this.hangK > 0.5 && override !== "hidden") {
      sparkTarget = starWorld;
      follow = 60;
      sparkScale = HANG_STAR_SCALE;
      spin = 0.4 + Math.abs(this.pull.x) * 0.05;
    } else if (override === "hidden") {
      hidden = true;
    } else if (override) {
      sparkTarget = override.world ? override : this.toWorld(override);
      follow = override.follow;
      spin = override.spin;
      sparkScale = override.scale ?? 1;
    } else if (expression.spark === "circle") {
      this.circlePhase += dt * 4;
      sparkTarget = this.toWorld({ x: 50 + 15 * Math.cos(this.circlePhase), y: 2 + 6 * Math.sin(this.circlePhase) });
      spin = 8;
    } else if (expression.spark === "tip") {
      sparkTarget = { x: this.tip.x + 1, y: this.tip.y - 5 };
      sparkScale = 0.6;
      spin = 0;
      follow = 3;
    } else {
      const spot = expression.spark;
      const rel = { x: spot.x, y: spot.y + 2.5 * Math.sin(t * 3) };
      if (pointerFresh && this.pointer && spot.lean) {
        const lx = this.pointer.x - this.faceWorld.x;
        const ly = this.pointer.y - this.faceWorld.y;
        const ld = Math.hypot(lx, ly) || 1;
        const lean = Math.min(1, ld / 60) * spot.lean;
        rel.x += (lx / ld) * lean;
        rel.y += (ly / ld) * lean;
      }
      sparkTarget = this.toWorld(rel);
      sparkScale = spot.scale;
      spin = spot.spin;
    }
    if (!hidden) {
      spark.x = approach(spark.x, sparkTarget.x, dt, follow);
      spark.y = approach(spark.y, sparkTarget.y, dt, follow);
    }
    spark.scale = approach(spark.scale, sparkScale, dt, 8);
    spark.spin = approach(spark.spin, spin, dt, 5);
    spark.rotation = (spark.rotation + spark.spin * 60 * dt) % 360;
    // Held, it only rocks; free, it wobbles as it turns.
    const wobble = this.hangK > 0.5 ? swingDeg * 0.5 : 6 * Math.sin(t * 2.4);

    return {
      body: smoothClosed(body),
      face: face.join(""),
      accents,
      limbs,
      frontLimbs: frontLimbs.join(""),
      draw: this.draw,
      spark: hidden ? "scale(0)" : sparkTransform(spark.x, spark.y, spark.rotation + wobble, spark.scale),
    };
  }
}
