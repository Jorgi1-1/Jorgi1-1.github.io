"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ChromaFlow, CursorRipples, FilmGrain, FlutedGlass, Shader, Swirl } from "shaders/react";

import { isWebKit } from "@/lib/engine";
import { onTotemChromaWave } from "./totem-hover";

type HeroShaderLayersProps = {
  onReady: () => void;
  onUnavailable: () => void;
};

// ChromaFlow's own resting tone (see the <ChromaFlow> below): the value
// the totem-hover wave animates away from and back to.
const CHROMA_REST_COLOR = "#16130f";

// The library renders at the display's pixel ratio, capped at 2 (1.5 on
// phones). WebKit composites this canvas through the glyph clip, and at a
// Retina buffer that is the first thing to fall to 30fps when the GPU is
// busy; a liquid behind fluted glass loses nothing visible at this ratio.
const WEBKIT_PIXEL_RATIO = 1.25;

// How much of its box the shader is laid out at. The library sizes its
// buffer from the element, so a smaller box scaled back up is the only
// handle on its resolution.
function renderScale() {
  if (!isWebKit()) return 1;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  return Math.min(1, WEBKIT_PIXEL_RATIO / ratio);
}

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
 * The liquid-glass shader behind the headline: Swirl, ChromaFlow, FlutedGlass,
 * CursorRipples and FilmGrain, rendered full-hero and clipped to the glyphs
 * by hero-marquee.tsx, which also swaps in a CSS stand-in when the browser
 * can't run it.
 */
export function HeroShaderLayers({ onReady, onUnavailable }: HeroShaderLayersProps) {
  // Client-only (hero-shader-effect.tsx), so the window is there to read.
  const [scale] = useState(renderScale);

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

  return (
    <Shader
      className="absolute inset-0"
      style={
        scale < 1
          ? {
              right: "auto",
              bottom: "auto",
              width: `${scale * 100}%`,
              height: `${scale * 100}%`,
              transform: `scale(${1 / scale})`,
              transformOrigin: "0 0",
            }
          : undefined
      }
      // The library otherwise samples 5% of sessions and beacons frame stats
      // to shaders.com, a third-party request this site has no use for.
      disableTelemetry
      onReady={onReady}
      onUnavailable={onUnavailable}
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
