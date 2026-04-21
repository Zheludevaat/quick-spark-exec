/**
 * Venus puzzle helpers — ATTUNE mechanic and persistent puzzle state.
 *
 * ATTUNE is a hold-state interaction: the player begins attuning at a
 * target, holds presence (no movement, no extra inputs) for a required
 * duration, and either completes (clean) or breaks (rushed/forced).
 */
import type { SaveSlot } from "../../types";

export type AttuneTargetState = "idle" | "active" | "complete" | "broken";

export type AttuneTarget = {
  id: string;
  zone: string;
  state: AttuneTargetState;
  holdMs: number;
  requiredMs: number;
  allowMoveWhileAttuning?: boolean;
  onStart?: () => void;
  onBreak?: () => void;
  onComplete?: () => void;
};

export function createAttuneTarget(
  id: string,
  zone: string,
  requiredMs: number,
  hooks: Partial<Omit<AttuneTarget, "id" | "zone" | "state" | "holdMs" | "requiredMs">> = {},
): AttuneTarget {
  return {
    id,
    zone,
    state: "idle",
    holdMs: 0,
    requiredMs,
    allowMoveWhileAttuning: false,
    ...hooks,
  };
}

export function startAttune(target: AttuneTarget): void {
  if (target.state === "complete") return;
  target.state = "active";
  target.holdMs = 0;
  target.onStart?.();
}

export function breakAttune(target: AttuneTarget): void {
  if (target.state === "complete") return;
  target.state = "broken";
  target.holdMs = 0;
  target.onBreak?.();
}

export function updateAttune(target: AttuneTarget, dt: number): boolean {
  if (target.state !== "active") return false;
  target.holdMs += dt;
  if (target.holdMs >= target.requiredMs) {
    target.state = "complete";
    target.onComplete?.();
    return true;
  }
  return false;
}

export function attuneProgress(target: AttuneTarget): number {
  if (target.state === "complete") return 1;
  if (target.requiredMs <= 0) return 0;
  return Math.min(1, target.holdMs / target.requiredMs);
}

export type VenusPuzzleId =
  | "unfinished_work"
  | "reconstruction_chamber"
  | "release_audience"
  | "ladder_step_1"
  | "ladder_step_2"
  | "ladder_step_3";

export function markVenusPuzzleDone(save: SaveSlot, id: VenusPuzzleId): void {
  save.flags[`venus_puzzle_${id}`] = true;
}

export function isVenusPuzzleDone(save: SaveSlot, id: VenusPuzzleId): boolean {
  return !!save.flags[`venus_puzzle_${id}`];
}
