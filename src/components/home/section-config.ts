export type SectionId = "about" | "stack" | "kanso" | "galeria" | "contact";

export type SectionConfig = {
  id: SectionId;
  label: string;
  color: string;
};

type SectionMeta = { id: SectionId; label: string };

const SECTION_META: SectionMeta[] = [
  { id: "about", label: "Sobre mí" },
  { id: "stack", label: "Stack" },
  { id: "kanso", label: "Kanso Studio" },
  { id: "galeria", label: "Galería" },
  { id: "contact", label: "Contacto" },
];

/**
 * Muted section palette shared by the entry wipe and the totem. Each color
 * clears ~5–7:1 against the dark theme's near-black ground.
 */
const DARK_COLORS: Record<SectionId, string> = {
  about: "#93A29B",
  stack: "#928F91",
  kanso: "#917C87",
  galeria: "#8E5572",
  contact: "#B7245C",
};

/**
 * Same hues as DARK_COLORS, darkened (and resaturated where needed) to
 * clear ~4.7:1 against the light theme's cream ground (#f4efe2). The dark
 * values fall below WCAG AA there for about, stack, and kanso.
 */
const LIGHT_COLORS: Record<SectionId, string> = {
  about: "#557063",
  stack: "#6D696C",
  kanso: "#816172",
  galeria: "#925172",
  contact: "#B7245C",
};

/** Resolves the section list against whichever theme is actually on screen. */
export function getSections(isDark: boolean): SectionConfig[] {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  return SECTION_META.map((meta) => ({ ...meta, color: colors[meta.id] }));
}

function relativeLuminance(hex: string): number {
  const channels = hex.replace("#", "").match(/.{2}/g);
  if (!channels) return 0;
  const [r, g, b] = channels
    .map((h) => parseInt(h, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(l1: number, l2: number): number {
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

/** Near-black or near-cream, whichever contrasts more with `hex`. */
export function getReadableTextColor(hex: string): string {
  const bg = relativeLuminance(hex);
  const blackContrast = contrastRatio(bg, 0);
  const whiteContrast = contrastRatio(bg, 1);
  return blackContrast >= whiteContrast ? "#16130f" : "#f4efe2";
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = (hex.replace("#", "").match(/.{2}/g) ?? ["00", "00", "00"]).map(
    (h) => parseInt(h, 16) / 255
  );
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * The section color at full saturation and high lightness, used as the
 * foreground of an open section. Contrast against its own base is limited
 * by design; the dark rims in color-totem-nav.css carry legibility.
 */
export function getNeonColor(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  // A near-gray hue is unstable; use a neon white instead.
  if (s < 0.06) return "#f2f6ff";
  return hslToHex(h, 1, Math.max(l + 0.22, 0.78));
}
