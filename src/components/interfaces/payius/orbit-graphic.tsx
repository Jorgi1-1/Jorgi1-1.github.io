const RINGS = [
  { rx: 232, ry: 92, rotate: 0, duration: "34s", opacity: 0.55 },
  { rx: 232, ry: 92, rotate: 60, duration: "44s", opacity: 0.4, reverse: true },
  { rx: 232, ry: 92, rotate: 120, duration: "38s", opacity: 0.4 },
  { rx: 168, ry: 168, rotate: 0, duration: "26s", opacity: 0.3, reverse: true },
];

/** Nodes sit on the rings; positions are hand-placed so they read as an
 *  orbit rather than an even, mechanical scatter. */
const NODES = [
  { cx: 260, cy: 92, delay: "0s", color: "#60A5FA" },
  { cx: 452, cy: 224, delay: "0.5s", color: "#2563EB" },
  { cx: 386, cy: 396, delay: "1.1s", color: "#60A5FA" },
  { cx: 150, cy: 404, delay: "1.6s", color: "#2563EB" },
  { cx: 74, cy: 246, delay: "2.1s", color: "#60A5FA" },
  { cx: 200, cy: 172, delay: "2.6s", color: "#60A5FA" },
  { cx: 336, cy: 320, delay: "1.3s", color: "#2563EB" },
];

export function OrbitGraphic({ shown }: { shown: boolean }) {
  return (
    <div className="payius-orbit relative w-full" data-shown={shown}>
      <svg
        viewBox="0 0 520 520"
        className="w-full"
        role="img"
        aria-label="Ilustración de órbitas con nodos luminosos"
      >
        <defs>
          <radialGradient id="payius-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#2563EB" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="payius-ring" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0" />
            <stop offset="35%" stopColor="#60A5FA" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#2563EB" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>

          <filter id="payius-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="260" cy="260" r="230" fill="url(#payius-core)" />

        {RINGS.map((ring, i) => (
          <g
            key={i}
            className={`payius-ring${ring.reverse ? " payius-ring--reverse" : ""}`}
            style={{ ["--ring-duration" as string]: ring.duration }}
          >
            <ellipse
              cx="260"
              cy="260"
              rx={ring.rx}
              ry={ring.ry}
              fill="none"
              stroke="url(#payius-ring)"
              strokeWidth="1.25"
              opacity={ring.opacity}
              transform={`rotate(${ring.rotate} 260 260)`}
            />
          </g>
        ))}

        <g filter="url(#payius-glow)">
          {NODES.map((node, i) => (
            <circle
              key={i}
              className="payius-node"
              cx={node.cx}
              cy={node.cy}
              r="3.5"
              fill={node.color}
              style={{ ["--node-delay" as string]: node.delay }}
            />
          ))}
        </g>

        <circle
          cx="260"
          cy="260"
          r="6"
          fill="#60A5FA"
          filter="url(#payius-glow)"
        />
      </svg>

      {/* Trailing beam sweeping left to right across the orbit. */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 overflow-hidden">
        <div
          className="payius-beam h-px w-full"
          style={{
            background:
              "linear-gradient(to right, transparent, #60A5FA 55%, #FFFFFF 78%, transparent)",
            boxShadow: "0 0 12px 1px rgba(96, 165, 250, 0.65)",
          }}
        />
      </div>
    </div>
  );
}
