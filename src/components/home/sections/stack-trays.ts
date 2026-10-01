import type Matter from "matter-js";

/**
 * The Stack section's physics trays, as Qull sees them. Each column
 * registers its tray while its physics runs, so Qull can read the pills,
 * stand on them, and handle them the way the pointer does: by a springy
 * hold at the point it takes them. Coordinates are tray pixels.
 */
type StackPill = { body: Matter.Body; element: HTMLElement };

export type StackHolder = "user" | "qull";

export type StackTray = {
  element: HTMLElement;
  pills: () => StackPill[];
  /** Takes hold of a pill at a point on it. False if the user has it. */
  grab: (body: Matter.Body, point: { x: number; y: number }, holder: StackHolder) => boolean;
  /** Moves the hand holding it; the pill follows on a spring. */
  aim: (body: Matter.Body, point: { x: number; y: number }) => void;
  /** Lets go; with a velocity (px per physics step), throws it. */
  release: (body: Matter.Body, velocity?: { x: number; y: number }) => void;
  heldBy: (body: Matter.Body) => StackHolder | null;
  /** Where on the pill the hand holds it. */
  holdPoint: (body: Matter.Body) => { x: number; y: number } | null;
  /** How far the pill lags behind the hand holding it. */
  stretch: (body: Matter.Body) => number;
  /** Whether Qull's body fits at this tray-pixel rect (see stack-physics). */
  qullFits: (rect: { x: number; y: number; w: number; h: number }, rising?: boolean) => boolean;
  /** Qull's body in this tray, in tray pixels; null when it isn't there. */
  setQull: (rect: { x: number; y: number; w: number; h: number } | null) => void;
};

const trays = new Set<StackTray>();
const grabListeners = new Set<(body: Matter.Body) => void>();

export function registerTray(tray: StackTray) {
  trays.add(tray);
  return () => {
    trays.delete(tray);
  };
}

export function getTrays(): StackTray[] {
  return [...trays];
}

/** Tells Qull when the pointer grabs a pill (it may be the one it holds). */
export function onUserGrab(listener: (body: Matter.Body) => void) {
  grabListeners.add(listener);
  return () => {
    grabListeners.delete(listener);
  };
}

export function notifyUserGrab(body: Matter.Body) {
  grabListeners.forEach((listener) => listener(body));
}
