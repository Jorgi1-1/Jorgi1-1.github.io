"use client";

import { useEffect } from "react";

// Without this boundary an uncaught render error leaves the visitor on the
// intro's black frame (see home-page.tsx's INTRO_SCRIPT) with nothing to tap.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Algo salió mal
      </p>
      <h1 className="max-w-md text-balance text-2xl font-semibold">
        No se pudo cargar esta página.
      </h1>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border border-foreground/20 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-foreground/5"
      >
        Reintentar
      </button>
    </div>
  );
}
