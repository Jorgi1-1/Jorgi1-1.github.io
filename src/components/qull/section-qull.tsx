"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import type { SectionId } from "@/components/home/section-config";
import { QULL_REST_POSE, QULL_SPARK_PATH, QULL_VIEWBOX, type QullEntrance, type QullMotion } from "./qull-motion";
import { figurePoint, placeScope, useQullMotion, type QullMotionOptions, type QullPlacement } from "./use-qull-motion";
import { stackOnScreen, stackPlacement, watchStack } from "./stack-qull";
import "./section-qull.css";

// After the body's neon power-on (0.85s) and the lists' stagger have run.
const ENTER_DELAY_MS = 1300;

// Viewbox units from its base (y = 95) down to the bottom of its feet,
// standing and hanging (feet dangle lower).
const FEET_BELOW = { stand: 4.25, hang: 12 };

const units = (size: number, n: number) => (n * size) / 108;
const rectOf = (selector: string) => {
  const el = document.querySelector<HTMLElement>(`.section-overlay-content ${selector}`);
  const rect = el?.getBoundingClientRect();
  return rect && rect.width > 0 ? rect : null;
};

// Standing on the screen's bottom edge, bottom-right.
function corner(size: number): QullPlacement {
  const margin = Math.min(96, Math.max(16, window.innerWidth * 0.07));
  return {
    x: window.innerWidth - margin - size / 2,
    y: window.innerHeight - units(size, FEET_BELOW.stand),
    mode: "stand",
    screen: true,
  };
}

type Stage = {
  entrance: QullEntrance;
  locate: (size: number) => QullPlacement | null;
  watch?: QullMotionOptions["watch"];
};

// Each screen has its own entrance, its own spot and its own posture.
const STAGES: Record<SectionId, Stage> = {
  // Drops onto the project preview and stands on its top edge, strolling
  // along it now and then. When the selected project changes it hops, says
  // "!" and looks into the window at the new one.
  work: {
    entrance: "drop",
    locate: (size) => {
      const preview = rectOf(".section-work-preview");
      if (!preview) return corner(size);
      return {
        x: preview.left + preview.width * 0.78,
        y: preview.top - units(size, FEET_BELOW.stand) + 1,
        mode: "stand",
        track: [preview.left + preview.width * 0.15, preview.right - preview.width * 0.12],
      };
    },
    watch: (motion, scope) => {
      const list = document.querySelector(".section-overlay-content .section-work-list");
      if (!list) return;
      const observer = new MutationObserver(() => {
        const preview = rectOf(".section-work-preview-stage");
        const look = preview ? figurePoint(scope, preview.left + preview.width / 2, preview.top + preview.height / 2) : undefined;
        motion.react({ mood: "curious", s: 1.8, look, say: "bang", hop: true });
      });
      observer.observe(list, { subtree: true, attributes: true, attributeFilter: ["data-active"] });
      return () => observer.disconnect();
    },
  },
  // Hangs from its spark on the right, feet just below the actions row,
  // and floats off now and then to look at things on the page.
  contact: {
    entrance: "fly",
    locate: (size) => {
      // Its line: just under the actions (LinkedIn, email), where the
      // body's last row ends.
      const actions = rectOf(".section-contact-actions");
      const headline = rectOf(".section-contact-headline");
      if (!actions) return corner(size);
      const line = actions.bottom + 20;
      const lift = (top: number) => top - 10 - units(size, FEET_BELOW.hang);
      const x = Math.min(
        window.innerWidth - size * 0.7,
        Math.max(window.innerWidth * 0.78, (headline?.right ?? 0) + size * 0.8)
      );
      const spots = [".section-contact-cta", ".section-contact-email", ".section-contact-headline"]
        .map((selector) => rectOf(selector))
        .filter((rect): rect is DOMRect => rect !== null)
        .map((rect) => ({ x: rect.left + rect.width * 0.7, y: lift(rect.top) }));
      return { x, y: lift(line), mode: "hang", spots };
    },
  },
  // Draws itself standing on the top line of the facts and strolls along
  // it. Each fact gets its own reaction when the pointer reaches it: glad
  // to be home, puzzled by languages, an idea about its focus.
  about: {
    entrance: "draw",
    locate: (size) => {
      const row = rectOf(".section-facts-row");
      if (!row) return corner(size);
      return {
        x: row.left + row.width * 0.8,
        y: row.top - units(size, FEET_BELOW.stand) + 1,
        mode: "stand",
        track: [row.left + row.width * 0.12, row.right - row.width * 0.1],
      };
    },
    watch: (motion, scope) => {
      const rows = [...document.querySelectorAll<HTMLElement>(".section-overlay-content .section-facts-row")];
      const reactions: Parameters<QullMotion["react"]>[0][] = [
        { mood: "happy", s: 2, hop: true },
        { mood: "confused", s: 2, say: "question" },
        { mood: "idea", s: 2.2, say: "bang" },
      ];
      let current = -1;
      const onOver = (event: PointerEvent) => {
        const index = rows.findIndex((row) => row.contains(event.target as Node));
        if (index === current) return;
        current = index;
        if (index < 0 || !reactions[index]) return;
        const rect = rows[index].getBoundingClientRect();
        const look = figurePoint(scope, rect.left + rect.width * 0.3, rect.top + rect.height / 2);
        motion.react({ ...reactions[index], look });
      };
      document.addEventListener("pointerover", onOver);
      return () => document.removeEventListener("pointerover", onOver);
    },
  },
  // Hops in along the bottom edge, then goes to play with the pills. On
  // narrow screens, where the trays stack, it lives in the tray in view.
  stack: {
    entrance: "walk",
    // Up in a tray, its home scrolls with the trays; down on the bottom
    // edge, it stays on the screen.
    locate: (size) => stackPlacement(size) ?? { ...corner(size), screen: stackOnScreen() },
    watch: watchStack,
  },
};

