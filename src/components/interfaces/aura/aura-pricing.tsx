"use client";

import { useState } from "react";

const PLANS = [
  {
    tier: "Free",
    price: "Free",
    pro: false,
    description: "For creators taking their first steps with Forma.",
    features: [
      "Up to 3 projects in the cloud",
      "Image export up to 1080p",
      "Basic editing tools",
      "Free templates and icons",
      "Access via web and mobile app",
    ],
  },
  {
    tier: "Standard",
    priceMonthly: "$9,99/m",
    priceYearly: "$99,99/y",
    pro: false,
    description:
      "For freelancers and small teams who need more freedom and flexibility.",
    features: [
      "Up to 50 projects in the cloud",
      "Export up to 4K",
      "Advanced editing toolkit",
      "Team collaboration (up to 5 members)",
      "Access to premium template library",
    ],
  },
  {
    tier: "Pro",
    priceMonthly: "$19,99/m",
    priceYearly: "$199,99/y",
    pro: true,
    description:
      "For studios, agencies, and professional creators working with brands.",
    features: [
      "Unlimited projects",
      "Export up to 8K + animations",
      "AI-powered content generation tools",
      "Unlimited team members",
      "Brand customization",
    ],
  },
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 6L9 17l-5-5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AuraPricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="c3-pricing-section">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="c3-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.5"
            numOctaves={2}
            stitchTiles="stitch"
          />
          <feComponentTransfer>
            <feFuncA type="linear" slope={0.075} />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" result="noise" />
          <feBlend in="SourceGraphic" in2="noise" mode="overlay" />
        </filter>
      </svg>

      <div className="c3-watermark-container">
        <div className="c3-watermark-main">
          <span className="c3-watermark-line-1">Your email.</span>
          <span className="c3-watermark-line-2">Revitalized</span>
        </div>
      </div>

      <div className="c3-grid">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`c3-card ${plan.pro ? "c3-card-pro" : ""}`}
          >
            <div className="c3-tier-small">{plan.tier}</div>
            <div className="c3-tier-large">
              {plan.tier === "Free"
                ? plan.price
                : yearly
                ? plan.priceYearly
                : plan.priceMonthly}
            </div>
            <p className="c3-desc">{plan.description}</p>
            <ul className="c3-list">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <span className="c3-check">
                    <CheckIcon />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <button type="button" className="c3-btn">
              Choose Plan
            </button>
          </div>
        ))}
      </div>

      <div className="c3-toggle-wrap">
        <span className="text-sm text-white/70">Yearly</span>
        <button
          type="button"
          onClick={() => setYearly((y) => !y)}
          className={`c3-toggle ${yearly ? "active" : ""}`}
          aria-pressed={yearly}
        >
          <span className="c3-toggle-knob" />
        </button>
      </div>
    </section>
  );
}
