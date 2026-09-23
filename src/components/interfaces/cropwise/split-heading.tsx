"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export function SplitHeading({
  as: Tag = "h2",
  className = "",
  children,
}: {
  as?: "h2" | "h3";
  className?: string;
  children: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const split = new SplitText(el, {
      type: "lines",
      linesClass: "cw-split-line",
      mask: "lines",
    });

    gsap.set(split.lines, { opacity: 0, y: 40 });

    const trigger = gsap.to(split.lines, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    });

    return () => {
      trigger.scrollTrigger?.kill();
      trigger.kill();
      split.revert();
    };
  }, []);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
