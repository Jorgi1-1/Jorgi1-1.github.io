"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

import "./text-type.css";

// After React Bits' TextType, cut down to what the footer uses: a list of
// phrases typed, held, deleted and looped behind a blinking cursor. The loop
// is one timer-driven state machine, so state only ever changes from a timer.

const CURSOR_BLINK_S = 0.5;

type TextTypeProps = {
  text: string[];
  className?: string;
  /** Milliseconds per character typed, and per character deleted. */
  typingSpeed?: number;
  deletingSpeed?: number;
  /** How long a finished phrase holds before it's deleted, in ms. */
  pauseDuration?: number;
  /** Wait before the first character, in ms. */
  initialDelay?: number;
  cursorCharacter?: string;
  cursorClassName?: string;
};

type Typing = { index: number; shown: number; deleting: boolean };

/** Decorative: hidden from assistive tech, which should get the text from its caller. */
export function TextType({
  text,
  className = "",
  typingSpeed = 50,
  deletingSpeed = 30,
  pauseDuration = 2000,
  initialDelay = 0,
  cursorCharacter = "|",
  cursorClassName = "",
}: TextTypeProps) {
  const [state, setState] = useState<Typing>({ index: 0, shown: 0, deleting: false });
  const cursorRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const current = text[state.index % text.length] ?? "";

  useEffect(() => {
    const tween = gsap.fromTo(
      cursorRef.current,
      { opacity: 1 },
      { opacity: 0, duration: CURSOR_BLINK_S, repeat: -1, yoyo: true, ease: "power2.inOut" }
    );
    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    let delay: number;
    let next: (s: Typing) => Typing;
    if (state.deleting) {
      if (state.shown > 0) {
        delay = deletingSpeed;
        next = (s) => ({ ...s, shown: s.shown - 1 });
      } else {
        delay = 0;
        next = (s) => ({ index: (s.index + 1) % text.length, shown: 0, deleting: false });
      }
    } else if (state.shown < current.length) {
      delay = started.current ? typingSpeed : initialDelay;
      next = (s) => ({ ...s, shown: s.shown + 1 });
    } else {
      delay = pauseDuration;
      next = (s) => ({ ...s, deleting: true });
    }

    const timer = window.setTimeout(() => {
      started.current = true;
      setState(next);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [state, current, text.length, typingSpeed, deletingSpeed, pauseDuration, initialDelay]);

  return (
    <span className={`text-type ${className}`.trim()} aria-hidden="true">
      <span className="text-type__content">{Array.from(current).slice(0, state.shown).join("")}</span>
      <span ref={cursorRef} className={`text-type__cursor ${cursorClassName}`.trim()}>
        {cursorCharacter}
      </span>
    </span>
  );
}
