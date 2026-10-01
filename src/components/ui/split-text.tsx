"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { SplitText as GSAPSplitText } from "gsap/SplitText";

gsap.registerPlugin(GSAPSplitText);

// After React Bits' SplitText, cut down to what the hints need: the text
// splits into characters that play in on mount, and `leaving` plays `exitTo`
// over the same characters on the way out. gsap.context in a layout effect
// stands in for @gsap/react's useGSAP.

type Vars = gsap.TweenVars;

type SplitTextProps = {
  text: string;
  className?: string;
  /** Stagger between characters, in ms. */
  delay?: number;
  duration?: number;
  ease?: string;
  from?: Vars;
  to?: Vars;
  /** Plays `exitTo`, then calls `onExitComplete`. */
  leaving?: boolean;
  exitTo?: Vars;
  exitDuration?: number;
  /** Stagger on the way out, in ms. Defaults to `delay`. */
  exitDelay?: number;
  onExitComplete?: () => void;
};

export function SplitText({
  text,
  className,
  delay = 50,
  duration = 1.25,
  ease = "power3.out",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  leaving = false,
  exitTo,
  exitDuration,
  exitDelay,
  onExitComplete,
}: SplitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const charsRef = useRef<Element[] | null>(null);
  const enterRef = useRef<gsap.core.Tween | null>(null);
  const onExitRef = useRef(onExitComplete);
  // Splitting measures the text, so it waits for the real face.
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    onExitRef.current = onExitComplete;
  }, [onExitComplete]);

  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => alive && setFontsLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const fromKey = JSON.stringify(from);
  const toKey = JSON.stringify(to);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !text || !fontsLoaded) return;
    let split: GSAPSplitText | null = null;
    const ctx = gsap.context(() => {
      split = new GSAPSplitText(el, { type: "chars", charsClass: "split-char", reduceWhiteSpace: false });
      charsRef.current = split.chars;
      enterRef.current = gsap.fromTo(
        split.chars,
        { ...from },
        { ...to, duration, ease, stagger: delay / 1000, willChange: "transform, opacity", force3D: true }
      );
    }, el);

    return () => {
      charsRef.current = null;
      split?.revert();
      ctx.revert();
    };
    // `from` and `to` are compared by value: callers pass fresh objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay, duration, ease, fromKey, toKey, fontsLoaded]);

  useEffect(() => {
    if (!leaving) return;
    const chars = charsRef.current;
    if (!chars?.length || !exitTo) {
      onExitRef.current?.();
      return;
    }
    enterRef.current?.kill();
    const tween = gsap.to(chars, {
      ...exitTo,
      duration: exitDuration ?? duration * 0.6,
      ease: "power2.in",
      stagger: (exitDelay ?? delay) / 1000,
      onComplete: () => onExitRef.current?.(),
    });
    return () => {
      tween.kill();
    };
  }, [leaving, exitTo, exitDuration, exitDelay, duration, delay]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
