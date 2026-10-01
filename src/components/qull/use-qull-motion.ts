"use client";

import { useLayoutEffect, type RefObject } from "react";

import {
  QULL_BASE,
  QULL_REST_POSE,
  QULL_VIEWBOX_ORIGIN,
  QULL_VIEWBOX_SIZE,
  QullMotion,
  type QullEntrance,
  type QullMode,
  type QullMood,
  type QullPose,
} from "./qull-motion";

// The wave's band (hero-marquee.css, 0.9s ease-out sweep) crosses the top
// of the hero about this long after it starts.
const WAVE_REACH_S = 0.18;

function applyPose(scope: HTMLElement, pose: QullPose) {
  scope.querySelectorAll('[data-qull="body"]').forEach((el) => el.setAttribute("d", pose.body));
  scope.querySelectorAll('[data-qull="face"]').forEach((el) => el.setAttribute("d", pose.face));
  scope.querySelectorAll('[data-qull="accents"]').forEach((el) => el.setAttribute("d", pose.accents));
  scope.querySelectorAll('[data-qull="limbs"]').forEach((el) => el.setAttribute("d", pose.limbs));
  scope.querySelectorAll('[data-qull="front-limbs"]').forEach((el) => el.setAttribute("d", pose.frontLimbs));
  scope.querySelectorAll('[data-qull="spark"]').forEach((el) => {
    // A copy with no group to place it (the hero's clip shapes) carries its
    // placement itself, ahead of the spark's own transform.
    const frame = el.getAttribute("data-qull-frame");
    el.setAttribute("transform", frame ? `${frame} ${pose.spark}` : pose.spark);
  });
  const draw = String(pose.draw);
  if (scope.style.getPropertyValue("--qull-draw") !== draw) scope.style.setProperty("--qull-draw", draw);
}

/**
 * Where Qull lives on screen, in viewport pixels: `x, y` is the point its
 * base stands on. `track` is a range it can stroll along (x), `spots` are
 * places it can visit (base points).
 */
export type QullPlacement = {
  x: number;
  y: number;
  mode: QullMode;
  track?: [number, number];
  spots?: { x: number; y: number }[];
  /** It stands on the screen itself (its bottom edge), not on the content. */
  screen?: boolean;
};

export type QullMotionOptions = {
  /**
   * React to the totem through the root attributes totem-hover.ts writes:
   * the hovered section (`data-totem-hover`) picks a mood from this map,
   * and each background wave that starts or replays startles it, timed to
   * when the band reaches it.
   */
  totemMoods?: Readonly<Record<string, QullMood>>;
  /** Pause while an open section covers the hero. */
  pauseWhenHeroCovered?: boolean;
  /** Arrive when motion starts: a given entrance, or "random". */
  entrance?: QullEntrance | "random";
  /**
   * Positions the scope element every frame and sets the posture. Without
   * it, the scope stays where CSS puts it, standing.
   */
  locate?: (size: number) => QullPlacement | null;
  /**
   * Hooks up screen events (e.g. observers that call `motion.cue`). Returns
   * its cleanup, or a watcher that also drives Qull every frame.
   */
  watch?: (motion: QullMotion, scope: HTMLElement) => (() => void) | QullWatcher | void;
};

/**
 * A screen that moves Qull itself. `frame` runs on Qull's own clock, after
 * the scope has been placed and before the pose is drawn, so what it reads
 * off the scope and what it drives belong to the same frame.
 */
export type QullWatcher = { frame: (dt: number) => void; stop: () => void };

/** A viewport point in the figure's units, for looks and targets. */
export function figurePoint(scope: HTMLElement, x: number, y: number) {
  const rect = scope.getBoundingClientRect();
  const perUnit = rect.width / QULL_VIEWBOX_SIZE;
  return { x: QULL_VIEWBOX_ORIGIN.x + (x - rect.left) / perUnit, y: QULL_VIEWBOX_ORIGIN.y + (y - rect.top) / perUnit };
}

/**
 * Pixels → Qull units for a placement, and where its scope box goes.
 *
 * The scope is absolute inside whatever scrolls the screen, so a placement
 * (viewport pixels) is turned into that content's own coordinates: the
 * browser then carries Qull along as the content scrolls, on the same frame,
 * instead of it catching up a frame late from a script. A placement on the
 * screen itself is fixed instead, and stays put under the scroll.
 */
export function placeScope(scope: HTMLElement, placement: QullPlacement, size: number) {
  const perUnit = size / QULL_VIEWBOX_SIZE;
  let left = placement.x - (QULL_BASE.x - QULL_VIEWBOX_ORIGIN.x) * perUnit;
  let top = placement.y - (QULL_BASE.y - QULL_VIEWBOX_ORIGIN.y) * perUnit;
  const position = placement.screen ? "fixed" : "absolute";
  if (scope.style.position !== position) scope.style.position = position;
  const content = placement.screen ? null : scope.offsetParent;
  if (content instanceof HTMLElement) {
    const rect = content.getBoundingClientRect();
    left += content.scrollLeft - rect.left - content.clientLeft;
    top += content.scrollTop - rect.top - content.clientTop;
    // Its box must not reach past the content's end, or it would add
    // scroll of its own (it stands a hair inside the bottom edge).
    left = Math.min(left, content.scrollWidth - size - 1);
    top = Math.min(top, content.scrollHeight - size - 1);
  }
  // Written only when it moves: a scroll alone leaves both as they were.
  const x = `${Math.round(left * 100) / 100}px`;
  const y = `${Math.round(top * 100) / 100}px`;
  if (scope.style.left !== x) scope.style.left = x;
  if (scope.style.top !== y) scope.style.top = y;
  return (px: number) => px / perUnit;
}

