"use client";

import { ParallaxHeroImages } from "@/components/ui/parallax-hero-images";
import { useMediaQuery } from "@/components/home/use-media-query";

export function ParallaxHeroImagesDemo() {
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");

  return (
    <div className="relative flex h-[520px] w-full items-center justify-center overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <ParallaxHeroImages images={images} />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-800 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] md:text-6xl dark:text-neutral-100 dark:drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          State of the art, cutting edge images, everywhere.
        </h1>
        <p className="max-w-md text-neutral-600 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] dark:text-neutral-400 dark:drop-shadow-[0_0_10px_rgba(0,0,0,0.6)]">
          {finePointer
            ? "Move your mouse to see the parallax effect. Images at different depths move at different speeds."
            : "Drag your finger across the screen to see the parallax effect. Images at different depths move at different speeds."}
        </p>
      </div>
    </div>
  );
}

const images = [
  "https://assets.aceternity.com/components/hero-section-with-mesh-gradient.webp",
  "https://assets.aceternity.com/components/3d-globe.webp",
  "https://assets.aceternity.com/components/keyboard-2.webp",
  "https://assets.aceternity.com/components/hero-1.webp",
  "https://assets.aceternity.com/components/hero-2.webp",
  "https://assets.aceternity.com/components/hero-3.webp",
];
