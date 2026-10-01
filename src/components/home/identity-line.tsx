"use client";

import { useEffect, useState } from "react";

import { requestOpenSection } from "./totem-hover";

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Mexico_City",
});

/** Local time in Puebla, rendered only on the client to avoid a hydration mismatch. */
export function useLocalTime() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(timeFormat.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  return time;
}

export function IdentityLine() {
  const time = useLocalTime();

  return (
    <div className="hero-identity">
      <p className="hero-identity-name">Jorge Tovar</p>
      <p>
        Puebla, Mexico
        {time ? (
          <>
            {" · "}
            <time aria-label={`Local time ${time}`}>{time}</time>
          </>
        ) : null}
      </p>
      <p>
        {/* The one line here a recruiter acts on: it opens Contact. */}
        <button
          type="button"
          className="hero-identity-cta"
          onClick={(event) => requestOpenSection("contact", event.currentTarget)}
        >
          Open to full-time and freelance work
        </button>
      </p>
    </div>
  );
}
