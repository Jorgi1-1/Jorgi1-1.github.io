"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { createPortal } from "react-dom";

import { SplitText } from "@/components/ui/split-text";
import { useMediaQuery } from "./use-media-query";

import "./hint.css";

/**
 * Affordance hints: a small mono chip, anchored to the thing it's about,
 * whose icon acts out the gesture (a pointer drifting in for hover, a press
 * for click, a sway for drag, a bob for scroll). Each hint shows at most
 * once per visit, only if its gesture hasn't been used yet, and leaves the
 * moment it is (or after a while on its own). Never interactive: it only
 * points.
 */

type HintGesture = "hover" | "click" | "drag" | "scroll";
type HintTone = "hero" | "panel";
type Placement = "below" | "above" | "right" | "beside";

const STORAGE_KEY = "home-hints-used";
const USED_EVENT = "home-hint-used";

function usedHints(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function isHintUsed(id: string) {
  return usedHints().has(id);
}

/** The gesture a hint teaches has happened: it leaves and won't come back this visit. */
export function markHintUsed(id: string) {
  const used = usedHints();
  if (used.has(id)) return;
  used.add(id);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...used]));
  } catch {
    // Private mode: it still leaves for this page view.
  }
  window.dispatchEvent(new CustomEvent(USED_EVENT, { detail: id }));
}

// Hints that would sit in the same spot share a slot: the next one waits
// for it, then a beat. Hints in different spots can be up together.
const SLOT_EVENT = "home-hint-slot-free";
const SLOT_GAP_MS = 500;
const slotHolders = new Map<string, string>();

function takeSlot(slot: string | undefined, id: string) {
  if (!slot) return true;
  const holder = slotHolders.get(slot);
  if (holder && holder !== id) return false;
  slotHolders.set(slot, id);
  return true;
}

function freeSlot(slot: string | undefined, id: string) {
  if (!slot || slotHolders.get(slot) !== id) return;
  slotHolders.delete(slot);
  window.dispatchEvent(new Event(SLOT_EVENT));
}

// While a section opens, closes or hands off (and while the footer
// splashes), every hint steps out at once instead of riding the transition.
const SUSPEND_ATTR = "data-hints-suspended";

export function suspendHints(suspended: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.toggleAttribute(SUSPEND_ATTR, suspended);
}

const subscribeUsed = (onChange: () => void) => {
  window.addEventListener(USED_EVENT, onChange);
  return () => window.removeEventListener(USED_EVENT, onChange);
};

/** Whether a hint's gesture has been used, kept current. */
export function useHintUsed(id: string) {
  return useSyncExternalStore(
    subscribeUsed,
    () => isHintUsed(id),
    () => false
  );
}

type HintProps = {
  id: string;
  label: string;
  gesture: HintGesture;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Where the thing it points at is right now (viewport px). */
  anchor: () => DOMRect | null;
  placement?: Placement;
  /** Gap between the anchor and the chip, px. */
  gap?: number;
  /** Only counts down (and shows) while this holds. */
  enabled: boolean;
  /** How long the page has to be quiet about this before it shows, ms. */
  delay?: number;
  /** How long it stays if nobody acts on it, ms. Omit to stay until used. */
  duration?: number;
  /** Pointer over the anchor (hover) or pressing it (click, drag) uses it up. */
  usedBy?: "hover" | "press" | null;
  tone?: HintTone;
  /** Told when the chip arrives and when it starts to leave. */
  onVisibleChange?: (visible: boolean) => void;
  /** Hints with the same slot never show together (they'd overlap). */
  slot?: string;
  /** Things that move through the hint's spot (Qull); it fades out of their
      way while they're on it and comes back once they've gone. */
  avoid?: () => DOMRect[];
};

// How often a hint checks whether something it avoids is on it, and the
// breathing room around its text.
const AVOID_CHECK_MS = 120;
const AVOID_PAD = 6;
// The label's letters rise out of the ground and sink back into it.
const LETTERS_IN = { opacity: 0, yPercent: 110 };
const LETTERS_REST = { opacity: 1, yPercent: 0 };
const LETTERS_OUT = { opacity: 0, yPercent: -110 };
const LEAVE_BACKSTOP_MS = 900;
// Reduced motion: the letters only fade.
const LETTERS_FADE_IN = { opacity: 0 };
const LETTERS_FADE_REST = { opacity: 1 };
const LETTERS_FADE_OUT = { opacity: 0 };

