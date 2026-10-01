"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Matter from "matter-js";
import { HandGrab } from "lucide-react";

import { Hint, markHintUsed } from "../hint";
import { useMediaQuery } from "../use-media-query";
import { useReducedMotion } from "../use-reduced-motion";
import { createTrayWorld, STEP_MS, type TrayWorld } from "./stack-physics";
import { notifyUserGrab, registerTray } from "./stack-trays";

type Variant = "solid" | "tint" | "outline";

type StackGroup = { label: string; variant: Variant; tools: string[] };

// Below these (px and rad per physics step) a pill counts as settled.
const SETTLED_SPEED = 0.05;
const SETTLED_SPIN = 0.005;

const STACK_GROUPS: StackGroup[] = [
  {
    label: "Design & frontend",
    variant: "solid",
    tools: ["Figma", "React", "Next.js", "TypeScript", "Tailwind", "shadcn/ui", "GSAP", "Motion", "Lenis", "Vite"],
  },
  {
    label: "Backend & data",
    variant: "tint",
    tools: ["Node.js", "Express", "Python", "PostgreSQL", "MongoDB", "Supabase", "Firebase"],
  },
  {
    label: "Infrastructure & DevOps",
    variant: "outline",
    tools: ["GCP", "AWS", "Terraform", "Kubernetes", "Docker", "Harness", "GitHub Actions", "Vercel", "Linux"],
  },
];

// Bubble-menu entrance, then falling-text physics. Each pill is its own
// chamfered-rectangle body, so what collides is exactly the pill you see.
const POP_EASE = "back.out(1.5)";
const POP_DURATION = 0.5;
const POP_STAGGER = 0.06;
const COLUMN_OFFSET = 0.18;
const HOLD_BEFORE_FALL = 0.25;
const MAX_TILT_DEG = 5;
// Pills drop one at a time, bottom row first, so they land on each other in
// order instead of colliding mid-air.
const RELEASE_STAGGER_MS = 70;
// Catching up after a slow frame, but never by much.
const MAX_STEPS_PER_FRAME = 6;

function tiltFor(index: number) {
  // Deterministic spread of tilts so the entrance reads organic but stable.
  return (((index * 37) % 17) / 16 - 0.5) * 2 * MAX_TILT_DEG;
}