type SectionQullProps = {
  section: SectionId;
  /** The section body has started powering on. */
  ready: boolean;
  /** The section's neon: Qull's lines, face and spark. */
  neon: string;
  /** The section's base color: what fills Qull's body and limbs. */
  ground: string;
  reducedMotion: boolean;
};

/**
 * Qull in an open section: the full figure (arms and feet), drawn in the
 * section's neon over its base color. Once the section has powered on it
 * arrives with that screen's entrance and settles into that screen's spot
 * and posture. Rendered inside the section content, so it leaves with it.
 * Under reduced motion it is simply there, standing still.
 */
export function SectionQull({ section, ready, neon, ground, reducedMotion }: SectionQullProps) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [arrived, setArrived] = useState(false);
  const stage = STAGES[section];

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setArrived(true), reducedMotion ? 0 : ENTER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ready, reducedMotion]);

  const anchor = useCallback(() => svgRef.current, []);
  const [options] = useState<QullMotionOptions>(() => ({
    entrance: stage.entrance,
    locate: stage.locate,
    watch: stage.watch,
  }));
  useQullMotion(scopeRef, anchor, arrived && !reducedMotion, options);

  // Still, under reduced motion: just put it in its spot.
  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!arrived || !reducedMotion || !scope) return;
    const place = () => {
      const size = scope.getBoundingClientRect().width;
      const placement = stage.locate(size);
      if (placement) placeScope(scope, placement, size);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [arrived, reducedMotion, stage]);

  if (!arrived) return null;
  return (
    <div
      ref={scopeRef}
      className="section-qull"
      aria-hidden="true"
      style={{ "--qull-neon": neon, "--qull-ground": ground } as CSSProperties}
    >
      <svg ref={svgRef} className="section-qull-svg" viewBox={QULL_VIEWBOX}>
        {/* Limbs first: the body's ground fill hides where they tuck in.
            pathLength lets the "draw" entrance trace the outlines on. */}
        <path data-qull="limbs" className="section-qull-shell section-qull-limbs" pathLength={1} d={QULL_REST_POSE.limbs} />
        <path data-qull="body" className="section-qull-shell section-qull-body" pathLength={1} d={QULL_REST_POSE.body} />
        <path data-qull="front-limbs" className="section-qull-shell section-qull-limbs" pathLength={1} d="" />
        <path data-qull="face" className="section-qull-ink" d={QULL_REST_POSE.face} />
        <path data-qull="accents" className="section-qull-ink" d={QULL_REST_POSE.accents} />
        <path
          data-qull="spark"
          className="section-qull-ink"
          d={QULL_SPARK_PATH}
          transform={QULL_REST_POSE.spark}
        />
      </svg>
    </div>
  );
}