export function Hint({
  id,
  label,
  gesture,
  icon: Icon,
  anchor,
  placement = "below",
  gap = 14,
  enabled,
  delay = 1800,
  duration,
  usedBy = null,
  tone = "hero",
  onVisibleChange,
  slot,
  avoid,
}: HintProps) {
  const [shown, setShown] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [leaving, setLeaving] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef(anchor);
  const onVisibleRef = useRef(onVisibleChange);
  useEffect(() => {
    anchorRef.current = anchor;
    onVisibleRef.current = onVisibleChange;
  }, [anchor, onVisibleChange]);

  useEffect(() => {
    onVisibleRef.current?.(shown && !leaving);
  }, [shown, leaving]);

  // Counts down while enabled; never for a gesture already used. If another
  // hint is up when its time comes, it waits its turn.
  useEffect(() => {
    if (!enabled || isHintUsed(id)) return;
    let retry = 0;
    const tryShow = () => {
      if (isHintUsed(id)) return;
      if (takeSlot(slot, id)) {
        setShown(true);
        return;
      }
      const onFree = () => {
        window.removeEventListener(SLOT_EVENT, onFree);
        retry = window.setTimeout(tryShow, SLOT_GAP_MS);
      };
      window.addEventListener(SLOT_EVENT, onFree);
      cleanupWait = () => window.removeEventListener(SLOT_EVENT, onFree);
    };
    let cleanupWait = () => {};
    const timer = window.setTimeout(tryShow, delay);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retry);
      cleanupWait();
    };
  }, [enabled, id, delay, slot]);

  // Gives the slot back once gone (or if unmounted while up).
  useEffect(() => {
    if (!shown) return;
    return () => freeSlot(slot, id);
  }, [shown, id, slot]);

  // Leaves when disabled, when used, or when its time is up.
  useEffect(() => {
    if (!shown) return;
    const leave = () => setLeaving(true);
    if (!enabled) leave();
    const onUsed = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) leave();
    };
    window.addEventListener(USED_EVENT, onUsed);
    const timer = duration ? window.setTimeout(leave, duration) : 0;
    return () => {
      window.removeEventListener(USED_EVENT, onUsed);
      window.clearTimeout(timer);
    };
  }, [shown, enabled, id, duration]);

  // Gone once its letters have sunk back (SplitText's exit), with a
  // wall-clock backstop in case the ticker is stalled.
  const finishLeaving = useCallback(() => {
    setShown(false);
    setLeaving(false);
  }, []);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(finishLeaving, LEAVE_BACKSTOP_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, finishLeaving]);

  // The gesture itself, tested against the anchor's box so it works through
  // layers that sit above it (the hero's shader, Qull's pointer-less scope).
  useEffect(() => {
    if (!usedBy || !enabled) return;
    const inside = (event: PointerEvent) => {
      const rect = anchorRef.current();
      if (!rect) return false;
      const pad = 8;
      return (
        event.clientX >= rect.left - pad &&
        event.clientX <= rect.right + pad &&
        event.clientY >= rect.top - pad &&
        event.clientY <= rect.bottom + pad
      );
    };
    const type = usedBy === "hover" ? "pointermove" : "pointerdown";
    const onPointer = (event: PointerEvent) => {
      // Touch has no hover: a tap on it counts instead.
      if (usedBy === "hover" && event.pointerType === "touch") return;
      if (inside(event)) markHintUsed(id);
    };
    const onTap = (event: PointerEvent) => {
      if (event.pointerType === "touch" && inside(event)) markHintUsed(id);
    };
    window.addEventListener(type, onPointer, { passive: true });
    if (usedBy === "hover") window.addEventListener("pointerdown", onTap, { passive: true });
    return () => {
      window.removeEventListener(type, onPointer);
      window.removeEventListener("pointerdown", onTap);
    };
  }, [usedBy, enabled, id]);

  // Placed when it shows, then again only when the page moves under it
  // (scroll, resize): no per-frame work, and a hint never chases an anchor
  // that won't keep still (Qull).
  useEffect(() => {
    if (!shown) return;
    const chip = chipRef.current;
    // Inside a section it's lit in that section's neon (hint.css adds the rim).
    if (chip && tone === "panel") {
      const neon = document.querySelector<HTMLElement>(".section-overlay-content")?.style.getPropertyValue("--panel-fg");
      if (neon) chip.style.setProperty("--hint-ink", neon);
    }
    let frame = 0;
    const place = () => {
      frame = 0;
      const rect = anchorRef.current();
      if (!chip) return;
      // The anchor may not be on screen yet (Qull still arriving): try again next frame.
      if (!rect) {
        frame = requestAnimationFrame(place);
        return;
      }
      const w = chip.offsetWidth;
      const h = chip.offsetHeight;
      let x: number;
      let y: number;
      if (placement === "right") {
        x = rect.right + gap;
        y = rect.top + rect.height / 2 - h / 2;
      } else if (placement === "beside") {
        // Standing on the same ground as the anchor, level with its feet,
        // on whichever side has room (left first).
        x = rect.left - gap - w >= 12 ? rect.left - gap - w : rect.right + gap;
        y = rect.bottom - h;
      } else {
        x = rect.left + rect.width / 2 - w / 2;
        y = placement === "below" ? rect.bottom + gap : rect.top - gap - h;
      }
      const margin = 12;
      // No room below (Qull on Stack's bottom edge): beside it at foot
      // level instead of on top of it, on the side away from the screen edge.
      if (placement === "below" && y + h > window.innerHeight - margin) {
        const leftSide = rect.left - gap - w >= margin;
        x = leftSide ? rect.left - gap - w : rect.right + gap;
        y = rect.bottom - h;
      }
      x = Math.min(window.innerWidth - margin - w, Math.max(margin, x));
      y = Math.min(window.innerHeight - margin - h, Math.max(margin, y));
      chip.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener("resize", schedule);
    // Capture: a section's panel scrolls, not the window.
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, { capture: true });
    };
  }, [shown, placement, gap, tone]);

  // Steps aside while something it avoids passes over it.
  const avoidRef = useRef(avoid);
  useEffect(() => {
    avoidRef.current = avoid;
  }, [avoid]);
  useEffect(() => {
    if (!shown || !avoid) return;
    const timer = window.setInterval(() => {
      const chip = chipRef.current?.querySelector(".hint-inner");
      const rects = avoidRef.current?.() ?? [];
      if (!chip) return;
      const r = chip.getBoundingClientRect();
      const hit = rects.some(
        (b) =>
          b.right > r.left - AVOID_PAD &&
          b.left < r.right + AVOID_PAD &&
          b.bottom > r.top - AVOID_PAD &&
          b.top < r.bottom + AVOID_PAD
      );
      chipRef.current?.classList.toggle("is-yielding", hit);
    }, AVOID_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [shown, avoid]);

  if (!shown) return null;
  return createPortal(
    <div
      ref={chipRef}
      className={`hint hint--${tone}${leaving ? " is-leaving" : ""}`}
      data-gesture={gesture}
      data-placement={placement}
      aria-hidden="true"
    >
      <span className="hint-inner">
        <Icon className="hint-icon" aria-hidden />
        <SplitText
          text={label}
          className="hint-label"
          delay={14}
          duration={0.55}
          ease="power3.out"
          from={reducedMotion ? LETTERS_FADE_IN : LETTERS_IN}
          to={reducedMotion ? LETTERS_FADE_REST : LETTERS_REST}
          leaving={leaving}
          exitTo={reducedMotion ? LETTERS_FADE_OUT : LETTERS_OUT}
          exitDuration={0.32}
          exitDelay={8}
          onExitComplete={finishLeaving}
        />
      </span>
    </div>,
    document.body
  );
}
