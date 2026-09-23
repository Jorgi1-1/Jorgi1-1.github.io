"use client";

import { motion } from "motion/react";

const LOGOS = [
  "Linear",
  "Vercel",
  "Figma",
  "Stripe",
  "Ramp",
  "Notion",
  "Loom",
  "Arc",
];

export function AuraLogoCloud() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-20">
      <p className="text-center text-xs uppercase tracking-widest text-white/40">
        Trusted by the world&apos;s most thoughtful teams
      </p>

      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
        {LOGOS.map((logo, i) => (
          <motion.span
            key={logo}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="text-sm font-semibold tracking-tight text-white/50 hover:text-white text-center"
          >
            {logo}
          </motion.span>
        ))}
      </div>
    </section>
  );
}
