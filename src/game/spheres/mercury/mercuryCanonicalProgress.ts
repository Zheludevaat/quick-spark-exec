import type { SaveSlot } from "../../types";
import { plateauProgressKey, trialPassedKey } from "../types";

type LegacyStat = "clarity" | "compassion" | "courage" | undefined;
type GarmentKey =
  | "moon"
  | "mercury"
  | "venus"
  | "sun"
  | "mars"
  | "jupiter"
  | "saturn";

type ResonanceAxis =
  | "witnessing"
  | "control"
  | "possession"
  | "performance"
  | "struggle"
  | "structure"
  | "surrender";

type CanonicalSave = SaveSlot & {
  clarityPoints?: number;
  coherence?: number;
  garmentWeights?: Partial<Record<GarmentKey, number>>;
  resonanceProfile?: Partial<Record<ResonanceAxis, number>>;
  sphereVerbs?: SaveSlot["sphereVerbs"] & { witness?: boolean; expose?: boolean };
  relics?: string[];
  garmentsReleased?: Partial<Record<GarmentKey, boolean>>;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function asCanonical(save: SaveSlot): CanonicalSave {
  const s = save as CanonicalSave;

  if (typeof s.clarityPoints !== "number") s.clarityPoints = save.stats?.clarity ?? 0;
  if (typeof s.coherence !== "number") s.coherence = 100;

  if (!s.garmentWeights) {
    s.garmentWeights = {
      moon: 3,
      mercury: 3,
      venus: 3,
      sun: 3,
      mars: 3,
      jupiter: 3,
      saturn: 3,
    };
  }

  if (!s.resonanceProfile) {
    s.resonanceProfile = {
      witnessing: 0,
      control: 0,
      possession: 0,
      performance: 0,
      struggle: 0,
      structure: 0,
      surrender: 0,
    };
  }

  if (!s.sphereVerbs) {
    s.sphereVerbs = {
      witness: true,
      name: false,
      attune: false,
      expose: false,
      stand: false,
      weigh: false,
      release: false,
    };
  } else if (typeof s.sphereVerbs.witness !== "boolean") {
    s.sphereVerbs.witness = true;
  }

  if (!Array.isArray(s.relics)) s.relics = [];
  if (!s.garmentsReleased) s.garmentsReleased = {};

  return s;
}

function shiftResonance(save: CanonicalSave, axis: ResonanceAxis, delta: number) {
  const cur = save.resonanceProfile?.[axis] ?? 0;
  if (save.resonanceProfile) {
    save.resonanceProfile[axis] = clamp(cur + delta, -7, 7);
  }
}

export function ensureMercuryCanon(save: SaveSlot) {
  asCanonical(save);
}

export function awardMercuryOperation(
  save: SaveSlot,
  rewardStat: LegacyStat,
  axis: ResonanceAxis,
  clarityBonus = 1,
  coherenceBonus = 1,
) {
  const s = asCanonical(save);

  if (rewardStat) {
    save.stats[rewardStat] += 1;
  }

  s.clarityPoints = (s.clarityPoints ?? 0) + clarityBonus;
  s.coherence = clamp((s.coherence ?? 100) + coherenceBonus, 0, 100);
  shiftResonance(s, axis, 1);
}

export function awardMercuryCrack(save: SaveSlot) {
  const s = asCanonical(save);
  save.flags[plateauProgressKey("mercury")] = true;
  s.clarityPoints = (s.clarityPoints ?? 0) + 2;
  s.coherence = clamp((s.coherence ?? 100) + 2, 0, 100);
  shiftResonance(s, "witnessing", 1);
  shiftResonance(s, "structure", 1);
}

export function applyMercuryTrialPass(save: SaveSlot, inscription: string) {
  const s = asCanonical(save);

  save.flags[trialPassedKey("mercury")] = true;
  s.garmentsReleased = { ...s.garmentsReleased, mercury: true };
  if (s.garmentWeights) s.garmentWeights.mercury = 0;
  if (s.sphereVerbs) s.sphereVerbs.name = true;

  if (!s.relics?.includes(inscription)) {
    s.relics?.push(inscription);
  }

  s.clarityPoints = (s.clarityPoints ?? 0) + 3;
  s.coherence = clamp((s.coherence ?? 100) + 5, 0, 100);
  shiftResonance(s, "witnessing", 1);
  shiftResonance(s, "structure", 1);
}

export function applyMercuryTrialFail(save: SaveSlot, penalty = 15) {
  const s = asCanonical(save);
  s.coherence = clamp((s.coherence ?? 100) - penalty, 0, 100);
}
