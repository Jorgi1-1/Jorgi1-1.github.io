/**
 * Imperative bridge between the totem stripes and the hero. Hover state is
 * written straight to the root element so hovering never re-renders React.
 * Each effect has its own entry point so it can be retimed or disabled
 * independently.
 */

/**
 * Headline text/outline color (--totem-hover-accent). CSS transitions
 * animate it back to rest when cleared. The section it belongs to goes to
 * `data-totem-hover`, which Qull reads to pick a mood.
 */
export function setTotemAccentColor(color: string | null, section?: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (color) {
    root.style.setProperty("--totem-hover-accent", color);
    if (section) root.setAttribute("data-totem-hover", section);
    else root.removeAttribute("data-totem-hover");
  } else {
    root.style.removeProperty("--totem-hover-accent");
    root.removeAttribute("data-totem-hover");
  }
}

/**
 * Background wave (.hero-wave). The color is left set on hover-end so the
 * fade-out can finish.
 *
 * Switching directly between stripes replays the full sweep: the transition
 * is suppressed, snapped back to rest, laid out, then re-triggered with the
 * new color.
 */
export function setTotemWaveColor(color: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (color) {
    const alreadyActive = root.hasAttribute("data-totem-wave");
    if (alreadyActive) {
      root.setAttribute("data-totem-wave-restart", "1");
      root.style.setProperty("--totem-wave-color", color);
      void root.offsetWidth;
      root.removeAttribute("data-totem-wave-restart");
    } else {
      root.style.setProperty("--totem-wave-color", color);
      root.setAttribute("data-totem-wave", "1");
    }
  } else {
    root.removeAttribute("data-totem-wave");
  }
}

/**
 * Marks the hero as fully covered by an open section so its shader, mask,
 * and outline stop compositing underneath. Set only once the color covers
 * the screen; cleared before it shrinks.
 */
export function setHeroCovered(covered: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (covered) root.setAttribute("data-hero-covered", "");
  else root.removeAttribute("data-hero-covered");
}

const CHROMA_WAVE_EVENT = "totem-chroma-wave";

/**
 * Wave inside the WebGPU shader (ChromaFlow's `baseColor`). The shader
 * library only reads React props, so the color is broadcast as a DOM event
 * and hero-shader-layers.tsx tweens the prop.
 */
export function setTotemChromaWaveColor(color: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string | null>(CHROMA_WAVE_EVENT, { detail: color }));
}

/** Subscribe to setTotemChromaWaveColor's broadcasts. Returns an unsubscribe function. */
export function onTotemChromaWave(handler: (color: string | null) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => handler((event as CustomEvent<string | null>).detail);
  window.addEventListener(CHROMA_WAVE_EVENT, listener);
  return () => window.removeEventListener(CHROMA_WAVE_EVENT, listener);
}

const OPEN_SECTION_EVENT = "totem-open-section";

/**
 * Opens a section from outside the totem (the hero's identity chip). The
 * totem is a client-only chunk, so the request goes out as a DOM event.
 */
export function requestOpenSection(id: string, trigger?: HTMLElement) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SECTION_EVENT, { detail: { id, trigger } }));
}

/** Subscribe to requestOpenSection. Returns an unsubscribe function. */
export function onOpenSectionRequest(handler: (id: string, trigger?: HTMLElement) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const { id, trigger } = (event as CustomEvent<{ id: string; trigger?: HTMLElement }>).detail;
    handler(id, trigger);
  };
  window.addEventListener(OPEN_SECTION_EVENT, listener);
  return () => window.removeEventListener(OPEN_SECTION_EVENT, listener);
}
