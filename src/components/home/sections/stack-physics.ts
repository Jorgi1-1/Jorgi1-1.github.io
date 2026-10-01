import Matter from "matter-js";

import type { StackHolder } from "./stack-trays";

/**
 * One Stack tray's physics, without the DOM, in the spirit of Fancy
 * Components' Gravity: plain Matter.js bodies in a walled box, light
 * friction, a little bounce, and hands (the pointer's, or Qull's) that hold
 * a pill by a springy constraint at the point they took it, so it swings,
 * turns and keeps its momentum when let go. On top of that, what keeps it
 * honest: small fixed steps, extra solver passes and a speed cap, so a pill
 * never skips through another; and Qull as a solid body the pills can't
 * sink into. The column component renders it; tests drive it directly.
 */

const BODY_OPTIONS: Matter.IChamferableBodyDefinition = {
  restitution: 0.1,
  friction: 0.2,
  frictionStatic: 0.4,
  frictionAir: 0.012,
  density: 0.001,
  slop: 0.02,
};
const GRAVITY = 1;
// Small fixed steps and more solver passes: stacks stay crisp and a fast
// pill can't skip through a thin one between checks.
export const STEP_MS = 1000 / 120;
const POSITION_ITERATIONS = 10;
const VELOCITY_ITERATIONS = 8;
// Speed caps (px per 60 fps frame): above anything that looks natural,
// low enough that no pill travels more than a few px per physics step, so
// an impact never sinks one into another. A pill in hand is kept slower.
const MAX_SPEED = 12;
const MAX_HELD_SPEED = 8;
// Hands: how springy each grip is (the pointer's, like Matter's mouse).
const GRIP = {
  user: { stiffness: 0.2, damping: 0.1 },
  qull: { stiffness: 0.2, damping: 0.1 },
} as const;
// A hand leads the pill it holds by at most this much (px): it drags just
// as loosely, but never with the force to drive it into another pill.
const LEAD = 30;
// Pressed this deep (px) into something, a hand stops pulling.
const GIVE = 1.5;
// Penetration below this (px) is resting contact, not a collision.
const CONTACT_SLOP = 0.35;
// Whatever the solver leaves deeper than this (px) after a step, a final
// pass pushes straight apart, so a hard shove never shows as one pill in
// another.
const MAX_SINK = 1.2;

type PillBox = { x: number; y: number; w: number; h: number; angle: number };
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

