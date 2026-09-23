"use client";

import { useEffect, useRef, useState } from "react";

/** Drives the oversized "404" background type: measures its own rendered
 *  height and derives a vertical scale so the glyphs always fill the
 *  viewport regardless of font metrics or screen size. */
export function useStretchScale() {
  const textRef = useRef<HTMLDivElement>(null);
  const [scaleY, setScaleY] = useState(1);

  useEffect(() => {
    const measure = () => {
      const height = textRef.current?.offsetHeight;
      if (!height) return;
      setScaleY((window.innerHeight / height) * 1.4);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return { textRef, scaleY };
}
