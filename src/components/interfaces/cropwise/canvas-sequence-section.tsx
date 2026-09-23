"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SplitHeading } from "./split-heading";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Instead of preloading ~80 external frame images (the pattern this section
// is modeled on), the "sequence" is generated procedurally: draw(progress)
// is a continuous function over 0–1 that plays the same role as picking
// frame N from a pre-rendered set, without needing any image assets.
function drawCapsuleFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
) {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const rotation = progress * Math.PI * 2.4;
  const scale = 0.55 + progress * 1.05;
  const capsuleW = 90 * scale;
  const capsuleH = 220 * scale;
  const radius = capsuleW / 2;

  const fromColor: [number, number, number] = [234, 230, 217];
  const toColor: [number, number, number] = [111, 138, 86];
  const mix = fromColor.map((c, i) => Math.round(c + (toColor[i] - c) * progress));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  const gradient = ctx.createLinearGradient(0, -capsuleH / 2, 0, capsuleH / 2);
  gradient.addColorStop(0, `rgb(${mix.join(",")})`);
  gradient.addColorStop(1, `rgba(${mix.join(",")}, 0.55)`);

  ctx.beginPath();
  ctx.roundRect(-capsuleW / 2, -capsuleH / 2, capsuleW, capsuleH, radius);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = "rgba(26, 36, 19, 0.2)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-capsuleW / 2, 0);
  ctx.lineTo(capsuleW / 2, 0);
  ctx.stroke();

  ctx.restore();

  const dotCount = Math.round(6 + progress * 20);
  for (let i = 0; i < dotCount; i++) {
    const angle = (i / dotCount) * Math.PI * 2 + rotation * 1.6;
    const orbitRadius = Math.min(width, height) * (0.22 + Math.sin(progress * Math.PI) * 0.06);
    const x = cx + Math.cos(angle) * orbitRadius;
    const y = cy + Math.sin(angle) * orbitRadius * 0.55;

    ctx.beginPath();
    ctx.arc(x, y, 2 + progress * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${mix.join(",")}, ${0.25 + progress * 0.55})`;
    ctx.fill();
  }
}

export function CanvasSequenceSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Re-render the current frame immediately so a resize never leaves a
      // stale or blank canvas until the next scroll event.
      drawCapsuleFrame(ctx!, width, height, progressRef.current);
    }

    resize();
    window.addEventListener("resize", resize);

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        drawCapsuleFrame(ctx!, width, height, self.progress);
      },
    });

    return () => {
      window.removeEventListener("resize", resize);
      trigger.kill();
    };
  }, []);

  return (
    <>
      <div
        id="cw-productos"
        className="scroll-mt-24 bg-[#eae6d9] px-6 pb-16 pt-24 text-center sm:px-10"
      >
        <SplitHeading className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-[#1a2413] sm:text-5xl">
          {"Así se libera el ingrediente activo de ejemplo."}
        </SplitHeading>
      </div>

      <section ref={sectionRef} className="relative h-[300vh] bg-[#1a2413]">
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {/* .capsule-bg equivalent: a static gradient layer behind the canvas */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, rgba(159,186,133,0.22), transparent 62%)",
            }}
          />
          <canvas ref={canvasRef} className="relative size-full" aria-hidden />
          <p className="pointer-events-none absolute bottom-16 left-1/2 max-w-sm -translate-x-1/2 text-center text-sm text-[#eae6d9]/60">
            Texto de apoyo de ejemplo — la ilustración anterior es puramente
            decorativa y se genera con Canvas 2D.
          </p>
        </div>
      </section>
    </>
  );
}
