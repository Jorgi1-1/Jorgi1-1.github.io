import type Matter from "matter-js";

import { getTrays, onUserGrab, type StackTray } from "@/components/home/sections/stack-trays";
import { QULL_BASE, QULL_VIEWBOX_ORIGIN, QULL_VIEWBOX_SIZE, type QullMood, type QullMotion } from "./qull-motion";
import type { QullPlacement, QullWatcher } from "./use-qull-motion";

/**
 * Qull on the Stack screen: it lives on the bottom edge, climbs into the
 * trays and has a go at the pills, one clear attempt at a time with a
 * breather in between. It takes a pill in its hands and throws it; tries
 * to pull one out of its tray (it won't come: its arms stretch and stretch
 * until it loses its grip); or now and then tries to build a tower. It
 * changes trays often. It moves freely between trays but never through a
 * pill: it steps up small ledges, jumps bigger ones once, and gives up on
 * what it can't reach instead of struggling. It faces front, turning to
 * profile only to throw or to pull.
 *
 * Wide screens set the trays out in one row, and Qull lives on the bottom
 * edge below it. Narrow screens stack them in a column the visitor scrolls:
 * there each tray's bottom line is ground, Qull lives in one tray at a time
 * and scrolls with it, and when that tray leaves the screen it drops in
 * from the top onto the one the visitor is looking at. Same games, same
 * physics, either way.
 *
 * Everything here is in viewport pixels; Qull's own units only at the end.
 */

// Its body: feet below the base, half its width, its height, its footing.
const FEET_BELOW = 4.25;
const HALF_WIDTH = 26;
const HEIGHT = 92;
const FOOTPRINT = HALF_WIDTH - 2;
// Ledges up to this high it just steps onto (Qull units).
const STEP_UP = 14;
// px/s² and px/s.
const GRAVITY = 2600;
const WALK_SPEED = 70;
const PULL_SPEED = 42;
// How high it can leap, in multiples of its own height.
const MAX_LEAP = 2.6;
// Throwing: the pill leaves its hands at this velocity (Matter units).
const THROW = { x: 8, y: -6 };
// Pulling a stuck pill, it lets go when it's this far behind its hands (Qull units).
const REACH = 64;

// Standing nowhere: falls until the follow-the-visitor check drops it back in.
const FAR = 1e6;
// Off screen this long (s) in the stacked layout, it drops onto the tray in view.
const GONE_FOR = 0.35;

type Box = { left: number; top: number; right: number; bottom: number };
type TrayBox = { tray: StackTray; box: DOMRect };

// Top to bottom, then left to right: registration order isn't layout order.
const trayBoxes = (): TrayBox[] =>
  getTrays()
    .map((tray) => ({ tray, box: tray.element.getBoundingClientRect() }))
    .sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left);

// A column of trays (narrow screens) rather than one row.
function isStacked(all: TrayBox[]) {
  if (all.length < 2) return false;
  const tops = all.map((t) => t.box.top);
  return Math.max(...tops) - Math.min(...tops) > Math.min(...all.map((t) => t.box.height)) * 0.5;
}

// The tray the visitor is looking at: the topmost one whose bottom line is
// on screen with room above it for Qull, or else the most visible one.
function trayInView(all: TrayBox[], height: number): TrayBox | null {
  const framed = all.find(({ box }) => box.bottom > height + 16 && box.bottom < window.innerHeight - 4);
  if (framed) return framed;
  const seen = (box: DOMRect) => Math.max(0, Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0));
  const best = [...all].sort((a, b) => seen(b.box) - seen(a.box))[0];
  return best && seen(best.box) > 0 ? best : null;
}

/**
 * Where Qull lives on the Stack screen when the trays are stacked: on the
 * tray in view, as far right as it can stand without being inside a pill
 * (on top of them if it must). Null in the one-row layout, which keeps the
 * bottom-edge corner.
 */
export function stackPlacement(size: number): QullPlacement | null {
  const all = trayBoxes();
  if (!isStacked(all)) return null;
  const s = size / QULL_VIEWBOX_SIZE;
  const view = trayInView(all, HEIGHT * s);
  if (!view) return null;
  const { box } = view;
  const half = HALF_WIDTH * s + 4;
  const tops = view.tray.pills().map(({ body }) => ({
    left: box.left + body.bounds.min.x,
    right: box.left + body.bounds.max.x,
    top: box.top + body.bounds.min.y,
  }));
  const footing = (x: number) =>
    Math.min(box.bottom, ...tops.filter((p) => x + half > p.left && x - half < p.right).map((p) => p.top));
  let x = box.right - half - 8;
  for (let cx = x; cx >= box.left + half; cx -= 6) {
    if (footing(cx) >= box.bottom) {
      x = cx;
      break;
    }
  }
  return { x, y: footing(x) - FEET_BELOW * s, mode: "stand" };
}
// In the one-row layout: whether it stands on the screen's bottom edge
// (true) or on the trays and pills, which scroll (false). One Qull at a time.
let onScreen = true;
export const stackOnScreen = () => onScreen;

