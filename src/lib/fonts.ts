import { MuseoModerno, Schibsted_Grotesk } from "next/font/google";

// Loaded once here so the hero and the section panels share one instance.
export const displayFont = MuseoModerno({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-display",
});

export const bodyFont = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});
