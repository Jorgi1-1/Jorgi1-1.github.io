"use client";

import { useState } from "react";
import { ChromaFlow, FilmGrain, FlutedGlass, Shader, Swirl } from "shaders/react";

/** Renders inside a client-only dynamic import (see axion-shader-background.tsx)
 *  since Shader talks to WebGPU, which doesn't exist during SSR. */
export function ShaderLayers() {
  const [unavailable, setUnavailable] = useState(false);

  if (unavailable) {
    // WebGPU isn't supported in this browser/GPU — a static gradient stands
    // in for the animated swirl rather than leaving a blank canvas.
    return (
      <div
        aria-hidden
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 90% at 15% 100%, rgba(242,101,34,0.35) 0%, transparent 55%), #EFEFEF",
        }}
      />
    );
  }

  return (
    <Shader
      className="absolute inset-0 z-10 pointer-events-none"
      onUnavailable={() => setUnavailable(true)}
    >
      <Swirl colorA="#ffffff" colorB="#f0f0f0" detail={1.7} />
      <ChromaFlow
        baseColor="#ffffff"
        downColor="#ff5f03"
        leftColor="#ff5f03"
        rightColor="#ff5f03"
        upColor="#ff5f03"
        momentum={13}
        radius={3.5}
      />
      <FlutedGlass
        aberration={0.61}
        angle={31}
        frequency={8}
        highlight={0.12}
        highlightSoftness={0}
        lightAngle={-90}
        refraction={4}
        shape="rounded"
        softness={1}
        speed={0.15}
      />
      <FilmGrain strength={0.05} />
    </Shader>
  );
}
