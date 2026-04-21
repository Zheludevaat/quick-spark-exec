/**
 * Sphere Template — config-driven scaffolding for the seven planetary acts.
 *
 * Every sphere act is two scenes: a Plateau (lateral soul work + 4 ops +
 * cracking question) and a Trial (governor encounter using the sphere's
 * signature verb). The shared SpherePlateauScene / SphereTrialScene below
 * read a SphereConfig and render the correct theme.
 *
 * The Moon sphere keeps its hand-crafted scenes for now (Athanor + 4 ops +
 * SealedVessel). Mercury onward uses this template exclusively.
 */
import type { SaveSlot, SphereKey, SceneKey } from "../types";

export type SphereVerb = "name" | "attune" | "stand" | "weigh" | "release";

/** A small inquiry option used in the cracking question and trial. */
export type SphereOption = {
  label: string;
  reply: string;
  /** Score weight for trial pass/fail. Higher = more aligned with verb. */
  weight: number;
  /** Optional flag to set on the save. */
  flag?: string;
  /** Optional conviction key to mark true. */
  conviction?: string;
  /** Inquiry choice tag. Defaults to "ask". */
  choice?: "observe" | "ask" | "confess" | "silent";
};

/** One plateau "operation" — a small inquiry that awards a sphere shard. */
export type SphereOperation = {
  id: string;
  title: string;
  prompt: { who: string; text: string };
  options: SphereOption[];
  /** Stat nudge for picking the heaviest option. */
  rewardStat?: "clarity" | "compassion" | "courage";
};

/** A named soul case at the plateau (lighter than full SoulArc). */
export type PlateauSoul = {
  id: string;
  name: string;
  prompt: { who: string; text: string };
  options: SphereOption[];
};

export type SphereConfig = {
  id: SphereKey;
  /** Display name e.g. "MERCURY". */
  label: string;
  /** Governor name e.g. "HERMAIA". */
  governor: string;
  /** Signature verb unlocked on trial pass. */
  verb: SphereVerb;
  /** Background color (hex string for Phaser). */
  bg: string;
  /** Accent color (number). */
  accent: number;
  /** Plateau scene key — auto-derived. */
  plateauScene: SceneKey;
  /** Trial scene key — auto-derived. */
  trialScene: SceneKey;
  /** Opening dialog when the plateau first loads. */
  opening: { who: string; text: string }[];
  /** 3 named soul cases. */
  souls: [PlateauSoul, PlateauSoul, PlateauSoul];
  /** 4 sub-operations. */
  operations: [SphereOperation, SphereOperation, SphereOperation, SphereOperation];
  /** The cracking question — defines the trial. */
  crackingQuestion: { prompt: { who: string; text: string }; options: SphereOption[] };
  /** Trial governor's opening line. */
  trialOpening: { who: string; text: string }[];
  /** Trial round prompts (3-5 rounds). */
  trialRounds: { prompt: { who: string; text: string }; options: SphereOption[] }[];
  /** Pass dialog. */
  trialPass: { who: string; text: string }[];
  /** Fail dialog. */
  trialFail: { who: string; text: string }[];
  /** Inscription written into save.relics on trial pass. */
  inscription: string;
  /** Soft-ending text if player chooses "settle here". */
  settleText: string[];
};

/** Per-sphere progress stored on the save under flags. */
export function plateauProgressKey(s: SphereKey): string {
  return `sphere_${s}_plateau_done`;
}
export function trialPassedKey(s: SphereKey): string {
  return `sphere_${s}_trial_passed`;
}

/** Derived: how many of the 4 operations the player has completed. */
export function opsCompleted(save: SaveSlot, sphere: SphereKey, opIds: string[]): number {
  return opIds.filter((id) => !!save.flags[`sphere_${sphere}_op_${id}`]).length;
}

export function markOpDone(save: SaveSlot, sphere: SphereKey, opId: string): void {
  save.flags[`sphere_${sphere}_op_${opId}`] = true;
}
