"use client";

import { motion } from "motion/react";
import { Search } from "lucide-react";

import { AppleLogo } from "./aura-primitives";

const MENU_ITEMS = ["File", "Edit", "View", "Go", "Window", "Help"];

export function AuraMenuBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.9, ease: "easeOut" }}
      className="relative z-10 h-10 bg-black/40 backdrop-blur-md border-t border-b border-white/10"
    >
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between text-xs">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <AppleLogo className="w-3.5 h-3.5" />
            <span className="font-bold text-white">Aura</span>
          </div>
          {MENU_ITEMS.map((item, i) => (
            <span
              key={item}
              className={`text-white/60 ${i > 2 ? "hidden sm:inline" : ""} ${
                i > 3 ? "hidden md:inline" : ""
              }`}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 text-white/60">
          <Search className="w-3.5 h-3.5" />
          <span>Wed May 6 1:09 PM</span>
        </div>
      </div>
    </motion.div>
  );
}
