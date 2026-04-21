import type {
  GarmentKey,
  ResonanceProfile,
  SaveSlot,
} from "../types";
import { grantAlchemyHint } from "./alchemySecret";

const DEFAULT_GARMENTS: Record<GarmentKey, number> = {
  moon: 3,
  mercury: 3,
  venus: 3,
  sun: 3,
  mars: 3,
  jupiter: 3,
  saturn: 3,
};

const DEFAULT_RESONANCE: ResonanceProfile = {
  witnessing: 0,
  control: 0,
  possession: 0,
  performance: 0,
  struggle: 0,
  structure: 0,
  surrender: 0,
};

function renameFlag(flags: Record<string, boolean>, from: string, to: string) {
  if (flags[from] && !flags[to]) flags[to] = true;
}

export function applyCanonMigration(save: SaveSlot): SaveSlot {
  // Sophene rename — preserve old flags as compatibility, mirror to new.
  renameFlag(save.flags, "soryn_threshold_intro_seen", "sophene_threshold_intro_seen");
  renameFlag(save.flags, "soryn_daimon_intro_seen", "sophene_daimon_intro_seen");
  renameFlag(save.flags, "soryn_bound", "sophene_bound");
  renameFlag(save.flags, "soryn_release_seen", "sophene_release_seen");

  // Guardian renames.
  renameFlag(save.flags, "guardian_intro_air", "guardian_intro_zephyros");
  renameFlag(save.flags, "guardian_intro_fire", "guardian_intro_pyralis");
  renameFlag(save.flags, "guardian_intro_water", "guardian_intro_undine");
  renameFlag(save.flags, "guardian_intro_earth", "guardian_intro_chthonia");

  if (typeof save.clarityPoints !== "number") {
    save.clarityPoints = save.stats?.clarity ?? 0;
  }

  if (!save.garmentWeights) {
    save.garmentWeights = { ...DEFAULT_GARMENTS };
  }

  for (const sphere of Object.keys(save.garmentsReleased ?? {}) as GarmentKey[]) {
    if (save.garmentsReleased[sphere]) save.garmentWeights[sphere] = 0;
  }

  if (!save.resonanceProfile) {
    save.resonanceProfile = { ...DEFAULT_RESONANCE };
  }

  if (!Array.isArray(save.memoryLattice)) {
    save.memoryLattice = Array.isArray(save.shards) ? [...save.shards] : [];
  }

  if (typeof save.sopheneNamed !== "boolean") {
    save.sopheneNamed =
      !!save.flags["sophene_bound"] || !!save.flags["sophene_threshold_intro_seen"];
  }

  // Ensure sphereVerbs has all canonical verbs (witness/expose) defaulting safe.
  save.sphereVerbs = {
    witness: true,
    name: save.sphereVerbs?.name ?? false,
    attune: save.sphereVerbs?.attune ?? false,
    expose: (save.sphereVerbs as { expose?: boolean } | undefined)?.expose ?? false,
    stand: save.sphereVerbs?.stand ?? false,
    weigh: save.sphereVerbs?.weigh ?? false,
    release: save.sphereVerbs?.release ?? false,
  };

  // Compatibility bridge: old Athanor progress => unlock secret annex hints.
  if (
    save.blackStones > 0 ||
    save.whiteStones > 0 ||
    save.yellowStones > 0 ||
    save.redStones > 0 ||
    save.goldStone
  ) {
    grantAlchemyHint(save, "reception_basin");
    grantAlchemyHint(save, "moon_flaw");
    grantAlchemyHint(save, "metaxy_whisper");
  }

  return save;
}
