import { BrandMark } from "./brand-mark";

/**
 * The hero set piece: a lit backdrop, two cream cylinders and a floating
 * capsule, all drawn with CSS gradients/blurs and one inline SVG relief so
 * the section needs no image or video assets at all.
 */
export function HeroScene() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="cw-hero-base" />
      <div className="cw-hero-panel" />
      <div className="cw-hero-shaft" />
      <div className="cw-hero-foliage-left" />
      <div className="cw-hero-foliage-right" />

      <div className="cw-pedestal-body cw-pedestal-left">
        <div className="cw-pedestal-cap" />
      </div>
      <div className="cw-pedestal-body cw-pedestal-center">
        <div className="cw-pedestal-cap" />
      </div>

      <div className="cw-capsule-shadow" />
      <div className="cw-capsule">
        <BrandMark className="cw-capsule-emboss" />
      </div>

      <div className="cw-hero-vignette" />
      <div className="cw-hero-scrim" />
    </div>
  );
}
