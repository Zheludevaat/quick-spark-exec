/**
 * VerbInteraction — small reusable mechanics for act verbs.
 *
 * Right now this exposes a "hold-in-place" target used by STAND and
 * stillness rituals: the player must remain inside a small radius and
 * roughly motionless for a required duration. Acts get start/break/
 * complete callbacks so they can pulse a ring, shake on break, or grant
 * a flag on completion without each scene reinventing the timer.
 *
 * Intentionally minimal — additional verb helpers (witness chord, name
 * sequence, attune pairing) can land here as they prove out in scenes.
 */
import type { SaveSlot } from "../types";

export type HoldVerbTarget = {
  id: string;
  x: number;
  y: number;
  radius: number;
  requiredMs: number;
  holdMs: number;
  active: boolean;
  completed: boolean;
  onStart?: () => void;
  onBreak?: () => void;
  onComplete?: () => void;
};

export function createHoldVerbTarget(
  id: string,
  x: number,
  y: number,
  radius: number,
  requiredMs: number,
): HoldVerbTarget {
  return {
    id,
    x,
    y,
    radius,
    requiredMs,
    holdMs: 0,
    active: false,
    completed: false,
  };
}

export function updateHoldVerbTarget(
  target: HoldVerbTarget,
  dt: number,
  inRange: boolean,
  stable: boolean,
): boolean {
  if (target.completed) return true;

  if (!inRange || !stable) {
    if (target.active) target.onBreak?.();
    target.active = false;
    target.holdMs = 0;
    return false;
  }

  if (!target.active) {
    target.active = true;
    target.onStart?.();
  }

  target.holdMs += dt;
  if (target.holdMs >= target.requiredMs) {
    target.completed = true;
    target.onComplete?.();
    return true;
  }

  return false;
}

export function nearPoint(
  obj: { x: number; y: number },
  x: number,
  y: number,
  radius: number,
): boolean {
  const dx = obj.x - x;
  const dy = obj.y - y;
  return dx * dx + dy * dy < radius * radius;
}

export function canUseVerb(
  save: SaveSlot,
  verb: "witness" | "transmute" | "name" | "attune" | "stand" | "weigh" | "release",
): boolean {
  if (verb === "witness" || verb === "transmute") return !!save.verbs[verb];
  return !!save.sphereVerbs[verb];
}
