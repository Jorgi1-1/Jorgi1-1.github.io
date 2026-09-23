"use client";

import { motion } from "motion/react";

import { SectionEyebrow } from "./aura-primitives";

const CHIPS = [
  "Auto-categorize",
  "Snooze for later",
  "Silent newsletters",
  "One-tap unsubscribe",
];

const TRIAGE_GROUPS = [
  {
    label: "Priority",
    count: 4,
    color: "#ffffff",
    items: ["Sophia Chen — Q3 review", "David Lim — contract signoff"],
  },
  {
    label: "Follow-up",
    count: 7,
    color: "#e5e5e5",
    items: ["Marcus — design review", "Figma — comment thread"],
  },
  {
    label: "Updates",
    count: 18,
    color: "#a3a3a3",
    items: ["Vercel — deploy ready", "GitHub — PR #482 merged"],
  },
  {
    label: "Archived",
    count: 13,
    color: "#525252",
    items: ["Stripe payout · Newsletter · Receipts"],
  },
];

export function AuraFeatureTriage() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <SectionEyebrow label="Triage" tag="AI-native" />
          <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02]">
            Clear your inbox
            <br />
            in a single pass.
          </h2>
          <p className="mt-6 text-white/60 text-base leading-[1.6] max-w-md">
            Aura reads every message, understands intent, and routes the
            noise away from the signal. Focus on what moves your day forward
            — the rest handles itself.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <span
                key={chip}
                className="text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]"
              >
                {chip}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="aura-liquid-glass rounded-2xl p-5">
          <span className="text-xs text-white/50">
            Today · 42 messages triaged
          </span>

          <div className="mt-4 flex flex-col gap-3">
            {TRIAGE_GROUPS.map((group) => (
              <div key={group.label} className="aura-liquid-glass rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.label}
                  <span className="text-white/40">({group.count})</span>
                </div>
                <p className="mt-1.5 text-[11px] text-white/50 leading-relaxed">
                  {group.items.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
