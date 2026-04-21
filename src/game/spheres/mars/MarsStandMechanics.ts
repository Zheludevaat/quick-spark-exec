/**
 * Stand mechanics — small "hold target" data type used by the Mars plateau.
 *
 * The plateau spatializes Areon's three lessons: stand still on the mark,
 * remain stable for needMs, and the lesson resolves. No combat, no menus —
 * the player's body in the room is the answer.
 */
export type HoldTarget = {
  id: string;
  x: number;
  y: number;
  radius: number;
  needMs: number;
  holdMs: number;
  done: boolean;
};

export function createHoldTarget(
  id: string,
  x: number,
  y: number,
  radius: number,
  needMs: number,
): HoldTarget {
  return { id, x, y, radius, needMs, holdMs: 0, done: false };
}

export function updateHoldTarget(
  target: HoldTarget,
  dt: number,
  inRange: boolean,
  stable: boolean,
): boolean {
  if (target.done) return true;
  if (!inRange || !stable) {
    target.holdMs = 0;
    return false;
  }
  target.holdMs += dt;
  if (target.holdMs >= target.needMs) {
    target.done = true;
    return true;
  }
  return false;
}
