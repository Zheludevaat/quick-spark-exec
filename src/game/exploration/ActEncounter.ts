/**
 * ActEncounter — a larger authored beat inside an act.
 *
 * Where `ActInteraction` is a single press, an `ActEncounter` is a small
 * arc: a side soul, a hidden knot, a threshold presence, or a residue
 * scene that fires on revisit. Encounters track their own progression /
 * completion via save flags and expose start/resolve/revisit hooks so the
 * adopting scene can defer all narrative orchestration to one shared
 * registration site.
 */
import type { SaveSlot } from "../types";

export type ActEncounterCategory =
  | "sideSoul"
  | "knot"
  | "thresholdPresence"
  | "governorForeshadow"
  | "residue"
  | "optionalMemory";

export type ActEncounter<TScene = unknown> = {
  id: string;
  zoneId: string;
  category: ActEncounterCategory;
  introText: string[];
  progressionFlags?: string[];
  completionFlags?: string[];
  onStart: (scene: TScene, save: SaveSlot) => void;
  onResolve?: (scene: TScene, save: SaveSlot) => void;
  onRevisit?: (scene: TScene, save: SaveSlot) => void;
};

export function encounterStarted<TScene>(
  flags: Record<string, boolean>,
  encounter: ActEncounter<TScene>,
): boolean {
  return !!encounter.progressionFlags?.some((f) => !!flags[f]);
}

export function encounterComplete<TScene>(
  flags: Record<string, boolean>,
  encounter: ActEncounter<TScene>,
): boolean {
  if (!encounter.completionFlags || encounter.completionFlags.length === 0) {
    return false;
  }
  return encounter.completionFlags.every((f) => !!flags[f]);
}
