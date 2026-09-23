"use client";

import { motion } from "motion/react";
import { Menu } from "lucide-react";

import { AppleButton, LogoMark } from "./aura-primitives";

const NAV_LINKS = ["Solutions", "Pricing", "Blog", "Documentation", "Careers"];

export function AuraNavbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative z-10 max-w-6xl mx-auto px-6 h-20 flex items-center justify-between"
    >
      <LogoMark className="w-8 h-8" />

      <div className="hidden md:flex gap-8">
        {NAV_LINKS.map((link, i) => (
          <motion.a
            key={link}
            href="#"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: "easeOut" }}
            className="text-white/70 text-sm font-medium hover:text-white"
          >
            {link}
          </motion.a>
        ))}
      </div>

      <div className="hidden md:block">
        <AppleButton />
      </div>

      <button
        type="button"
        aria-label="Open menu"
        className="md:hidden w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"
      >
        <Menu className="w-4 h-4" />
      </button>
    </motion.nav>
  );
}
