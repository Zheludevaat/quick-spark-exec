/**
 * Canonical Scene and Chapter Registry.
 *
 * This is the single source of truth for:
 * - public chapter titles
 * - public scene labels
 * - scene roles
 * - ascent order
 * - descent order
 * - canonical plateau / district / governor metadata
 * - runtime implementation status
 * - public visibility
 *
 * Legacy numeric act support survives only as a compatibility layer for saves.
 * Public UI must not treat those numeric mappings as primary truth.
 */

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
  | "metaxy"
  | "moon"
  | "mercury"
  | "venus"
  | "sun"
  | "mars"
  | "jupiter"
  | "saturn"
  | "epilogue";

export type CanonSceneRole =
  | "mainline"
  | "threshold"
  | "connective"
  | "plateau"
  | "district"
  | "trial"
  | "optional_side"
  | "secret_annex"
  | "ending";

export type ChapterKind =
  | "prelude"
  | "reception"
  | "metaxy"
  | "sphere"
  | "epilogue";

export type ChapterEntry = {
  key: CanonChapterKey;
  title: string;
  kind: ChapterKind;
  legacyActNumber: number | null;
  ascentIndex: number | null;
  descentIndex: number | null;
  governor: string | null;
  majorPlateau: string | null;
  attachedDistrict: string | null;
  implemented: boolean;
  publiclyVisible: boolean;
};

export type SceneEntry = {
  key: SceneKey;
  label: string;
  chapter: CanonChapterKey;
  role: CanonSceneRole;
  implemented: boolean;
  publiclyVisible: boolean;
  mainline: boolean;
  secret: boolean;
};

export const ASCENT_SPHERE_ORDER: SphereKey[] = [
  "moon",
  "mercury",
  "venus",
  "sun",
  "mars",
  "jupiter",
  "saturn",
];

export const DESCENT_SPHERE_ORDER: SphereKey[] = [
  "saturn",
  "jupiter",
  "mars",
  "sun",
  "venus",
  "mercury",
  "moon",
];

export const CHAPTER_REGISTRY: Record<CanonChapterKey, ChapterEntry> = {
  prelude: {
    key: "prelude",
    title: "PRELUDE",
    kind: "prelude",
    legacyActNumber: 0,
    ascentIndex: null,
    descentIndex: null,
    governor: null,
    majorPlateau: null,
    attachedDistrict: null,
    implemented: true,
    publiclyVisible: true,
  },
  reception: {
    key: "reception",
    title: "ACT 0 · RECEPTION",
    kind: "reception",
    legacyActNumber: 1,
    ascentIndex: null,
    descentIndex: null,
    governor: null,
    majorPlateau: null,
    attachedDistrict: null,
    implemented: true,
    publiclyVisible: true,
  },
  metaxy: {
    key: "metaxy",
    title: "METAXY",
    kind: "metaxy",
    legacyActNumber: null,
    ascentIndex: null,
    descentIndex: null,
    governor: null,
    majorPlateau: null,
    attachedDistrict: null,
    implemented: true,
    publiclyVisible: true,
  },
  moon: {
    key: "moon",
    title: "ACT I · MOON",
    kind: "sphere",
    legacyActNumber: 2,
    ascentIndex: 1,
    descentIndex: 7,
    governor: "Selenos",
    majorPlateau: "The Mirror's Palace",
    attachedDistrict: "Material Campus",
    implemented: true,
    publiclyVisible: true,
  },
  mercury: {
    key: "mercury",
    title: "ACT II · MERCURY",
    kind: "sphere",
    legacyActNumber: 3,
    ascentIndex: 2,
    descentIndex: 6,
    governor: "Hermaia",
    majorPlateau: "The Tower of Reasons",
    attachedDistrict: "The House of Inevitable Tea",
    implemented: true,
    publiclyVisible: true,
  },
  venus: {
    key: "venus",
    title: "ACT III · VENUS",
    kind: "sphere",
    legacyActNumber: 4,
    ascentIndex: 3,
    descentIndex: 5,
    governor: "Kypria",
    majorPlateau: "The Eternal Biennale",
    attachedDistrict: "The Ladder of Lovers",
    implemented: true,
    publiclyVisible: true,
  },
  sun: {
    key: "sun",
    title: "ACT IV · SUN",
    kind: "sphere",
    legacyActNumber: 5,
    ascentIndex: 4,
    descentIndex: 4,
    governor: "Helion",
    majorPlateau: "Hall of Illuminated Testimony",
    attachedDistrict: "Sanctuary of Radiance",
    implemented: true,
    publiclyVisible: true,
  },
  mars: {
    key: "mars",
    title: "ACT V · MARS",
    kind: "sphere",
    legacyActNumber: 6,
    ascentIndex: 5,
    descentIndex: 3,
    governor: "Areon",
    majorPlateau: "Arena of the Strong",
    attachedDistrict: "Archive of Perpetual Struggle",
    implemented: true,
    publiclyVisible: true,
  },
  jupiter: {
    key: "jupiter",
    title: "ACT VI · JUPITER",
    kind: "sphere",
    legacyActNumber: 7,
    ascentIndex: 6,
    descentIndex: 2,
    governor: "Jovian",
    majorPlateau: "Grand Tribunal of Perfect Justice",
    attachedDistrict: "The Messianic Camp",
    implemented: false,
    publiclyVisible: true,
  },
  saturn: {
    key: "saturn",
    title: "ACT VII · SATURN",
    kind: "sphere",
    legacyActNumber: 8,
    ascentIndex: 7,
    descentIndex: 1,
    governor: "Kronikos",
    majorPlateau: "The Avenue of Accepted Fate",
    attachedDistrict: "Gnostic Threshold",
    implemented: false,
    publiclyVisible: true,
  },
  epilogue: {
    key: "epilogue",
    title: "EPILOGUE · BEYOND THE SPHERES",
    kind: "epilogue",
    legacyActNumber: 9,
    ascentIndex: null,
    descentIndex: null,
    governor: null,
    majorPlateau: null,
    attachedDistrict: null,
    implemented: true,
    publiclyVisible: true,
  },
};

