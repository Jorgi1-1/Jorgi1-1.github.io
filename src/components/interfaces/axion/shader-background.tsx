"use client";

import dynamic from "next/dynamic";

// WebGPU only exists in the browser, so this must never run during SSR/RSC
// prerendering — dynamic + ssr:false keeps it out of that pass entirely.
const ShaderLayers = dynamic(
  () => import("./shader-layers").then((m) => m.ShaderLayers),
  { ssr: false },
);

export function ShaderBackground() {
  return <ShaderLayers />;
}
