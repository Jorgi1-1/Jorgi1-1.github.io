"use client";

import dynamic from "next/dynamic";

// WebGPU is browser-only, so the shader is never prerendered.
const HeroShaderLayers = dynamic(
  () => import("./hero-shader-layers").then((m) => m.HeroShaderLayers),
  { ssr: false }
);

type HeroShaderEffectProps = {
  onReady: () => void;
  onUnavailable: () => void;
};

export function HeroShaderEffect({ onReady, onUnavailable }: HeroShaderEffectProps) {
  return <HeroShaderLayers onReady={onReady} onUnavailable={onUnavailable} />;
}
