import type { SaveSlot } from "../../types";

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
  memoryLattice?: string[];
  sopheneNamed?: boolean;
  sphereVerbs?: SaveSlot["sphereVerbs"] & {
    witness?: boolean;
    expose?: boolean;
  };
};

type ElemKind = "air" | "fire" | "water" | "earth";

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

  if (!Array.isArray(s.memoryLattice)) s.memoryLattice = [];
  if (typeof s.sopheneNamed !== "boolean") s.sopheneNamed = false;

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

  return s;
}

function clampCoherence(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function shiftResonance(save: CanonicalSave, axis: ResonanceAxis, delta: number) {
  const cur = save.resonanceProfile?.[axis] ?? 0;
  if (save.resonanceProfile) {
    save.resonanceProfile[axis] = Math.max(-7, Math.min(7, cur + delta));
  }
}

export function ensureReceptionCanon(save: SaveSlot) {
  asCanonical(save);
}

export function awardReceptionStone(save: SaveSlot) {
  const s = asCanonical(save);

  // Preserve legacy HUD/stat behavior
  save.stats.courage += 1;

  // Canonical progression
  s.clarityPoints = (s.clarityPoints ?? 0) + 1;
  s.coherence = clampCoherence((s.coherence ?? 100) + 1);
  shiftResonance(s, "structure", 1);
}

export function awardGuardianNamingGift(save: SaveSlot, kind: ElemKind) {
  const s = asCanonical(save);

  // Preserve legacy rewards for current HUD compatibility
  if (kind === "air") save.stats.clarity += 1;
  if (kind === "fire") save.stats.courage += 1;
  if (kind === "water") save.stats.compassion += 1;
  if (kind === "earth") save.stats.clarity += 1;

  // Canonical bridge
  s.clarityPoints = (s.clarityPoints ?? 0) + 1;
  s.coherence = clampCoherence((s.coherence ?? 100) + 2);

  if (kind === "air") shiftResonance(s, "witnessing", 1);
  if (kind === "fire") shiftResonance(s, "control", -1);
  if (kind === "water") shiftResonance(s, "surrender", 1);
  if (kind === "earth") shiftResonance(s, "structure", 1);
}

export function finalizeReceptionBinding(save: SaveSlot) {
  const s = asCanonical(save);

  s.sopheneNamed = true;
  s.coherence = clampCoherence((s.coherence ?? 100) + 4);
  shiftResonance(s, "witnessing", 1);

  const currentMoon = s.garmentWeights?.moon ?? 3;
  if (s.garmentWeights) {
    // Reception can lighten the lunar garment, but not release it.
    s.garmentWeights.moon = Math.max(1, currentMoon - 1);
  }

  if (s.sphereVerbs) {
    s.sphereVerbs.witness = true;
  }
}
