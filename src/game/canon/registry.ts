/**
 * Canonical Scene & Chapter Registry — single source of truth for the
 * game's act/chapter/scene identity. Every public-facing surface and
 * active code path derives presentation from this file.
 *
 * - Public labels live here, NOT in legacy `SCENE_LABEL` / `ACT_TITLES`.
 * - Legacy compatibility maps in `src/game/types.ts` are derived from
 *   this registry. They survive only as save-system plumbing.
 * - Jupiter and Saturn are canonical chapters but their plateau/trial
 *   scenes are intentionally not yet runtime-registered. Registry
 *   helpers expose `getImplementedMainlineSceneOrder()` so menus and
 *   navigation graph filter them out until they ship.
 */

// ---------------------------------------------------------------------
// Canonical key sets
// ---------------------------------------------------------------------

export const SCENE_KEYS = [
  "LastDay",
  "Crossing",
  "SilverThreshold",
  "ImaginalRealm",
  "AthanorThreshold",
  "Nigredo",
  "Albedo",
  "Citrinitas",
  "Rubedo",
  "SealedVessel",
  "MetaxyHub",
  "MoonTrial",
  "MercuryPlateau",
  "MercuryTrial",
  "VenusPlateau",
  "VenusTrial",
  "CuratedSelf",
  "SunPlateau",
  "SunTrial",
  "MarsPlateau",
  "MarsTrial",
  "JupiterPlateau",
  "JupiterTrial",
  "SaturnPlateau",
  "SaturnTrial",
  "EndingsRouter",
  "Epilogue",
] as const;

export type SceneKey = (typeof SCENE_KEYS)[number];

export const SPHERE_KEYS = [
  "moon",
  "mercury",
  "venus",
  "sun",
  "mars",
  "jupiter",
  "saturn",
] as const;

export type SphereKey = (typeof SPHERE_KEYS)[number];

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

// ---------------------------------------------------------------------
// Chapter registry — public chapter identity
// ---------------------------------------------------------------------

export type ChapterEntry = {
  key: CanonChapterKey;
  /** Public chapter title shown to the player (e.g. "ACT I — MOON"). */
  title: string;
  /**
   * Legacy numeric act for save persistence only. Metaxy returns null
   * because it is connective interlude, not a numbered act.
   */
  legacyActNumber: number | null;
};

export const CHAPTER_REGISTRY: Record<CanonChapterKey, ChapterEntry> = {
  prelude: { key: "prelude", title: "PRELUDE — THE LAST DAY", legacyActNumber: 0 },
  reception: { key: "reception", title: "ACT 0 — RECEPTION", legacyActNumber: 1 },
  moon: { key: "moon", title: "ACT I — MOON", legacyActNumber: 2 },
  mercury: { key: "mercury", title: "ACT II — MERCURY", legacyActNumber: 3 },
  venus: { key: "venus", title: "ACT III — VENUS", legacyActNumber: 4 },
  sun: { key: "sun", title: "ACT IV — SUN", legacyActNumber: 5 },
  mars: { key: "mars", title: "ACT V — MARS", legacyActNumber: 6 },
  jupiter: { key: "jupiter", title: "ACT VI — JUPITER", legacyActNumber: 7 },
  saturn: { key: "saturn", title: "ACT VII — SATURN", legacyActNumber: 8 },
  metaxy: { key: "metaxy", title: "METAXY", legacyActNumber: null },
  epilogue: { key: "epilogue", title: "EPILOGUE — BEYOND THE SPHERES", legacyActNumber: 9 },
};

// ---------------------------------------------------------------------
// Scene registry — public scene identity
// ---------------------------------------------------------------------

export type SceneEntry = {
  key: SceneKey;
  /** Public scene label shown to the player. */
  label: string;
  chapter: CanonChapterKey;
  role: CanonSceneRole;
  /**
   * Whether this scene is registered in `createGame.ts`. Drives dev
   * menu filtering and navigation graph honesty. Set false for canonical
   * scenes whose runtime implementation has not yet shipped.
   */
  implemented: boolean;
};

