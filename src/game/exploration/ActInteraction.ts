/**
 * ActInteraction — a single local interactable inside an act scene.
 *
 * Interactions are the atomic unit of "things you can press A near" in an
 * explorable act: an inspectable object, a quiet ritual, an NPC point, a
 * gate, a memory mark, or a portal into a `PuzzleChamberScene`.
 *
 * Visibility and prompt state are derived purely from `save.flags`, so
 * interactions can hide until prerequisite flags fire and rephrase
 * themselves on revisit (`onceFlag` + `repeatPrompt`).
 *
 * Puzzle integration: setting `kind: "puzzle"` and `puzzleRoomId` lets the
 * adopting scene route the press into the existing puzzle runtime
 * (src/game/puzzles/PuzzleChamberScene.ts) without each scene wiring its
 * own portal logic.
 */
import type { SaveSlot } from "../types";

export type ActInteractionKind =
  | "inspect"
  | "npc"
  | "ritual"
  | "puzzle"
  | "gate"
  | "memory";

export type ActInteractionContext<TScene = unknown> = {
  scene: TScene;
  save: SaveSlot;
};

export type ActInteraction<TScene = unknown> = {
  id: string;
  zoneId: string;
  x: number;
  y: number;
  radius: number;
  kind: ActInteractionKind;
  prompt: string;
  /** Prompt shown after `onceFlag` is set, if defined. */
  repeatPrompt?: string;
  /** All of these flags must be set for the interaction to be enabled. */
  requiredFlags?: string[];
  /** All of these flags must be set for the interaction to even appear. */
  hiddenUntilFlags?: string[];
  /** Flag that, once set, marks this interaction as "seen once". */
  onceFlag?: string;
  aftermathStyle?: "soften" | "mark" | "unlock" | "tone_shift";
  /** Optional puzzle room id (used when kind === "puzzle"). */
  puzzleRoomId?: string;
  onInteract: (ctx: ActInteractionContext<TScene>) => void;
};

export function interactionVisible(
  flags: Record<string, boolean>,
  it: ActInteraction,
): boolean {
  if (it.hiddenUntilFlags && !it.hiddenUntilFlags.every((f) => !!flags[f])) {
    return false;
  }
  return true;
}

export function interactionEnabled(
  flags: Record<string, boolean>,
  it: ActInteraction,
): boolean {
  if (!interactionVisible(flags, it)) return false;
  if (it.requiredFlags && !it.requiredFlags.every((f) => !!flags[f])) {
    return false;
  }
  return true;
}

export function interactionPrompt(
  flags: Record<string, boolean>,
  it: ActInteraction,
): string {
  if (it.onceFlag && flags[it.onceFlag] && it.repeatPrompt) return it.repeatPrompt;
  return it.prompt;
}

/** Pick the closest visible+enabled interaction within radius of a point. */
export function nearestInteraction<TScene>(
  flags: Record<string, boolean>,
  list: ActInteraction<TScene>[],
  x: number,
  y: number,
): ActInteraction<TScene> | null {
  let best: ActInteraction<TScene> | null = null;
  let bd = Infinity;
  for (const it of list) {
    if (!interactionEnabled(flags, it)) continue;
    const dx = x - it.x;
    const dy = y - it.y;
    const d = dx * dx + dy * dy;
    if (d < it.radius * it.radius && d < bd) {
      bd = d;
      best = it;
    }
  }
  return best;
}