/**
 * Animates every Qull inside `scope` from one clock, writing path data
 * straight to the DOM so React never re-renders per frame. All copies
 * (visible mark, mask pass, outline pass) share the pose, so they stay in
 * register.
 *
 * `anchor` returns the element whose box maps screen coordinates to the
 * figure's viewBox. Pauses while the tab is hidden.
 */
export function useQullMotion(
  scopeRef: RefObject<HTMLElement | null>,
  anchor: () => Element | null | undefined,
  enabled: boolean,
  options: QullMotionOptions = {}
) {
  const { totemMoods, pauseWhenHeroCovered = false, entrance, locate, watch } = options;

  // Layout effect: an entrance must be off screen before the first paint.
  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!enabled || !scope) return;
    const root = document.documentElement;
    const motion = new QullMotion();
    let frame = 0;
    let last = 0;

    // Places the scope on screen (when located) and tells Qull its posture,
    // track and spots in its own units.
    const settle = (instant: boolean) => {
      if (!locate) return;
      const size = scope.getBoundingClientRect().width;
      if (!size) return;
      const placement = locate(size);
      if (!placement) return;
      const toUnits = placeScope(scope, placement, size);
      motion.setMode(placement.mode, instant);
      motion.setTrack(
        placement.track ? [toUnits(placement.track[0] - placement.x), toUnits(placement.track[1] - placement.x)] : null
      );
      motion.setSpots(
        (placement.spots ?? []).map((spot) => ({ x: toUnits(spot.x - placement.x), y: toUnits(spot.y - placement.y) }))
      );
    };

    const box = () => {
      const rect = anchor()?.getBoundingClientRect();
      return rect && rect.width > 0 ? rect : null;
    };
    const toFigure = (clientX: number, clientY: number, rect: DOMRect) => ({
      x: QULL_VIEWBOX_ORIGIN.x + ((clientX - rect.left) / rect.width) * QULL_VIEWBOX_SIZE,
      y: QULL_VIEWBOX_ORIGIN.y + ((clientY - rect.top) / rect.height) * QULL_VIEWBOX_SIZE,
    });
    // The spark can fly anywhere on screen; entrances start just off it.
    const syncBounds = () => {
      const rect = box();
      if (!rect) return;
      const topLeft = toFigure(0, 0, rect);
      const bottomRight = toFigure(window.innerWidth, window.innerHeight, rect);
      motion.setBounds(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = box();
      if (!rect) return;
      const point = toFigure(event.clientX, event.clientY, rect);
      motion.look(point.x, point.y);
    };
    // Window-level: layers above the figure (the hero's shader and
    // knockout, a section's content) keep it from receiving the pointer.
    // Tested against the body itself, wherever its posture has put it.
    const onPointerDown = (event: PointerEvent) => {
      const rect = box();
      if (!rect) return;
      const point = toFigure(event.clientX, event.clientY, rect);
      const body = motion.hitBox();
      const pad = 12;
      if (
        point.x >= body.left - pad &&
        point.x <= body.right + pad &&
        point.y >= body.top - pad &&
        point.y <= body.bottom + pad
      ) {
        motion.poke();
      }
    };

    const paused = () => document.hidden || (pauseWhenHeroCovered && root.hasAttribute("data-hero-covered"));
    const tick = (now: number) => {
      frame = 0;
      if (paused()) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      settle(false);
      syncBounds();
      watcher?.frame(dt);
      applyPose(scope, motion.step(dt));
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame || paused()) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };

    const onRootChange = (records: MutationRecord[]) => {
      let waveStarted = false;
      for (const record of records) {
        if (record.attributeName === "data-totem-hover" && totemMoods) {
          const section = root.getAttribute("data-totem-hover");
          motion.mood(section ? (totemMoods[section] ?? null) : null);
        } else if (record.attributeName === "data-totem-wave") {
          waveStarted ||= record.oldValue === null && root.hasAttribute("data-totem-wave");
        } else if (record.attributeName === "data-totem-wave-restart") {
          waveStarted = true;
        }
      }
      if (waveStarted && totemMoods) motion.startle(WAVE_REACH_S);
      start();
    };
    const observer = new MutationObserver(onRootChange);
    observer.observe(root, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["data-hero-covered", "data-totem-hover", "data-totem-wave", "data-totem-wave-restart"],
    });
    document.addEventListener("visibilitychange", start);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    const watched = watch?.(motion, scope);
    const watcher = typeof watched === "object" ? watched : null;
    settle(true);
    if (entrance) {
      syncBounds();
      motion.enter(entrance);
    }
    // Posed (and off screen, if entering) from the very first painted frame.
    applyPose(scope, motion.step(0));
    start();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (typeof watched === "function") watched();
      watcher?.stop();
      document.removeEventListener("visibilitychange", start);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      applyPose(scope, QULL_REST_POSE);
    };
  }, [scopeRef, anchor, enabled, totemMoods, pauseWhenHeroCovered, entrance, locate, watch]);
}
