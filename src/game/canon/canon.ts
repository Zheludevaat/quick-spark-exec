import type { SceneKey, SphereKey } from "../types";

export type CanonChapterKey =
  | "prelude"
  | "reception"
  | "moon"
  | "mercury"
  | "venus"
  | "sun"
  | "mars"
  | "jupiter"
  | "saturn"
  | "metaxy"
  | "epilogue";

export type CanonSceneRole =
  | "mainline"
  | "plateau"
  | "trial"
  | "district"
  | "threshold"
  | "connective"
  | "optional_side"
  | "secret_annex"
  | "ending";

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

export const CHAPTER_TITLE: Record<CanonChapterKey, string> = {
  prelude: "PRELUDE - THE LAST DAY",
  reception: "ACT 0 - RECEPTION",
  moon: "ACT I - MOON",
  mercury: "ACT II - MERCURY",
  venus: "ACT III - VENUS",
  sun: "ACT IV - SUN",
  mars: "ACT V - MARS",
  jupiter: "ACT VI - JUPITER",
  saturn: "ACT VII - SATURN",
  metaxy: "METAXY",
  epilogue: "EPILOGUE - BEYOND THE SPHERES",
};

export const CANON_SCENE_CHAPTER: Record<SceneKey, CanonChapterKey> = {
  LastDay: "prelude",
  Crossing: "prelude",
  SilverThreshold: "reception",
  ImaginalRealm: "moon",
  AthanorThreshold: "moon",
  Nigredo: "moon",
  Albedo: "moon",
  Citrinitas: "moon",
  Rubedo: "moon",
  SealedVessel: "moon",
  MetaxyHub: "metaxy",
  MoonTrial: "moon",
  MercuryPlateau: "mercury",
  MercuryTrial: "mercury",
  VenusPlateau: "venus",
  VenusTrial: "venus",
  CuratedSelf: "sun",
  SunPlateau: "sun",
  SunTrial: "sun",
  MarsPlateau: "mars",
  MarsTrial: "mars",
  JupiterPlateau: "jupiter",
  JupiterTrial: "jupiter",
  SaturnPlateau: "saturn",
  SaturnTrial: "saturn",
  EndingsRouter: "epilogue",
  Epilogue: "epilogue",
};

export const CANON_SCENE_ROLE: Record<SceneKey, CanonSceneRole> = {
  LastDay: "mainline",
  Crossing: "threshold",
  SilverThreshold: "threshold",
  ImaginalRealm: "plateau",
  AthanorThreshold: "secret_annex",
  Nigredo: "secret_annex",
  Albedo: "secret_annex",
  Citrinitas: "secret_annex",
  Rubedo: "secret_annex",
  SealedVessel: "secret_annex",
  MetaxyHub: "connective",
  MoonTrial: "trial",
  MercuryPlateau: "plateau",
  MercuryTrial: "trial",
  VenusPlateau: "plateau",
  VenusTrial: "trial",
  CuratedSelf: "district",
  SunPlateau: "plateau",
  SunTrial: "trial",
  MarsPlateau: "plateau",
  MarsTrial: "trial",
  JupiterPlateau: "plateau",
  JupiterTrial: "trial",
  SaturnPlateau: "plateau",
  SaturnTrial: "trial",
  EndingsRouter: "ending",
  Epilogue: "ending",
};

export function chapterTitleForScene(scene: SceneKey): string {
  return CHAPTER_TITLE[CANON_SCENE_CHAPTER[scene]];
}

export function isSecretAlchemyScene(scene: SceneKey): boolean {
  return (
    scene === "AthanorThreshold" ||
    scene === "Nigredo" ||
    scene === "Albedo" ||
    scene === "Citrinitas" ||
    scene === "Rubedo" ||
    scene === "SealedVessel"
  );
}
