import type { GarmentKey, SaveSlot, SphereKey } from "../types";

export const DEFAULT_GARMENT_WEIGHTS: Record<GarmentKey, number> = {
  moon: 3,
  mercury: 3,
  venus: 3,
  sun: 3,
  mars: 3,
  jupiter: 3,
  saturn: 3,
};

export function addClarity(save: SaveSlot, amount: number) {
  save.clarityPoints = Math.max(0, (save.clarityPoints ?? 0) + amount);
}

export function drainCoherence(save: SaveSlot, amount: number) {
  save.coherence = Math.max(0, (save.coherence ?? 100) - amount);
}

export function restoreCoherence(save: SaveSlot, amount: number) {
  save.coherence = Math.min(100, (save.coherence ?? 100) + amount);
}

export function changeGarmentWeight(
  save: SaveSlot,
  garment: GarmentKey,
  delta: number,
) {
  const current = save.garmentWeights?.[garment] ?? DEFAULT_GARMENT_WEIGHTS[garment];
  save.garmentWeights[garment] = Math.max(0, Math.min(7, current + delta));
}

export function releaseGarment(save: SaveSlot, sphere: SphereKey) {
  save.garmentsReleased[sphere] = true;
  save.garmentWeights[sphere] = 0;

  switch (sphere) {
    case "moon":
      save.sphereVerbs.witness = true;
      break;
    case "mercury":
      save.sphereVerbs.name = true;
      break;
    case "venus":
      save.sphereVerbs.attune = true;
      break;
    case "sun":
      save.sphereVerbs.expose = true;
      break;
    case "mars":
      save.sphereVerbs.stand = true;
      break;
    case "jupiter":
      save.sphereVerbs.weigh = true;
      break;
    case "saturn":
      save.sphereVerbs.release = true;
      break;
  }
}

export function tiltResonance(
  save: SaveSlot,
  axis: keyof SaveSlot["resonanceProfile"],
  amount: number,
) {
  save.resonanceProfile[axis] = Math.max(
    -7,
    Math.min(7, (save.resonanceProfile[axis] ?? 0) + amount),
  );
}
