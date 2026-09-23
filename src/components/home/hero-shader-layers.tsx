"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ChromaFlow, CursorRipples, FilmGrain, FlutedGlass, Shader, Swirl } from "shaders/react";

import { onTotemChromaWave } from "./totem-hover";

type HeroShaderLayersProps = {
  onReady: () => void;
  onUnavailable: () => void;
};

// ChromaFlow's own resting tone (see the <ChromaFlow> below) — the value
// the totem-hover wave animates away from and back to.
const CHROMA_REST_COLOR = "#16130f";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function mixHex(from: string, to: string, t: number) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[lerp(a.r, b.r), lerp(a.g, b.g), lerp(a.b, b.b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Liquid-glass shader from the Axion recreation (Swirl, ChromaFlow,
 * FlutedGlass, FilmGrain) plus CursorRipples. Rendered full-hero and masked
 * to the headline glyphs (see hero-marquee.tsx).
 */
export function HeroShaderLayers({ onReady, onUnavailable }: HeroShaderLayersProps) {
  const [unavailable, setUnavailable] = useState(false);

  // The totem-hover wave rides ChromaFlow's own liquid by tweening its
  // baseColor prop (see onTotemChromaWave in totem-hover.ts).
  const [chromaBase, setChromaBase] = useState(CHROMA_REST_COLOR);
  const chromaBaseRef = useRef(CHROMA_REST_COLOR);
  const chromaTweenProxyRef = useRef({ t: 0 });
  const chromaFromRef = useRef(CHROMA_REST_COLOR);
  const chromaToRef = useRef(CHROMA_REST_COLOR);

  useEffect(() => {
    return onTotemChromaWave((color) => {
      const target = color ?? CHROMA_REST_COLOR;
      gsap.killTweensOf(chromaTweenProxyRef.current);
      // Tween from the on-screen value so interruptions never jump.
      chromaFromRef.current = chromaBaseRef.current;
      chromaToRef.current = target;
      chromaTweenProxyRef.current.t = 0;
      gsap.to(chromaTweenProxyRef.current, {
        t: 1,
        duration: 0.9,
        ease: "power3.out",
        onUpdate: () => {
          const next = mixHex(chromaFromRef.current, chromaToRef.current, chromaTweenProxyRef.current.t);
          chromaBaseRef.current = next;
          setChromaBase(next);
        },
      });
    });
  }, []);

  if (unavailable) {
    // Static stand-in when WebGPU is unavailable.
    return (
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 15% 100%, rgba(195,216,9,0.3) 0%, transparent 55%), #222022",
        }}
      />
    );
  }

  return (
    <Shader
      className="absolute inset-0"
      // The library otherwise samples 5% of sessions and beacons frame stats
      // to shaders.com — a third-party request this portfolio has no use for.
      disableTelemetry
      onReady={onReady}
      onUnavailable={() => {
        setUnavailable(true);
        onUnavailable();
      }}
    >
      <Swirl colorA="#f4efe2" colorB="#16130f" detail={1.1} speed={0.35} />
      <ChromaFlow
        baseColor={chromaBase}
        upColor="#22c55e"
        downColor="#ef4444"
        leftColor="#3b82f6"
        rightColor="#a855f7"
        momentum={26}
        radius={3}
      />
      <FlutedGlass
        shape="rounded"
        angle={18}
        frequency={8}
        softness={0.78}
        refraction={0.9}
        aberration={0.12}
        lightAngle={-60}
        highlight={0.16}
        highlightSoftness={0.3}
        speed={0.04}
      />
      <CursorRipples intensity={7} decay={11} radius={0.35} chromaticSplit={0.5} />
      <FilmGrain strength={0.04} />
    </Shader>
  );
}