export function createTrayWorld(width: number, height: number, boxes: PillBox[]) {
  const engine = Matter.Engine.create({
    positionIterations: POSITION_ITERATIONS,
    velocityIterations: VELOCITY_ITERATIONS,
  });
  engine.gravity.y = GRAVITY;

  // Thick walls, so nothing is ever pushed out through one.
  const wall = { isStatic: true, friction: 0.3 };
  const walls = [
    Matter.Bodies.rectangle(width / 2, height + 100, width * 3, 200, wall),
    Matter.Bodies.rectangle(-100, height / 2, 200, height * 6, wall),
    Matter.Bodies.rectangle(width + 100, height / 2, 200, height * 6, wall),
    Matter.Bodies.rectangle(width / 2, -height * 1.5 - 100, width * 3, 200, wall),
  ];

  const bodies = boxes.map((box) => {
    const body = Matter.Bodies.rectangle(box.x, box.y, box.w, box.h, {
      ...BODY_OPTIONS,
      chamfer: { radius: box.h / 2 },
    });
    Matter.Body.setAngle(body, box.angle);
    // Held in place until its turn to drop.
    Matter.Body.setStatic(body, true);
    return body;
  });
  Matter.World.add(engine.world, [...walls, ...bodies]);

  const waiting = new Set(bodies);
  // Each held pill: who holds it, the spring, and where the hand wants it.
  const held = new Map<Matter.Body, { holder: StackHolder; constraint: Matter.Constraint; target: Point }>();
  let qull: Matter.Body | null = null;
  let qullSize = { w: 0, h: 0 };

  const solids = () => [...walls, ...bodies, ...(qull ? [qull] : [])];

  // How deep `body` sits in each thing it touches.
  const depths = (body: Matter.Body) => {
    const found = new Map<Matter.Body, number>();
    for (const other of solids()) {
      if (other === body || !Matter.Bounds.overlaps(body.bounds, other.bounds)) continue;
      const collision = Matter.Collision.collides(body, other);
      if (collision?.collided) found.set(other, collision.depth);
    }
    return found;
  };

  const release = (body: Matter.Body, velocity?: Point) => {
    const grip = held.get(body);
    if (!grip) return;
    held.delete(body);
    Matter.World.remove(engine.world, grip.constraint);
    if (velocity) Matter.Body.setVelocity(body, velocity);
  };

  // Takes hold of a pill at `point` (tray px). The pointer always wins: it
  // takes a pill out of Qull's hands, and Qull can't take one from it.
  const grab = (body: Matter.Body, point: Point, holder: StackHolder) => {
    const current = held.get(body);
    if (current?.holder === "user" && holder === "qull") return false;
    if (current) release(body);
    if (waiting.delete(body)) Matter.Body.setStatic(body, false);
    // Matter turns pointB with the body, so the hand keeps its spot on it.
    const constraint = Matter.Constraint.create({
      pointA: { ...point },
      bodyB: body,
      pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
      length: 0,
      ...GRIP[holder],
    });
    Matter.World.add(engine.world, constraint);
    held.set(body, { holder, constraint, target: { ...point } });
    return true;
  };

  // Moves the hand holding a pill (tray px).
  const aim = (body: Matter.Body, point: Point) => {
    const grip = held.get(body);
    if (grip) grip.target = { ...point };
  };

  // Where the hand holds the pill, on the pill (tray px).
  const holdPoint = (body: Matter.Body) => {
    const grip = held.get(body);
    if (!grip) return null;
    return { x: body.position.x + grip.constraint.pointB.x, y: body.position.y + grip.constraint.pointB.y };
  };

  // How far the pill has been left behind by the hand holding it.
  const stretch = (body: Matter.Body) => {
    const grip = held.get(body);
    const at = holdPoint(body);
    if (!grip || !at) return 0;
    return Math.hypot(at.x - grip.target.x, at.y - grip.target.y);
  };

  // Lets a waiting pill fall for the first time.
  const drop = (body: Matter.Body, nudge: number) => {
    if (!waiting.delete(body) || held.has(body)) return;
    Matter.Body.setStatic(body, false);
    Matter.Body.setVelocity(body, { x: nudge, y: 0 });
  };

  const qullShape = (rect: Rect) =>
    Matter.Bodies.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h, {
      isStatic: true,
      chamfer: { radius: Math.min(rect.w, rect.h) * 0.45 },
    });

  // Whether Qull's body could be at `rect` without pressing any deeper into
  // a pill than it does where it is: the exact check behind its moves.
  // Loose pills resting on its head don't stop it moving sideways or down:
  // it shrugs them off (the step below pushes them out). Going up,
  // everything counts.
  const qullFits = (rect: Rect, rising = false) => {
    const probe = qullShape(rect);
    const now = new Map<Matter.Body, number>();
    if (qull) {
      for (const body of bodies) {
        const collision = Matter.Bounds.overlaps(body.bounds, qull.bounds) ? Matter.Collision.collides(qull, body) : null;
        if (collision?.collided) now.set(body, collision.depth);
      }
    }
    for (const body of bodies) {
      if (!Matter.Bounds.overlaps(body.bounds, probe.bounds)) continue;
      if (!rising && !held.has(body) && body.position.y < rect.y) continue;
      const collision = Matter.Collision.collides(probe, body);
      if (collision?.collided && collision.depth > Math.max(CONTACT_SLOP, (now.get(body) ?? 0) + 0.05)) return false;
    }
    return true;
  };

  // Qull stands in this tray as a solid body the pills rest on and can't
  // pass through; its own moves are checked against the pills first.
  const setQull = (rect: Rect | null) => {
    if (!rect) {
      if (qull) {
        Matter.World.remove(engine.world, qull);
        qull = null;
      }
      return;
    }
    if (!qull || Math.abs(qullSize.w - rect.w) > 2 || Math.abs(qullSize.h - rect.h) > 2) {
      if (qull) Matter.World.remove(engine.world, qull);
      qull = qullShape(rect);
      qull.label = "qull";
      qull.friction = 0.4;
      qullSize = { w: rect.w, h: rect.h };
      Matter.World.add(engine.world, qull);
      return;
    }
    Matter.Body.setPosition(qull, { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
  };

  // One fixed physics step.
  const step = () => {
    // Each spring pulls toward its hand, but from no further than LEAD
    // away; and a hand gives (stops pulling) while its pill is pressed into
    // something, so it can't be forced in.
    for (const [body, grip] of held) {
      const at = holdPoint(body);
      if (!at) continue;
      const dx = grip.target.x - at.x;
      const dy = grip.target.y - at.y;
      const d = Math.hypot(dx, dy);
      const pressed = [...depths(body).values()].some((depth) => depth > GIVE);
      const k = pressed ? 0 : d > LEAD ? LEAD / d : 1;
      grip.constraint.pointA = { x: at.x + dx * k, y: at.y + dy * k };
    }
    Matter.Engine.update(engine, STEP_MS);
    for (const body of bodies) {
      if (body.isStatic) continue;
      const cap = held.has(body) ? MAX_HELD_SPEED : MAX_SPEED;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > cap) {
        Matter.Body.setVelocity(body, { x: (body.velocity.x / speed) * cap, y: (body.velocity.y / speed) * cap });
      }
    }
    // A last word on overlaps: anything left sunk into something else is
    // pushed straight out. A held pill yields first (it's the one being
    // forced); two loose ones share it; walls and Qull don't move.
    for (let pass = 0; pass < 2; pass++) {
      for (const body of bodies) {
        if (body.isStatic) continue;
        for (const [other, depth] of depths(body)) {
          if (depth <= MAX_SINK || other.label === "qull") continue;
          const collision = Matter.Collision.collides(body, other);
          if (!collision?.collided) continue;
          const away = { x: body.position.x - other.position.x, y: body.position.y - other.position.y };
          const facing = collision.normal.x * away.x + collision.normal.y * away.y < 0 ? -1 : 1;
          const push = collision.depth - MAX_SINK * 0.5;
          const loose = !other.isStatic && bodies.includes(other) && !held.has(other);
          const share = other.isStatic || !bodies.includes(other) || held.has(body) ? 1 : loose ? 0.5 : 0;
          if (share > 0) {
            Matter.Body.translate(body, {
              x: collision.normal.x * facing * push * share,
              y: collision.normal.y * facing * push * share,
            });
          }
          if (share < 1 && !other.isStatic) {
            Matter.Body.translate(other, {
              x: -collision.normal.x * facing * push * (1 - share),
              y: -collision.normal.y * facing * push * (1 - share),
            });
          }
        }
      }
    }
    // Qull moves by being placed, not pushed, so the solver can let a pill
    // sit in it: nudge any loose one straight back out.
    if (qull) {
      for (const body of bodies) {
        if (body.isStatic || !Matter.Bounds.overlaps(body.bounds, qull.bounds)) continue;
        const collision = Matter.Collision.collides(qull, body);
        if (!collision?.collided || collision.depth <= CONTACT_SLOP) continue;
        const away = { x: body.position.x - qull.position.x, y: body.position.y - qull.position.y };
        const facing = collision.normal.x * away.x + collision.normal.y * away.y < 0 ? -1 : 1;
        const push = collision.depth - CONTACT_SLOP;
        Matter.Body.translate(body, { x: collision.normal.x * facing * push, y: collision.normal.y * facing * push });
      }
    }
  };

  // Everything dropped, nothing held, nothing moving.
  const resting = () =>
    !held.size &&
    !waiting.size &&
    bodies.every((body) => Math.hypot(body.velocity.x, body.velocity.y) < 0.05 && Math.abs(body.angularVelocity) < 0.002);

  const destroy = () => {
    Matter.World.clear(engine.world, false);
    Matter.Engine.clear(engine);
  };

  return {
    bodies,
    depths,
    grab,
    aim,
    release,
    stretch,
    holdPoint,
    heldBy: (body: Matter.Body) => held.get(body)?.holder ?? null,
    drop,
    setQull,
    qullFits,
    step,
    resting,
    destroy,
  };
}

export type TrayWorld = ReturnType<typeof createTrayWorld>;