export const SCENE_REGISTRY: Record<SceneKey, SceneEntry> = {
  LastDay: {
    key: "LastDay",
    label: "The Last Day",
    chapter: "prelude",
    role: "mainline",
    implemented: true,
  },
  Crossing: {
    key: "Crossing",
    label: "The Crossing",
    chapter: "prelude",
    role: "threshold",
    implemented: true,
  },
  SilverThreshold: {
    key: "SilverThreshold",
    label: "Reception — Silver Threshold",
    chapter: "reception",
    role: "threshold",
    implemented: true,
  },
  ImaginalRealm: {
    key: "ImaginalRealm",
    label: "Moon — Mirror's Palace",
    chapter: "moon",
    role: "plateau",
    implemented: true,
  },
  MoonTrial: {
    key: "MoonTrial",
    label: "Moon — Selenos' Trial",
    chapter: "moon",
    role: "trial",
    implemented: true,
  },
  AthanorThreshold: {
    key: "AthanorThreshold",
    label: "Secret Annex — Athanor Threshold",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
  },
  Nigredo: {
    key: "Nigredo",
    label: "Secret Annex — Nigredo",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
  },
  Albedo: {
    key: "Albedo",
    label: "Secret Annex — Albedo",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
  },
  Citrinitas: {
    key: "Citrinitas",
    label: "Secret Annex — Citrinitas",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
  },
  Rubedo: {
    key: "Rubedo",
    label: "Secret Annex — Rubedo",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
  },
  SealedVessel: {
    key: "SealedVessel",
    label: "Secret Annex — Sealed Vessel",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
  },
  MetaxyHub: {
    key: "MetaxyHub",
    label: "Metaxy",
    chapter: "metaxy",
    role: "connective",
    implemented: true,
  },
  MercuryPlateau: {
    key: "MercuryPlateau",
    label: "Mercury — Tower of Reasons",
    chapter: "mercury",
    role: "plateau",
    implemented: true,
  },
  MercuryTrial: {
    key: "MercuryTrial",
    label: "Mercury — Hermaia's Trial",
    chapter: "mercury",
    role: "trial",
    implemented: true,
  },
  VenusPlateau: {
    key: "VenusPlateau",
    label: "Venus — Eternal Biennale",
    chapter: "venus",
    role: "plateau",
    implemented: true,
  },
  VenusTrial: {
    key: "VenusTrial",
    label: "Venus — Kypria's Trial",
    chapter: "venus",
    role: "trial",
    implemented: true,
  },
  CuratedSelf: {
    key: "CuratedSelf",
    label: "Sun — Curated Self",
    chapter: "sun",
    role: "district",
    implemented: true,
  },
  SunPlateau: {
    key: "SunPlateau",
    label: "Sun — Hall of Illuminated Testimony",
    chapter: "sun",
    role: "plateau",
    implemented: true,
  },
  SunTrial: {
    key: "SunTrial",
    label: "Sun — Helion's Trial",
    chapter: "sun",
    role: "trial",
    implemented: true,
  },
  MarsPlateau: {
    key: "MarsPlateau",
    label: "Mars — Arena of the Strong",
    chapter: "mars",
    role: "plateau",
    implemented: true,
  },
  MarsTrial: {
    key: "MarsTrial",
    label: "Mars — Areon's Trial",
    chapter: "mars",
    role: "trial",
    implemented: true,
  },
  JupiterPlateau: {
    key: "JupiterPlateau",
    label: "Jupiter — Grand Tribunal of Perfect Justice",
    chapter: "jupiter",
    role: "plateau",
    implemented: false,
  },
  JupiterTrial: {
    key: "JupiterTrial",
    label: "Jupiter — Jovian's Trial",
    chapter: "jupiter",
    role: "trial",
    implemented: false,
  },
  SaturnPlateau: {
    key: "SaturnPlateau",
    label: "Saturn — Avenue of Accepted Fate",
    chapter: "saturn",
    role: "plateau",
    implemented: false,
  },
  SaturnTrial: {
    key: "SaturnTrial",
    label: "Saturn — Kronikos' Trial",
    chapter: "saturn",
    role: "trial",
    implemented: false,
  },
  EndingsRouter: {
    key: "EndingsRouter",
    label: "Beyond the Spheres",
    chapter: "epilogue",
    role: "ending",
    implemented: true,
  },
  Epilogue: {
    key: "Epilogue",
    label: "Beyond the Spheres",
    chapter: "epilogue",
    role: "ending",
    implemented: true,
  },
};