type Point = { x: number; y: number };
type Pill = { body: Matter.Body; tray: StackTray; box: Box };
type Task = { name: string; update: (dt: number) => boolean };

const overlap = (a: Box, b: Box, give = 1) =>
  a.left < b.right - give && a.right > b.left + give && a.top < b.bottom - give && a.bottom > b.top + give;
const pickOne = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const sign = (n: number) => (n < 0 ? -1 : 1);

export function watchStack(motion: QullMotion, scope: HTMLElement): QullWatcher {
  // Its feet (bottom center), velocity, and whether it stands on something.
  let feet: Point | null = null;
  let vy = 0;
  let grounded = true;
  let task: Task | null = null;
  // The pill in its hands, if any.
  let holding: Pill | null = null;
  // What it shows right now (tasks set these).
  let mood: QullMood | undefined;
  let yaw = 0;
  let arms: readonly [number, number] | undefined;
  let lookAt: Point | null = null;
  let shake = 0;
  let stride = 0;
  // Where its hands hold on (viewport px), arms stretching to reach.
  let grip: [Point, Point] | null = null;
  // Attempts in a row that couldn't reach their pill; the last jump tried.
  let strikes = 0;
  let leap: { x: number; at: number } | null = null;
  let clock = 0;
  // How long it's wanted to move without getting anywhere; where it last
  // gave up, and how many times in a row there.
  let trapped = 0;
  let stuckAt: Point | null = null;
  let stuckTimes = 0;

  const scale = () => scope.getBoundingClientRect().width / QULL_VIEWBOX_SIZE;
  // Where its feet are when it's home (the scope is placed there).
  const homeFeet = () => {
    const rect = scope.getBoundingClientRect();
    const s = rect.width / QULL_VIEWBOX_SIZE;
    return {
      x: rect.left + (QULL_BASE.x - QULL_VIEWBOX_ORIGIN.x) * s,
      y: rect.top + (QULL_BASE.y - QULL_VIEWBOX_ORIGIN.y + FEET_BELOW) * s,
    };
  };
  const toFigure = (x: number, y: number) => {
    const rect = scope.getBoundingClientRect();
    const s = rect.width / QULL_VIEWBOX_SIZE;
    return { x: QULL_VIEWBOX_ORIGIN.x + (x - rect.left) / s, y: QULL_VIEWBOX_ORIGIN.y + (y - rect.top) / s };
  };
  const toUnits = (point: Point) => {
    const home = homeFeet();
    const s = scale();
    return { x: (point.x - home.x) / s, y: (point.y - home.y) / s };
  };
  const bodyBox = (x: number, y: number): Box => {
    const s = scale();
    return { left: x - HALF_WIDTH * s, right: x + HALF_WIDTH * s, top: y - HEIGHT * s, bottom: y };
  };

  const trays = trayBoxes;
  const stacked = () => isStacked(trays());
  // Stacked: the tray it's in (its feet between that tray's top and floor).
  const trayAround = (point: Point | null) => {
    if (!point) return null;
    const s = scale();
    return (
      trays().find(
        ({ box }) =>
          point.x >= box.left && point.x <= box.right && point.y >= box.top - HEIGHT * s && point.y <= box.bottom + 2
      ) ?? null
    );
  };
  const trayOrigin = (tray: StackTray) => tray.element.getBoundingClientRect();
  const toTray = (tray: StackTray, point: Point) => {
    const origin = trayOrigin(tray);
    return { x: point.x - origin.left, y: point.y - origin.top };
  };
  const pills = (): Pill[] =>
    getTrays().flatMap((tray) => {
      const origin = tray.element.getBoundingClientRect();
      return tray.pills().map(({ body }) => {
        const b = body.bounds;
        return {
          body,
          tray,
          box: {
            left: origin.left + b.min.x,
            top: origin.top + b.min.y,
            right: origin.left + b.max.x,
            bottom: origin.top + b.max.y,
          },
        };
      });
    });
  const fresh = (pill: Pill) => pills().find((p) => p.body === pill.body) ?? pill;
  const centerOf = (pill: Pill) => {
    const { box } = fresh(pill);
    return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2, box };
  };

  // Its solid body in a tray's own pixels, and whether a box is in a tray
  // at all (anywhere it could meet that tray's pills).
  const inTrayArea = (box: Box, area: DOMRect) =>
    box.right > area.left && box.left < area.right && box.bottom > area.top - area.height * 1.5 && box.top < area.bottom;
  const localBody = (box: Box, area: DOMRect) => {
    const s = scale();
    return {
      x: box.left - area.left + 6 * s,
      y: box.top - area.top + 4 * s,
      w: box.right - box.left - 12 * s,
      h: box.bottom - box.top - 4 * s,
    };
  };

  // How far two boxes sink into each other (0 when apart).
  const sink = (a: Box, b: Box) =>
    Math.max(0, Math.min(Math.min(a.right, b.right) - Math.max(a.left, b.left), Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)));
  // A pill that moving its body from `from` to `to` would press into. It may
  // slide along or back away from what it touches, never sink deeper.
  // Loose pills resting on its head never stop it moving sideways or down:
  // it shrugs them off rather than getting stuck under them.
  const blocker = (to: Box, from: Box, rising = false): { box: Box } | undefined => {
    const hit = pills().find((pill) => {
      if (pill.body === holding?.body) return false;
      const loose = pill.tray.heldBy(pill.body) === null;
      if (!rising && loose && (pill.box.top + pill.box.bottom) / 2 < to.top) return false;
      return sink(to, pill.box) > Math.max(1, sink(from, pill.box) + 0.05);
    });
    if (hit) return hit;
    // The boxes are rough; the physics has the exact word on its real shape.
    for (const { tray, box: area } of trays()) {
      if (!inTrayArea(to, area) || tray.qullFits(localBody(to, area), rising)) continue;
      return pills().find((pill) => pill.tray === tray && overlap(to, pill.box, 0)) ?? { box: to };
    }
    return undefined;
  };

  // The trays' bottom lines make one continuous floor across the row.
  const rowFloor = () => {
    const all = trays();
    if (!all.length) return null;
    return {
      left: Math.min(...all.map((t) => t.box.left)),
      right: Math.max(...all.map((t) => t.box.right)),
      y: Math.max(...all.map((t) => t.box.bottom)),
    };
  };

  // What counts as ground: one floor under the whole row, or each stacked
  // tray's own bottom line.
  const floors = () => {
    const all = trays();
    if (!isStacked(all)) {
      const row = rowFloor();
      return row ? [row] : [];
    }
    return all.map(({ box }) => ({ left: box.left, right: box.right, y: box.bottom }));
  };

  // The nearest thing to stand on at or below `y`: a pill top, a floor, or
  // the bottom of the screen (in the row layout; stacked, there's nothing
  // outside the trays). Surfaces above don't count, so it passes up through
  // a floor when it leaps.
  const support = (x: number, y: number) => {
    const s = scale();
    const left = x - FOOTPRINT * s;
    const right = x + FOOTPRINT * s;
    let best = stacked() ? FAR : window.innerHeight;
    for (const floor of floors()) {
      if (right > floor.left && left < floor.right && floor.y >= y - 1) best = Math.min(best, floor.y);
    }
    for (const pill of pills()) {
      if (pill.body === holding?.body) continue;
      if (right > pill.box.left && left < pill.box.right && pill.box.top >= y - 1) best = Math.min(best, pill.box.top);
    }
    return best;
  };

  // Whether it could stand at x (on whatever is there, up to a leap away).
  const standable = (x: number) => {
    if (!feet) return false;
    const s = scale();
    const y = support(x, feet.y - MAX_LEAP * HEIGHT * s);
    if (feet.y - y > MAX_LEAP * HEIGHT * s) return false;
    return !blocker(bodyBox(x, y - 1), bodyBox(x, y + 400));
  };

  const jump = (height: number) => {
    if (!grounded) return;
    vy = -Math.sqrt(2 * GRAVITY * Math.max(10, height));
    grounded = false;
  };

  // One frame of walking toward x. Small ledges it steps onto; a bigger
  // one it jumps, once: bumped again at the same spot, it's stuck.
  const walk = (dt: number, target: number, speed = WALK_SPEED): "going" | "arrived" | "stuck" => {
    if (!feet) return "stuck";
    // Stacked, the tray is its whole world: it never walks off its ends.
    const home = stacked() ? trayAround(feet) : null;
    if (home) {
      const half = HALF_WIDTH * scale();
      target = Math.min(home.box.right - half, Math.max(home.box.left + half, target));
    }
    if (Math.abs(target - feet.x) < 4) return grounded ? "arrived" : "going";
    const s = scale();
    const dir = sign(target - feet.x);
    const step = Math.min(Math.abs(target - feet.x), speed * dt) * dir;
    // Checked a step-height up, so a small ledge doesn't stop it.
    const lift = grounded ? STEP_UP * s : 1;
    const hit = blocker(bodyBox(feet.x + step, feet.y - lift), bodyBox(feet.x, feet.y - lift));
    stride = 1;
    if (!hit) {
      feet.x += step;
      return "going";
    }
    stride = 0;
    if (!grounded) return "going";
    // A ledge too high to step onto: one jump, if it could clear it.
    const rise = feet.y - hit.box.top;
    if (leap && Math.abs(leap.x - feet.x) < 12 && clock - leap.at < 2.5) return "stuck";
    if (rise > MAX_LEAP * HEIGHT * s) return "stuck";
    leap = { x: feet.x, at: clock };
    jump(rise + 18 * s);
    return "going";
  };

  // Gravity, stepping up and down its footing, landing, head bumps.
  const fall = (dt: number) => {
    if (!feet) return;
    const s = scale();
    if (grounded) {
      // Follows its footing: eases up onto a small ledge, drops off an edge.
      const floor = support(feet.x, feet.y - STEP_UP * s);
      if (floor < feet.y - 0.5) {
        const up = Math.min(feet.y - floor, 260 * dt);
        if (!blocker(bodyBox(feet.x, feet.y - up), bodyBox(feet.x, feet.y), true)) feet.y -= up;
        return;
      }
      if (floor <= feet.y + 1) {
        feet.y = Math.max(feet.y, floor);
        return;
      }
      grounded = false;
      vy = 0;
    }
    vy += GRAVITY * dt;
    const next = feet.y + vy * dt;
    if (vy >= 0) {
      const floor = support(feet.x, feet.y);
      // Coming down against a pill's side, it catches on it rather than sinking in.
      const caught = next < floor && blocker(bodyBox(feet.x, next), bodyBox(feet.x, feet.y));
      if (next >= floor || caught) {
        if (!caught) feet.y = floor;
        vy = 0;
        grounded = true;
        motion.land();
        return;
      }
      feet.y = next;
      return;
    }
    if (blocker(bodyBox(feet.x, next), bodyBox(feet.x, feet.y), true)) {
      vy = 0;
      return;
    }
    feet.y = next;
  };

  const letGo = (velocity?: Point) => {
    if (holding && holding.tray.heldBy(holding.body) === "qull") holding.tray.release(holding.body, velocity);
    holding = null;
    grip = null;
  };

  // Tasks: small state machines, one at a time.
  const pause = (seconds: number, feeling?: QullMood): Task => {
    let left = seconds;
    return {
      name: "pause",
      update: (dt) => {
        yaw = 0;
        shake = 0;
        grip = null;
        mood = feeling;
        arms = undefined;
        left -= dt;
        return left <= 0;
      },
    };
  };
  const puzzled = (kind: "question" | "bang" = "question") => {
    motion.say(kind);
    return pause(2.4, kind === "bang" ? "angry" : "confused");
  };
  // Sits still long enough to doze off.
  const nap = (): Task => ({ ...pause(12), name: "nap" });

  // Can't get where it meant to: puzzled, and after twice, elsewhere. Twice
  // stuck on the same spot means it's wedged: it gets cross and barges out.
  const giveUp = () => {
    strikes += 1;
    letGo();
    const here = feet ? { ...feet } : null;
    stuckTimes = here && stuckAt && Math.hypot(here.x - stuckAt.x, here.y - stuckAt.y) < 20 ? stuckTimes + 1 : 1;
    stuckAt = here;
    if (stuckTimes >= 2) {
      stuckTimes = 0;
      motion.say("bang");
      task = unwedge() ?? puzzled();
      return;
    }
    task = puzzled();
  };

  // Wedged: it takes the pill that's hemming it in (the one on top of it,
  // or the nearest one above its waist), heaves it up and flings it aside.
  // All through its hands' spring, so nothing is ever forced into anything.
  // With nothing to take, it just jumps.
  const unwedge = (): Task | null => {
    if (!feet) return null;
    const s = scale();
    const body = bodyBox(feet.x, feet.y);
    const reach = { left: body.left - 10 * s, right: body.right + 10 * s, top: body.top - 14 * s, bottom: body.bottom - HEIGHT * s * 0.5 };
    const near = pills()
      .filter((pill) => pill.tray.heldBy(pill.body) === null && overlap(reach, pill.box, 0))
      .sort((a, b) => a.box.top - b.box.top);
    const pill = near[0];
    if (!pill) {
      jump(HEIGHT * s * 1.2);
      return pause(1.5, "angry");
    }
    const center = centerOf(pill);
    if (!pill.tray.grab(pill.body, toTray(pill.tray, center), "qull")) return null;
    holding = pill;
    const away = sign(center.x - feet.x) || 1;
    let time = 0;
    return {
      name: "unwedge",
      update: (dt) => {
        if (!feet) return true;
        time += dt;
        mood = "angry";
        const k = Math.min(1, time / 0.7);
        aim(pill, { x: center.x + away * 70 * s * k, y: center.y - 110 * s * k });
        const at = holdPoint(pill);
        grip = at ? handsAt(at) : null;
        if (time > 0.8) {
          letGo({ x: away * 6, y: -3 });
          motion.land();
          task = pause(1.5, "bold");
        }
        return false;
      },
    };
  };

  // From the bottom edge, into a tray: to a clear column (outside the row,
  // or a stretch with no pills), a leap above the pills, then across and
  // down onto them.
  const climb = (): Task | null => {
    const all = trays();
    if (!all.length || !feet) return null;
    const { box } = pickOne(all);
    const s = scale();
    const everything = pills();
    const top = Math.min(box.bottom, ...everything.map((pill) => pill.box.top));
    const half = HALF_WIDTH * s + 4;
    const clear = (x: number) => !everything.some((pill) => x + half > pill.box.left && x - half < pill.box.right);
    const row = rowFloor();
    const from = Math.max(half, (row?.left ?? 0) - half * 2);
    const to = Math.min(window.innerWidth - half, (row?.right ?? window.innerWidth) + half * 2);
    let launch: number | null = null;
    for (let x = from; x <= to; x += 6) {
      if (clear(x) && (launch === null || Math.abs(x - box.left) < Math.abs(launch - box.left))) launch = x;
    }
    if (launch === null) return null;
    const start = launch;
    const landing = box.left + box.width * (0.2 + Math.random() * 0.6);
    let phase: "approach" | "leap" | "in" = "approach";
    return {
      name: "climb",
      update: (dt) => {
        if (!feet) return true;
        mood = phase === "approach" ? "curious" : "happy";
        if (phase === "approach") {
          const state = walk(dt, start);
          if (state === "stuck") {
            giveUp();
            return false;
          }
          if (state === "arrived") {
            jump(feet.y - top + HEIGHT * s * 0.3);
            phase = "leap";
          }
          return false;
        }
        if (phase === "leap") {
          stride = 0;
          if (feet.y < top - 6) phase = "in";
          else if (grounded) return true;
          return false;
        }
        const state = walk(dt, landing);
        return (state !== "going" && grounded) || (grounded && feet.y > top + HEIGHT * s);
      },
    };
  };

  // Off to another tray, over whatever's in the way. Stacked, the trays are
  // floors apart, so it moves across its own tray instead.
  const relocate = (): Task | null => {
    if (!feet) return null;
    const here = feet.x;
    let target: number;
    const home = stacked() ? trayAround(feet) : null;
    if (home) {
      const { box } = home;
      const spots = Array.from({ length: 6 }, (_, i) => box.left + box.width * (0.12 + (0.76 * i) / 5))
        .filter((x) => Math.abs(x - here) > box.width * 0.25)
        .filter(standable);
      if (!spots.length) return null;
      target = pickOne(spots);
    } else {
      const others = trays().filter(({ box }) => here < box.left || here > box.right);
      if (!others.length) return null;
      const { box } = pickOne(others);
      const spots = Array.from({ length: 6 }, (_, i) => box.left + box.width * (0.15 + (0.7 * i) / 5)).filter(standable);
      target = spots.length ? pickOne(spots) : box.left + box.width / 2;
    }
    return {
      name: "relocate",
      update: (dt) => {
        mood = "curious";
        arms = undefined;
        const state = walk(dt, target);
        if (state === "stuck") {
          giveUp();
          return false;
        }
        return state === "arrived";
      },
    };
  };

  // Where to stand beside a pill, on the side it's already on (or `side`).
  const besideOf = (pill: Pill, side?: number) => {
    const s = scale();
    const onLeft = side === undefined ? feet!.x < (pill.box.left + pill.box.right) / 2 : side < 0;
    return {
      x: onLeft ? pill.box.left - HALF_WIDTH * s - 3 : pill.box.right + HALF_WIDTH * s + 3,
      towards: onLeft ? 1 : -1,
    };
  };

  // Pills it could take: near its level (a little above, or a step down),
  // nothing on top, not the one under its feet, and with room beside it to
  // stand.
  const takeable = () => {
    if (!feet) return [];
    const s = scale();
    const footing = { left: feet.x - FOOTPRINT * s, right: feet.x + FOOTPRINT * s, top: feet.y - 2, bottom: feet.y + 4 };
    const all = pills();
    return all.filter((pill) => {
      if (pill.tray.heldBy(pill.body) !== null || overlap(footing, pill.box, 0)) return false;
      if (pill.box.top < feet!.y - 50 * s || pill.box.top > feet!.y + 80 * s) return false;
      if (Math.abs((pill.box.left + pill.box.right) / 2 - feet!.x) > 260 * s) return false;
      const above = { ...pill.box, top: pill.box.top - 12, bottom: pill.box.top };
      if (all.some((other) => other.body !== pill.body && overlap(above, other.box, 0))) return false;
      return standable(besideOf(pill).x);
    });
  };

  // Its two hands on a pill at a point: a little apart along it.
  const handsAt = (point: Point, spread = 9): [Point, Point] => [
    { x: point.x - spread, y: point.y },
    { x: point.x + spread, y: point.y },
  ];
  const holdPoint = (pill: Pill) => {
    const at = pill.tray.holdPoint(pill.body);
    if (!at) return null;
    const origin = trayOrigin(pill.tray);
    return { x: at.x + origin.left, y: at.y + origin.top };
  };
  // Right above its head, where it carries a pill.
  const overhead = (pill: Pill) => {
    const { box } = fresh(pill);
    return { x: feet!.x, y: feet!.y - HEIGHT * scale() - 10 - (box.bottom - box.top) / 2 };
  };
  const aim = (pill: Pill, point: Point) => pill.tray.aim(pill.body, toTray(pill.tray, point));

  // The start of the pill games: walk up to one, take it in both hands and
  // swing it up overhead. Then `then` takes over. If the pill won't come
  // (something's pinning it), it lets go, puzzled.
  const pickUp = (name: string, then: (pill: Pill) => Task): Task | null => {
    const pill = pickOne(takeable());
    if (!pill) return null;
    const spot = besideOf(pill);
    let phase: "approach" | "lift" = "approach";
    let time = 0;
    let from: Point = { x: 0, y: 0 };
    return {
      name,
      update: (dt) => {
        if (!feet) return true;
        if (phase === "approach") {
          mood = "curious";
          arms = undefined;
          const state = walk(dt, spot.x);
          if (state === "stuck") {
            giveUp();
            return false;
          }
          if (state === "arrived") {
            const center = centerOf(pill);
            if (!pill.tray.grab(pill.body, toTray(pill.tray, center), "qull")) return true;
            strikes = 0;
            holding = pill;
            from = center;
            phase = "lift";
            time = 0;
          }
          return false;
        }
        // Lifting: straight up beside it first, then over its head, so the
        // pill never swings into its own body.
        time += dt;
        mood = "bold";
        const k = Math.min(1, time / 0.8);
        const up = overhead(pill);
        const rise = Math.min(1, k * 2);
        const over = Math.max(0, k * 2 - 1);
        aim(pill, { x: from.x + (up.x - from.x) * over, y: from.y + (up.y - from.y) * rise });
        const at = holdPoint(pill);
        grip = at ? handsAt(at) : null;
        if (time > 0.8 && pill.tray.stretch(pill.body) > 40 * scale()) {
          // It won't come.
          giveUp();
          return false;
        }
        if (time > 1.1) task = then(pill);
        return false;
      },
    };
  };

  // Winds up, turns side on to where it throws (one eye), and throws the
  // pill across its tray; then watches it land.
  const toss = (): Task | null =>
    pickUp("toss", (pill) => {
      const tray = trayOrigin(pill.tray);
      const across = sign((tray.left + tray.right) / 2 - feet!.x);
      let time = 0;
      return {
        name: "toss",
        update: (dt) => {
          if (!feet) return true;
          time += dt;
          if (time < 0.55) {
            // Winding up: pill swung back, a little shake.
            mood = "bold";
            const up = overhead(pill);
            aim(pill, { x: up.x - across * 22 * scale(), y: up.y + 6 });
            const at = holdPoint(pill);
            grip = at ? handsAt(at) : null;
            shake = 1.2 * Math.sin(time * 30);
            return false;
          }
          if (holding) {
            yaw = across * 90;
            shake = 0;
            letGo({ x: across * THROW.x, y: THROW.y });
            motion.land();
          }
          mood = "happy";
          lookAt = centerOf(pill);
          if (time > 0.9) yaw = 0;
          if (time > 2.2) task = pause(3 + Math.random() * 2);
          return false;
        },
      };
    });

  // Tries to pull a pill out of its tray. Standing on the tray's edge
  // side, it takes the pill's end in both hands and backs away, side on
  // (one eye). The pill won't leave: it catches, and Qull keeps backing, its
  // arms stretching and stretching until it loses its grip. It stumbles
  // back, looks round at the pill, stomps, and gives up.
  const yank = (): Task | null => {
    if (!feet) return null;
    const all = takeable();
    if (!all.length) return null;
    const pill = pickOne(all);
    const tray = trayOrigin(pill.tray);
    const center = centerOf(pill);
    const out = center.x > (tray.left + tray.right) / 2 ? 1 : -1;
    const spot = besideOf(pill, out);
    if (!standable(spot.x)) return null;
    const s = scale();
    let phase: "approach" | "pull" | "stumble" | "look" | "stomp" | "mope" = "approach";
    let time = 0;
    // Where on its body its hands are while it pulls.
    const hands = () => ({ x: feet!.x - out * (HALF_WIDTH + 6) * s, y: feet!.y - 44 * s });
    return {
      name: "yank",
      update: (dt) => {
        if (!feet) return true;
        time += dt;
        switch (phase) {
          case "approach": {
            mood = "curious";
            const state = walk(dt, spot.x);
            if (state === "stuck") {
              giveUp();
              return false;
            }
            if (state === "arrived") {
              const { box } = fresh(pill);
              const end = { x: out > 0 ? box.right - 8 : box.left + 8, y: (box.top + box.bottom) / 2 };
              if (!pill.tray.grab(pill.body, toTray(pill.tray, end), "qull")) return true;
              strikes = 0;
              holding = pill;
              phase = "pull";
              time = 0;
            }
            return false;
          }
          case "pull": {
            // Backing away, pulling; the pill follows on its arms if it can.
            yaw = -out * 90;
            const step = out * PULL_SPEED * dt;
            if (!blocker(bodyBox(feet.x + step, feet.y - STEP_UP * s), bodyBox(feet.x, feet.y - STEP_UP * s))) {
              feet.x += step;
            }
            stride = 0.6;
            aim(pill, hands());
            const at = holdPoint(pill);
            grip = at ? handsAt(at, 5) : null;
            const stretch = pill.tray.stretch(pill.body) / s;
            mood = stretch > 16 ? "angry" : "bold";
            shake = stretch > 16 ? 1.4 * Math.sin(time * 38) : 0;
            if (stretch > REACH || time > 6) {
              // Its grip gives: the pill stays, Qull tumbles back.
              letGo();
              shake = 0;
              stride = 0;
              motion.bounce(8, 0.4);
              motion.say("bang");
              phase = "stumble";
              time = 0;
            }
            return false;
          }
          case "stumble":
            mood = "surprised";
            yaw = 0;
            walk(dt, feet.x + out * 30 * s, WALK_SPEED * 1.2);
            if (time > 0.45) {
              phase = "look";
              time = 0;
            }
            return false;
          case "look":
            // Looks back at it: huh?
            stride = 0;
            mood = "confused";
            yaw = -out * 90;
            lookAt = centerOf(pill);
            if (time > 0.3 && time - dt <= 0.3) motion.say("question");
            if (time > 1.3) {
              phase = "stomp";
              time = 0;
            }
            return false;
          case "stomp":
            yaw = 0;
            mood = "angry";
            arms = [40, -40];
            shake = 2 * Math.sin(time * 34);
            if (Math.floor(time / 0.32) !== Math.floor((time - dt) / 0.32)) motion.bounce(6, 0.3);
            if (time > 1.3) {
              phase = "mope";
              time = 0;
              shake = 0;
            }
            return false;
          case "mope":
            mood = "sad";
            lookAt = null;
            arms = undefined;
            if (time > 1.6) task = pause(3 + Math.random() * 2);
            return false;
        }
      },
    };
  };

  // Carries the pill over to another and sets it down on top; then watches
  // whether the tower stands.
  const tower = (): Task | null =>
    pickUp("tower", (pill) => {
      const all = pills();
      const bases = all.filter(
        (p) =>
          p.tray === pill.tray &&
          p.body !== pill.body &&
          !all.some((o) => o.body !== p.body && overlap({ ...p.box, top: p.box.top - 12, bottom: p.box.top }, o.box, 0))
      );
      const base = pickOne(bases);
      if (!base) {
        letGo();
        return puzzled();
      }
      const s = scale();
      const baseCenter = centerOf(base);
      const nextTo = standable(baseCenter.x - HALF_WIDTH * s * 2.2)
        ? baseCenter.x - HALF_WIDTH * s * 2.2
        : baseCenter.x + HALF_WIDTH * s * 2.2;
      let phase: "carry" | "lower" | "watch" = "carry";
      let time = 0;
      return {
        name: "tower",
        update: (dt) => {
          if (!feet) return true;
          time += dt;
          if (phase === "carry") {
            mood = "curious";
            aim(pill, overhead(pill));
            const at = holdPoint(pill);
            grip = at ? handsAt(at) : null;
            const state = walk(dt, nextTo, WALK_SPEED * 0.7);
            if (state === "stuck" || time > 7) {
              giveUp();
              return false;
            }
            if (state === "arrived") {
              phase = "lower";
              time = 0;
            }
            return false;
          }
          if (phase === "lower") {
            // Reaches over and lowers it onto the other.
            const target = centerOf(base);
            const k = Math.min(1, time / 0.9);
            const up = overhead(pill);
            const { box } = fresh(pill);
            const down = { x: target.x, y: target.box.top - (box.bottom - box.top) / 2 };
            aim(pill, { x: up.x + (down.x - up.x) * k, y: up.y + (down.y - up.y) * k });
            const at = holdPoint(pill);
            grip = at ? handsAt(at) : null;
            if (time > 1.2) {
              letGo();
              phase = "watch";
              time = 0;
            }
            return false;
          }
          const top = centerOf(pill);
          const under = centerOf(base);
          lookAt = { x: top.x, y: top.y };
          if (time < 1.6) return false;
          lookAt = null;
          const stood =
            top.box.bottom <= under.box.top + 6 && Math.abs(top.x - under.x) < (under.box.right - under.box.left) / 2;
          if (stood) {
            motion.cheer();
            task = pause(3, "happy");
          } else {
            task = puzzled();
          }
          return false;
        },
      };
    });

  // Something to do, now and then: a clear attempt at something, a change
  // of tray, or a while just watching.
  const nextTask = (): Task => {
    if (!feet) return pause(1);
    const floor = rowFloor();
    const isStack = stacked();
    const inTray = isStack ? trayAround(feet) !== null : floor !== null && feet.y <= floor.y + 2;
    const roll = Math.random();
    // Stacked, it's only ever outside a tray on its way to being dropped
    // back into one.
    if (!inTray && isStack) return pause(1);
    if (!inTray) {
      if (roll < 0.7) return climb() ?? pause(3);
      return pause(3 + Math.random() * 3);
    }
    if (roll < 0.03) return nap();
    if (roll < 0.13) return pause(3 + Math.random() * 3);
    if (strikes >= 2 || roll < 0.35 || !takeable().length) {
      strikes = 0;
      return relocate() ?? pause(3);
    }
    const options = [toss, toss, toss, yank, yank, yank, tower];
    for (let i = 0; i < 4; i++) {
      const made = pickOne(options)();
      if (made) return made;
    }
    return relocate() ?? pause(3);
  };

  // Keeps its solid body in whichever tray it's in, so pills rest on it and
  // never pass through it.
  const syncBodies = () => {
    if (!feet) return;
    const box = bodyBox(feet.x, feet.y);
    for (const { tray, box: area } of trays()) tray.setQull(inTrayArea(box, area) ? localBody(box, area) : null);
  };

  const unsubscribe = onUserGrab((body) => {
    // The pointer snatched the pill it held: that's rude.
    if (holding?.body === body) {
      holding = null;
      grip = null;
      task = puzzled("bang");
    }
  });

  // Its tray scrolls with the section's content, so it has to move with it.
  const scroller = scope.closest<HTMLElement>(".section-overlay-content");
  let scrolledTo = scroller?.scrollTop ?? 0;
  // Stacked: how long it's been off screen, and a drop-in waiting to start.
  let goneFor = 0;
  let dropIn = false;

  // Run by useQullMotion each frame, once the scope is placed: what this
  // reads off the scope (its feet relative to home) and the pose it drives
  // are then drawn on the same frame. On a clock of its own it ran a frame
  // ahead of the placement, and Qull lurched by however far the content had
  // scrolled in between.
  const frame = (dt: number) => {
    clock += dt;
    const scrollTop = scroller?.scrollTop ?? 0;
    const scrolled = scrollTop - scrolledTo;
    scrolledTo = scrollTop;
    // The screen's bottom edge doesn't scroll, so neither does Qull while it
    // stands there; anywhere else it rides the content.
    onScreen = !feet || (grounded && !stacked() && feet.y >= window.innerHeight - 1.5);
    if (scrolled) {
      if (feet && !onScreen) feet.y -= scrolled;
      if (stuckAt) stuckAt.y -= scrolled;
    }
    // Placed at the tray in view (stackPlacement) and posed at its spot
    // last frame, so the drop lands there.
    if (dropIn && !motion.busy()) {
      dropIn = false;
      motion.enter("drop");
      return;
    }
    if (motion.busy()) {
      // Arriving or playing a click act: it drops what it was doing and
      // keeps still; its own things wait until it's been quiet a while.
      letGo();
      task = null;
      if (feet) motion.drive({ pos: toUnits(feet) });
      return;
    }
    if (!feet) feet = homeFeet();
    // Stacked, the visitor scrolled its tray away: it follows them, dropping
    // in from the top onto the tray they're looking at.
    if (stacked()) {
      const gone = feet.y < 0 || feet.y - HEIGHT * scale() > window.innerHeight;
      goneFor = gone ? goneFor + dt : 0;
      if (goneFor > GONE_FOR) {
        goneFor = 0;
        letGo();
        task = null;
        feet = null;
        vy = 0;
        grounded = true;
        motion.stir();
        motion.drive({ pos: { x: 0, y: 0 } });
        dropIn = true;
        return;
      }
    }
    if (motion.asleep()) {
      // Dozing: it lets go and settles wherever it is (never mid-air).
      letGo();
      task = null;
      fall(dt);
      syncBodies();
      motion.drive({ pos: toUnits(feet) });
      return;
    }
    // A new attempt only once nothing else is going on.
    if (!task && motion.quiet()) {
      yaw = 0;
      shake = 0;
      lookAt = null;
      task = nextTask();
    }
    stride = 0;
    const before = { ...feet };
    if (task) {
      // Doing things keeps it awake; a nap is just a long pause.
      if (task.name !== "nap") motion.stir();
      if (task.update(dt)) task = null;
    } else {
      mood = undefined;
      arms = undefined;
      yaw = 0;
      grip = null;
    }
    fall(dt);
    // Wanting to walk and getting nowhere for a while: a hop straight up
    // to get out of wherever it's wedged, then something else.
    const wantsToMove = stride > 0;
    trapped = wantsToMove && grounded && Math.hypot(feet.x - before.x, feet.y - before.y) < 0.05 ? trapped + dt : 0;
    if (trapped > 1.2) {
      trapped = 0;
      letGo();
      jump(HEIGHT * scale() * 1.2);
      task = puzzled();
    }
    syncBodies();
    const idle = !task || task.name === "pause" || task.name === "nap";
    motion.drive({
      pos: toUnits(feet),
      yaw: idle ? 0 : yaw,
      mood,
      arms,
      look: lookAt ? toFigure(lookAt.x, lookAt.y) : undefined,
      shake,
      stride: grounded ? stride : 0,
      busy: !idle,
      grip: grip ? [toFigure(grip[0].x, grip[0].y), toFigure(grip[1].x, grip[1].y)] : undefined,
    });
  };
  return {
    frame,
    stop: () => {
      onScreen = true;
      unsubscribe();
      letGo();
      for (const tray of getTrays()) tray.setQull(null);
      motion.drive(null);
    },
  };
}
