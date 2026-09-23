"use client";

import { useEffect, useRef, useState } from "react";

import { SplitHeading } from "./split-heading";

// Freely licensed placeholder footage. Falls back to an animated gradient
// if it fails to load.
const VIDEO_SRC =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export function ProblemSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // A native listener is more reliable than the JSX onError prop for
    // media elements — it also catches errors already present on mount
    // (e.g. a stale src that fails before React finishes attaching).
    if (video.error) {
      setVideoFailed(true);
      return;
    }
    const onError = () => setVideoFailed(true);
    video.addEventListener("error", onError);
    return () => video.removeEventListener("error", onError);
  }, []);

  return (
    <section className="relative flex min-h-[80vh] items-end overflow-hidden bg-[#1a2413] text-[#eae6d9]">
      {videoFailed ? (
        <div
          aria-hidden
          className="cw-animated-gradient absolute inset-0 opacity-60"
        />
      ) : (
        <video
          ref={videoRef}
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-50"
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a2413] via-[#1a2413]/60 to-[#1a2413]/20"
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-40 text-center sm:px-10">
        <SplitHeading className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          {"Hasta 70% de [ recurso clave ] se pierde antes de llegar a su destino."}
        </SplitHeading>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-[#eae6d9]/70 sm:text-base">
          Texto de apoyo genérico describiendo el problema que resuelve el
          producto de ejemplo. Reemplazar con el dato y la fuente reales.
        </p>
      </div>
    </section>
  );
}
