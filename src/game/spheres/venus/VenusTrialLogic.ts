/**
 * Venus trial logic — Kypria's three-phase encounter.
 *
 * Each phase scores three independent virtues:
 *   - attuned (presence held without rushing)
 *   - truthful (response refuses easy flattery)
 *   - non-performative (no spectacle)
 *
 * Pass requires score ≥ 7 across all three phases (max 9).
 */
import type { SaveSlot } from "../../types";

export type VenusTrialPhaseId =
  | "beauty_without_witness"
  | "beloved_without_recognition"
  | "ugliness_that_is_own";

export type VenusTrialPhase = {
  id: VenusTrialPhaseId;
  title: string;
  prompt: string;
};

export const VENUS_TRIAL_PHASES: VenusTrialPhase[] = [
  {
    id: "beauty_without_witness",
    title: "Beauty without Witness",
    prompt: "A beauty arrives that asks nothing of you.",
  },
  {
    id: "beloved_without_recognition",
    title: "Beloved without Recognition",
    prompt: "A beloved arrives who does not return your image.",
  },
  {
    id: "ugliness_that_is_own",
    title: "Ugliness that is One's Own",
    prompt: "An ugliness arrives that is yours and does not flatter.",
  },
];

export type VenusTrialState = {
  phaseIndex: number;
  score: number;
  attuneScores: number[];
};

export function initialVenusTrialState(): VenusTrialState {
  return { phaseIndex: 0, score: 0, attuneScores: [] };
}

export function scoreVenusTrialResponse(args: {
  attuned: boolean;
  truthful: boolean;
  nonPerformative: boolean;
}): number {
  let score = 0;
  if (args.attuned) score += 1;
  if (args.truthful) score += 1;
  if (args.nonPerformative) score += 1;
  return score;
}

/** Pass threshold is 7 of 9 — same as venusConfig.trialPassThreshold. */
export const VENUS_TRIAL_PASS = 7;

export function venusTrialPassed(state: VenusTrialState): boolean {
  return state.score >= VENUS_TRIAL_PASS;
}

export function awardVenusTrialPass(save: SaveSlot, inscription: string): void {
  save.garmentsReleased = { ...save.garmentsReleased, venus: true };
  save.sphereVerbs = { ...save.sphereVerbs, attune: true };
  if (!save.relics.includes(inscription)) {
    save.relics.push(inscription);
  }
  save.flags["sphere_venus_trial_passed"] = true;
}