// ---------------------------------------------------------------------
// Mainline ascent order
// ---------------------------------------------------------------------

export const MAINLINE_SCENE_ORDER: SceneKey[] = [
  "LastDay",
  "Crossing",
  "SilverThreshold",
  "ImaginalRealm",
  "MoonTrial",
  "MetaxyHub",
  "MercuryPlateau",
  "MercuryTrial",
  "VenusPlateau",
  "VenusTrial",
  "SunPlateau",
  "SunTrial",
  "MarsPlateau",
  "MarsTrial",
  "JupiterPlateau",
  "JupiterTrial",
  "SaturnPlateau",
  "SaturnTrial",
  "EndingsRouter",
  "Epilogue",
];

export function getImplementedMainlineSceneOrder(): SceneKey[] {
  return MAINLINE_SCENE_ORDER.filter((s) => SCENE_REGISTRY[s].implemented);
}

// ---------------------------------------------------------------------
// Legacy compatibility maps (derived) — for save persistence only.
// Public UI surfaces MUST NOT consume these.
// ---------------------------------------------------------------------

export const LEGACY_ACT_NUMBER_BY_SCENE: Record<SceneKey, number> = (() => {
  const out = {} as Record<SceneKey, number>;
  for (const k of SCENE_KEYS) {
    const entry = SCENE_REGISTRY[k];
    const chapterAct = CHAPTER_REGISTRY[entry.chapter].legacyActNumber;
    // Metaxy + secret annex have null chapter act → fall back to Moon's
    // numeric so legacy save.act readers stay coherent (act 2-era content).
    out[k] = chapterAct ?? CHAPTER_REGISTRY.moon.legacyActNumber!;
  }
  return out;
})();

export const LEGACY_ACT_TITLES: Record<number, string> = (() => {
  const out: Record<number, string> = {};
  for (const c of Object.values(CHAPTER_REGISTRY)) {
    if (c.legacyActNumber !== null) out[c.legacyActNumber] = c.title;
  }
  return out;
})();

export const PUBLIC_SCENE_LABELS: Record<SceneKey, string> = (() => {
  const out = {} as Record<SceneKey, string>;
  for (const k of SCENE_KEYS) out[k] = SCENE_REGISTRY[k].label;
  return out;
})();

// ---------------------------------------------------------------------
// Helpers — public truth API
// ---------------------------------------------------------------------

export function getPublicSceneLabel(scene: string | null | undefined): string {
  if (!scene) return "—";
  const entry = (SCENE_REGISTRY as Record<string, SceneEntry | undefined>)[scene];
  return entry?.label ?? scene;
}

export function getPublicChapterTitle(scene: string | null | undefined): string {
  if (!scene) return "—";
  const entry = (SCENE_REGISTRY as Record<string, SceneEntry | undefined>)[scene];
  if (!entry) return "—";
  return CHAPTER_REGISTRY[entry.chapter].title;
}

export function getDevJumpLabel(scene: SceneKey): string {
  const entry = SCENE_REGISTRY[scene];
  const chapter = CHAPTER_REGISTRY[entry.chapter];
  if (entry.role === "secret_annex") {
    return `SECRET ANNEX · ${entry.label.replace(/^Secret Annex — /, "").toUpperCase()}`;
  }
  if (entry.role === "connective" || entry.chapter === "metaxy") {
    return `INTERLUDE · ${entry.label.toUpperCase()}`;
  }
  return `${chapter.title} · ${entry.label.toUpperCase()}`;
}

export function getDevJumpReadout(scene: SceneKey): string {
  const entry = SCENE_REGISTRY[scene];
  const chapter = CHAPTER_REGISTRY[entry.chapter];
  return `${entry.label} · ${chapter.title}`;
}

export function getImplementedDevJumpScenes(): SceneKey[] {
  return SCENE_KEYS.filter((s) => SCENE_REGISTRY[s].implemented);
}

export function isSceneImplemented(scene: SceneKey): boolean {
  return SCENE_REGISTRY[scene].implemented;
}

export function isSecretAnnexScene(scene: SceneKey): boolean {
  return SCENE_REGISTRY[scene].role === "secret_annex";
}
