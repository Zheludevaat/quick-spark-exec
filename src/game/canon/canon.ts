/**
 * Thin wrapper over the canonical registry. Preserves all legacy
 * exports so existing call sites keep compiling, but every chapter /
 * scene identity is now derived from `src/game/canon/registry.ts`.
 */
import {
  CHAPTER_REGISTRY,
  SCENE_REGISTRY,
  SCENE_KEYS,
  type CanonChapterKey as RegistryChapterKey,
  type CanonSceneRole as RegistrySceneRole,
  type SceneKey,
  type SphereKey,
} from "./registry";

export type CanonChapterKey = RegistryChapterKey;
export type CanonSceneRole = RegistrySceneRole;

export const DAIMON_CANON_NAME = "Sophene" as const;

export const ELEMENTAL_GUARDIANS = {
  air: "Zephyros",
  fire: "Pyralis",
  water: "Undine",
  earth: "Chthonia",
} as const;

export const GOVERNOR_BY_SPHERE: Record<SphereKey, string> = {
  moon: "Selenos",
  mercury: "Hermaia",
  venus: "Kypria",
  sun: "Helion",
  mars: "Areon",
  jupiter: "Jovian",
  saturn: "Kronikos",
};

export const SPHERE_QUESTION: Record<SphereKey, string> = {
  moon: "What in you is image, and what in you sees the image?",
  mercury: "Are you using language to reveal, or to evade?",
  venus: "Do you love what is, or do you want to possess what moves you?",
  sun: "Who are you when no one is watching?",
  mars: "What does your strength serve?",
  jupiter: "What are your systems for?",
  saturn: "What remains when all structures fail?",
};

export const GARMENT_LABEL: Record<SphereKey, string> = {
  moon: "image / imagination / bodily identification",
  mercury: "cleverness / rhetoric / rationalization",
  venus: "desire / beauty hunger / possession",
  sun: "persona / recognition / protagonist need",
  mars: "force / struggle / control",
  jupiter: "order / justice / savior mission",
  saturn: "limitation / inevitability / final refusal",
};

export const MAJOR_PLATEAU_BY_SPHERE: Record<SphereKey, string> = {
  moon: "The Mirror's Palace",
  mercury: "The Tower of Reasons",
  venus: "The Eternal Biennale",
  sun: "Hall of Illuminated Testimony",
  mars: "Arena of the Strong",
  jupiter: "Grand Tribunal of Perfect Justice",
  saturn: "The Avenue of Accepted Fate",
};

export const ATTACHED_DISTRICT_BY_SPHERE: Record<SphereKey, string> = {
  moon: "Material Campus",
  mercury: "The House of Inevitable Tea",
  venus: "The Ladder of Lovers",
  sun: "Sanctuary of Radiance",
  mars: "Archive of Perpetual Struggle",
  jupiter: "The Messianic Camp",
  saturn: "Gnostic Threshold",
};

export const SPHERE_VERB_BY_SPHERE: Record<SphereKey, string> = {
  moon: "Witness",
  mercury: "Name",
  venus: "Attune",
  sun: "Expose",
  mars: "Stand",
  jupiter: "Weigh",
  saturn: "Release",
};

/** Public chapter title per chapter key — derived from registry. */
export const CHAPTER_TITLE: Record<CanonChapterKey, string> = (() => {
  const out = {} as Record<CanonChapterKey, string>;
  for (const c of Object.values(CHAPTER_REGISTRY)) out[c.key] = c.title;
  return out;
})();

export const CANON_SCENE_CHAPTER: Record<SceneKey, CanonChapterKey> = (() => {
  const out = {} as Record<SceneKey, CanonChapterKey>;
  for (const k of SCENE_KEYS) out[k] = SCENE_REGISTRY[k].chapter;
  return out;
})();

export const CANON_SCENE_ROLE: Record<SceneKey, CanonSceneRole> = (() => {
  const out = {} as Record<SceneKey, CanonSceneRole>;
  for (const k of SCENE_KEYS) out[k] = SCENE_REGISTRY[k].role;
  return out;
})();

export function chapterTitleForScene(scene: SceneKey): string {
  return CHAPTER_TITLE[CANON_SCENE_CHAPTER[scene]];
}

export function isSecretAlchemyScene(scene: SceneKey): boolean {
  return SCENE_REGISTRY[scene].role === "secret_annex";
}