function StackColumn({
  group,
  column,
  revealed,
  reducedMotion,
}: {
  group: StackGroup;
  column: number;
  revealed: boolean;
  reducedMotion: boolean;
}) {
  const trayRef = useRef<HTMLUListElement>(null);
  const pillRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const tray = trayRef.current;
    const pills = pillRefs.current.filter((pill): pill is HTMLLIElement => Boolean(pill));
    if (!tray || !pills.length || reducedMotion) return;

    const labels = pills.map((pill) => pill.firstElementChild as HTMLElement);

    if (!revealed) {
      gsap.set(pills, { scale: 0 });
      gsap.set(labels, { y: 24, autoAlpha: 0 });
      return;
    }

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let world: TrayWorld | null = null;
    let sizes: { w: number; h: number }[] = [];
    let raf: number | null = null;
    let last = 0;
    let carry = 0;
    let resizeTimer = 0;
    let releaseTimers: number[] = [];
    let unregister: (() => void) | null = null;
    // The pointer's hold: which pill, and where on it it was grabbed.
    let drag: { body: Matter.Body; id: number } | null = null;

    const resetToFlow = () => {
      for (const pill of pills) {
        pill.style.position = "";
        pill.style.left = "";
        pill.style.top = "";
        pill.style.width = "";
        pill.style.transform = "";
        pill.classList.remove("is-flipped");
      }
    };

    const renderPills = () => {
      world?.bodies.forEach((body, index) => {
        const { w, h } = sizes[index];
        pills[index].style.transform =
          `translate(${body.position.x - w / 2}px, ${body.position.y - h / 2}px) rotate(${body.angle}rad)`;
      });
    };

    // A pill can come to rest upside down, and its shape reads the same
    // either way; only the label shows it. Turn the label, not the body, so
    // the physics stays untouched. Checked per pill as each one settles,
    // since Qull playing in a tray keeps the tray as a whole from resting.
    const uprightLabels = (onlySettled = false) => {
      world?.bodies.forEach((body, index) => {
        if (onlySettled && (body.speed > SETTLED_SPEED || body.angularSpeed > SETTLED_SPIN)) return;
        const turn = ((body.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        pills[index].classList.toggle("is-flipped", turn > Math.PI / 2 && turn < (3 * Math.PI) / 2);
      });
    };

    const loop = (now: number) => {
      if (!world) return;
      carry += Math.min(now - last, STEP_MS * MAX_STEPS_PER_FRAME);
      last = now;
      while (carry >= STEP_MS) {
        world.step();
        carry -= STEP_MS;
      }
      renderPills();
      uprightLabels(true);
      // At rest and nothing held: stop until something moves.
      if (!drag && world.resting()) {
        uprightLabels();
        raf = null;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const runLoop = () => {
      if (!world || raf !== null) return;
      last = performance.now();
      carry = 0;
      raf = requestAnimationFrame(loop);
    };

    const teardownPhysics = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      releaseTimers.forEach((timer) => window.clearTimeout(timer));
      releaseTimers = [];
      unregister?.();
      unregister = null;
      drag = null;
      world?.destroy();
      world = null;
    };

    const startPhysics = () => {
      const width = tray.clientWidth;
      const height = tray.clientHeight;
      if (width <= 0 || height <= 0) return;

      // Read every layout box before moving anything out of the flow.
      const boxes = pills.map((pill, index) => ({
        x: pill.offsetLeft + pill.offsetWidth / 2,
        y: pill.offsetTop + pill.offsetHeight / 2,
        w: pill.offsetWidth,
        h: pill.offsetHeight,
        angle: (tiltFor(index + column * 5) * Math.PI) / 180,
      }));
      sizes = boxes.map(({ w, h }) => ({ w, h }));
      const created = createTrayWorld(width, height, boxes);
      world = created;

      const order = created.bodies
        .map((body, index) => ({ body, y: boxes[index].y, x: boxes[index].x }))
        .sort((a, b) => b.y - a.y || a.x - b.x);
      order.forEach(({ body }, rank) => {
        releaseTimers.push(
          window.setTimeout(() => {
            created.drop(body, (Math.random() - 0.5) * 0.6);
            runLoop();
          }, rank * RELEASE_STAGGER_MS),
        );
      });

      pills.forEach((pill, index) => {
        pill.style.position = "absolute";
        pill.style.left = "0";
        pill.style.top = "0";
        pill.style.width = `${boxes[index].w}px`;
      });

      // Qull reads and handles the pills through the same checked moves.
      unregister = registerTray({
        element: tray,
        pills: () => created.bodies.map((body, index) => ({ body, element: pills[index] })),
        grab: (body, point, holder) => {
          const ok = created.grab(body, point, holder);
          runLoop();
          return ok;
        },
        aim: (body, point) => {
          created.aim(body, point);
          runLoop();
        },
        release: (body, velocity) => {
          created.release(body, velocity);
          runLoop();
        },
        heldBy: created.heldBy,
        holdPoint: created.holdPoint,
        stretch: created.stretch,
        qullFits: created.qullFits,
        setQull: (rect) => {
          created.setQull(rect);
          runLoop();
        },
      });
      runLoop();
    };

    const pointIn = (event: PointerEvent) => {
      const rect = tray.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    // Grabbing: the pill under the pointer, held on a spring at the point
    // it was taken, like Matter's mouse constraint.
    const onPointerDown = (event: PointerEvent) => {
      if (!world || !finePointer || event.button !== 0) return;
      const point = pointIn(event);
      const body = Matter.Query.point(world.bodies, point)[0];
      if (!body) return;
      notifyUserGrab(body);
      markHintUsed("stack");
      world.grab(body, point, "user");
      runLoop();
      drag = { body, id: event.pointerId };
      tray.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      world?.aim(drag.body, pointIn(event));
      runLoop();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const body = drag.body;
      drag = null;
      world?.release(body);
      runLoop();
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        teardownPhysics();
        resetToFlow();
        startPhysics();
      }, 200);
    };

    // Entrance: each pill scales in with a slight overshoot and a tilt, its
    // label rising into place; then the column is handed to gravity.
    gsap.killTweensOf([...pills, ...labels]);
    gsap.set(pills, { scale: 0, transformOrigin: "50% 50%" });
    gsap.set(labels, { y: 24, autoAlpha: 0 });
    const entrance = gsap.timeline({
      delay: column * COLUMN_OFFSET,
      onComplete: () => {
        gsap.set(pills, { clearProps: "transform" });
        startPhysics();
      },
    });
    pills.forEach((pill, index) => {
      const at = Math.max(index * POP_STAGGER + gsap.utils.random(-0.02, 0.02), 0);
      entrance.to(pill, { scale: 1, rotation: tiltFor(index + column * 5), duration: POP_DURATION, ease: POP_EASE }, at);
      entrance.to(labels[index], { y: 0, autoAlpha: 1, duration: POP_DURATION, ease: "power3.out" }, at + 0.05);
    });
    entrance.to({}, { duration: HOLD_BEFORE_FALL });

    tray.addEventListener("pointerdown", onPointerDown);
    tray.addEventListener("pointermove", onPointerMove);
    tray.addEventListener("pointerup", onPointerUp);
    tray.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", onResize);

    return () => {
      entrance.kill();
      window.clearTimeout(resizeTimer);
      tray.removeEventListener("pointerdown", onPointerDown);
      tray.removeEventListener("pointermove", onPointerMove);
      tray.removeEventListener("pointerup", onPointerUp);
      tray.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
      teardownPhysics();
    };
  }, [revealed, reducedMotion, column]);

  return (
    <section className="stack-column">
      <h3 className="stack-column-title">{group.label}</h3>
      <ul ref={trayRef} className={`stack-tray${reducedMotion ? " is-static" : ""}`}>
        {group.tools.map((tool, index) => (
          <li
            key={tool}
            ref={(el) => {
              pillRefs.current[index] = el;
            }}
            className={`stack-pill stack-pill--${group.variant}`}
          >
            <span className="stack-pill-label">{tool}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// What the drag hint points at: the topmost pill of the first tray, the
// one most obviously free to take.
function pillToTake() {
  const pills = document.querySelectorAll<HTMLElement>(".section-overlay-content .stack-column:first-of-type .stack-pill");
  let best: DOMRect | null = null;
  pills.forEach((pill) => {
    const rect = pill.getBoundingClientRect();
    if (rect.width > 0 && (!best || rect.top < best.top)) best = rect;
  });
  return best;
}

export function StackSection({ revealed = false }: { revealed?: boolean }) {
  const reducedMotion = useReducedMotion();
  // Pills are only draggable under a mouse (see onPointerDown).
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");

  return (
    <div className="section-stack">
      <Hint
        id="stack"
        label="Pick one up"
        gesture="drag"
        icon={HandGrab}
        anchor={pillToTake}
        placement="above"
        gap={10}
        tone="panel"
        enabled={revealed && finePointer && !reducedMotion}
        delay={2200}
        duration={6000}
      />
      {STACK_GROUPS.map((group, column) => (
        <StackColumn
          key={group.label}
          group={group}
          column={column}
          revealed={revealed}
          reducedMotion={reducedMotion}
        />
      ))}
    </div>
  );
}
