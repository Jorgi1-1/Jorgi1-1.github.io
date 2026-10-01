"use client";

import { useEffect } from "react";

import "./status-page.css";

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
    <main className="status-page">
      <h1 className="status-title">This page couldn&apos;t load.</h1>
      <p className="status-line">Something broke on the way. Loading it again usually fixes it.</p>
      <button type="button" className="status-action" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
