"use client";

import { useEffect, useRef } from "react";

import "./click-spark.css";

// Adapted from React Bits' ClickSpark: a fixed, full-viewport canvas that
// listens on window, so it covers the whole page without wrapping it. It
// scales for device pixel ratio and only animates while sparks are alive.

type Spark = { x: number; y: number; angle: number; startTime: number };

type ClickSparkProps = {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: "linear" | "ease-in" | "ease-in-out" | "ease-out";
  extraScale?: number;
};

const EASINGS = {
  linear: (t: number) => t,
  "ease-in": (t: number) => t * t,
  "ease-in-out": (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  "ease-out": (t: number) => t * (2 - t),
};

export function ClickSpark({
  sparkColor = "#fff",
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = "ease-out",
  extraScale = 1,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = { sparkColor, sparkSize, sparkRadius, sparkCount, duration, easing, extraScale };
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let sparks: Spark[] = [];
    let raf: number | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const c = configRef.current;
      const ease = EASINGS[c.easing];
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.strokeStyle = c.sparkColor;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";

      sparks = sparks.filter((spark) => {
        const elapsed = now - spark.startTime;
        if (elapsed >= c.duration) return false;
        const eased = ease(elapsed / c.duration);
        const distance = eased * c.sparkRadius * c.extraScale;
        const lineLength = c.sparkSize * (1 - eased);
        const cos = Math.cos(spark.angle);
        const sin = Math.sin(spark.angle);
        ctx.beginPath();
        ctx.moveTo(spark.x + distance * cos, spark.y + distance * sin);
        ctx.lineTo(spark.x + (distance + lineLength) * cos, spark.y + (distance + lineLength) * sin);
        ctx.stroke();
        return true;
      });

      raf = sparks.length > 0 ? requestAnimationFrame(draw) : null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const now = performance.now();
      const count = configRef.current.sparkCount;
      for (let i = 0; i < count; i++) {
        sparks.push({ x: event.clientX, y: event.clientY, angle: (2 * Math.PI * i) / count, startTime: now });
      }
      if (raf === null) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return <canvas ref={canvasRef} className="click-spark" aria-hidden="true" />;
}
