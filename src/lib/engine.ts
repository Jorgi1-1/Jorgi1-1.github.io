/**
 * WebKit: Safari, and every browser on iOS. It rasterizes SVG filters and
 * luminance masks on the CPU, so a few effects take a cheaper route there.
 * Browser-only; false on the server.
 */
export function isWebKit() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
}