export const SCENE_REGISTRY: Record<SceneKey, SceneEntry> = {
  LastDay: {
    key: "LastDay",
    label: "The Last Day",
    chapter: "prelude",
    role: "mainline",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  Crossing: {
    key: "Crossing",
    label: "The Crossing",
    chapter: "prelude",
    role: "threshold",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  SilverThreshold: {
    key: "SilverThreshold",
    label: "Reception · Silver Threshold",
    chapter: "reception",
    role: "threshold",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  ImaginalRealm: {
    key: "ImaginalRealm",
    label: "Moon · Mirror's Palace",
    chapter: "moon",
    role: "plateau",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  MoonTrial: {
    key: "MoonTrial",
    label: "Moon · Selenos' Trial",
    chapter: "moon",
    role: "trial",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  MetaxyHub: {
    key: "MetaxyHub",
    label: "Metaxy",
    chapter: "metaxy",
    role: "connective",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  AthanorThreshold: {
    key: "AthanorThreshold",
    label: "Secret Annex · Athanor Threshold",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
    publiclyVisible: false,
    mainline: false,
    secret: true,
  },
  Nigredo: {
    key: "Nigredo",
    label: "Secret Annex · Nigredo",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
    publiclyVisible: false,
    mainline: false,
    secret: true,
  },
  Albedo: {
    key: "Albedo",
    label: "Secret Annex · Albedo",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
    publiclyVisible: false,
    mainline: false,
    secret: true,
  },
  Citrinitas: {
    key: "Citrinitas",
    label: "Secret Annex · Citrinitas",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
    publiclyVisible: false,
    mainline: false,
    secret: true,
  },
  Rubedo: {
    key: "Rubedo",
    label: "Secret Annex · Rubedo",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
    publiclyVisible: false,
    mainline: false,
    secret: true,
  },
  SealedVessel: {
    key: "SealedVessel",
    label: "Secret Annex · Sealed Vessel",
    chapter: "metaxy",
    role: "secret_annex",
    implemented: true,
    publiclyVisible: false,
    mainline: false,
    secret: true,
  },
  MercuryPlateau: {
    key: "MercuryPlateau",
    label: "Mercury · Tower of Reasons",
    chapter: "mercury",
    role: "plateau",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  MercuryTrial: {
    key: "MercuryTrial",
    label: "Mercury · Hermaia's Trial",
    chapter: "mercury",
    role: "trial",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  VenusPlateau: {
    key: "VenusPlateau",
    label: "Venus · Eternal Biennale",
    chapter: "venus",
    role: "plateau",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  VenusTrial: {
    key: "VenusTrial",
    label: "Venus · Kypria's Trial",
    chapter: "venus",
    role: "trial",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  CuratedSelf: {
    key: "CuratedSelf",
    label: "Sun · Curated Self",
    chapter: "sun",
    role: "district",
    implemented: true,
    publiclyVisible: true,
    mainline: false,
    secret: false,
  },
  SunPlateau: {
    key: "SunPlateau",
    label: "Sun · Hall of Illuminated Testimony",
    chapter: "sun",
    role: "plateau",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  SunTrial: {
    key: "SunTrial",
    label: "Sun · Helion's Trial",
    chapter: "sun",
    role: "trial",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  MarsPlateau: {
    key: "MarsPlateau",
    label: "Mars · Arena of the Strong",
    chapter: "mars",
    role: "plateau",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  MarsTrial: {
    key: "MarsTrial",
    label: "Mars · Areon's Trial",
    chapter: "mars",
    role: "trial",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  JupiterPlateau: {
    key: "JupiterPlateau",
    label: "Jupiter · Grand Tribunal of Perfect Justice",
    chapter: "jupiter",
    role: "plateau",
    implemented: false,
    publiclyVisible: false,
    mainline: true,
    secret: false,
  },
  JupiterTrial: {
    key: "JupiterTrial",
    label: "Jupiter · Jovian's Trial",
    chapter: "jupiter",
    role: "trial",
    implemented: false,
    publiclyVisible: false,
    mainline: true,
    secret: false,
  },
  SaturnPlateau: {
    key: "SaturnPlateau",
    label: "Saturn · Avenue of Accepted Fate",
    chapter: "saturn",
    role: "plateau",
    implemented: false,
    publiclyVisible: false,
    mainline: true,
    secret: false,
  },
  SaturnTrial: {
    key: "SaturnTrial",
    label: "Saturn · Kronikos' Trial",
    chapter: "saturn",
    role: "trial",
    implemented: false,
    publiclyVisible: false,
    mainline: true,
    secret: false,
  },
  EndingsRouter: {
    key: "EndingsRouter",
    label: "Beyond the Spheres",
    chapter: "epilogue",
    role: "ending",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
  Epilogue: {
    key: "Epilogue",
    label: "Beyond the Spheres",
    chapter: "epilogue",
    role: "ending",
    implemented: true,
    publiclyVisible: true,
    mainline: true,
    secret: false,
  },
};

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

export function getChapterMeta(chapter: CanonChapterKey): ChapterEntry {
  return CHAPTER_REGISTRY[chapter];
}

export function getSceneMeta(scene: SceneKey): SceneEntry {
  return SCENE_REGISTRY[scene];
}

export function isSceneImplemented(scene: SceneKey): boolean {
  return SCENE_REGISTRY[scene].implemented;
}

export function isScenePubliclyVisible(scene: SceneKey): boolean {
  return SCENE_REGISTRY[scene].publiclyVisible;
}

export function isSecretAnnexScene(scene: SceneKey): boolean {
  return SCENE_REGISTRY[scene].secret;
}

export function isImplementedMainlineScene(scene: SceneKey): boolean {
  const meta = SCENE_REGISTRY[scene];
  return meta.mainline && meta.implemented;
}

export function getImplementedMainlineSceneOrder(): SceneKey[] {
  return MAINLINE_SCENE_ORDER.filter(isImplementedMainlineScene);
}

export const LEGACY_ACT_NUMBER_BY_SCENE: Record<SceneKey, number> = (() => {
  const out = {} as Record<SceneKey, number>;
  for (const k of SCENE_KEYS) {
    const chapterAct = CHAPTER_REGISTRY[SCENE_REGISTRY[k].chapter].legacyActNumber;
    out[k] = chapterAct ?? CHAPTER_REGISTRY.moon.legacyActNumber!;
  }
  return out;
})();

export const LEGACY_ACT_TITLES: Record<number, string> = (() => {
  const out: Record<number, string> = {};
  for (const chapter of Object.values(CHAPTER_REGISTRY)) {
    if (chapter.legacyActNumber !== null) out[chapter.legacyActNumber] = chapter.title;
  }
  return out;
})();

export const PUBLIC_SCENE_LABELS: Record<SceneKey, string> = (() => {
  const out = {} as Record<SceneKey, string>;
  for (const k of SCENE_KEYS) out[k] = SCENE_REGISTRY[k].label;
  return out;
})();

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
  if (entry.secret) {
    return `SECRET ANNEX · ${entry.label.replace(/^Secret Annex · /, "").toUpperCase()}`;
  }
  if (entry.chapter === "metaxy") {
    return `INTERLUDE · ${entry.label.toUpperCase()}`;
  }
  return `${chapter.title} · ${entry.label.toUpperCase()}`;
}

export function getDevJumpReadout(scene: SceneKey): string {
  const entry = SCENE_REGISTRY[scene];
  return `${entry.label} · ${CHAPTER_REGISTRY[entry.chapter].title}`;
}

export function getImplementedDevJumpScenes(): SceneKey[] {
  return SCENE_KEYS.filter((scene) => {
    const meta = SCENE_REGISTRY[scene];
    return meta.implemented && (meta.publiclyVisible || meta.secret);
  });
}
