/* Generic placeholder marks — deliberately not modeled on any real brand.
   The sprout doubles as the nav logo and as the embossed relief on the
   floating capsule in the hero scene. */

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      focusable="false"
    >
      <path
        d="M12 22V11.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12.4 12.2c-.2-3.7 2.2-6.9 6.1-7.7.4 3.9-2 7.1-6.1 7.7Z"
        fill="currentColor"
      />
      <path
        d="M11.6 13.6c.2-3.4-2-6.3-5.6-7-.4 3.6 1.8 6.5 5.6 7Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Small four-point star used next to the MENU trigger. */
export function StarMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      focusable="false"
    >
      <path
        d="M12 2c.6 5 4 8.4 9 9-5 .6-8.4 4-9 9-.6-5-4-8.4-9-9 5-.6 8.4-4 9-9Z"
        fill="currentColor"
      />
    </svg>
  );
}
