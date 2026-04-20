export type Stats = { clarity: number; compassion: number; courage: number };

export type SceneKey =
  | "LastDay"
  | "Crossing"
  | "SilverThreshold"
  | "ImaginalRealm"
  | "CuratedSelf"
  | "Epilogue";

export type ImaginalRegion = "pools" | "field" | "corridor";

/** Canonical act number per scene. Extend as new acts ship. */
export const ACT_BY_SCENE: Record<SceneKey, number> = {
  LastDay: 0,
  Crossing: 0,
  SilverThreshold: 0,
  ImaginalRealm: 1,
  CuratedSelf: 1,
  Epilogue: 1,
};

/** Roman numeral + chapter title shown on the title screen. */
export const ACT_TITLES: Record<number, string> = {
  0: "PRELUDE - THE LAST DAY",
  1: "ACT I - THE IMAGINAL",
  2: "ACT II - THE GREAT WORK",
  3: "ACT III - THE RETURN",
};

/** Per-scene short label for the Continue row. */
export const SCENE_LABEL: Record<SceneKey, string> = {
  LastDay: "The Last Day",
  Crossing: "The Crossing",
  SilverThreshold: "Silver Threshold",
  ImaginalRealm: "Imaginal Realm",
  CuratedSelf: "Curated Self",
  Epilogue: "Epilogue",
};

export type SaveSlot = {
  scene: SceneKey;
  act: number;
  stats: Stats;
  flags: Record<string, boolean>;
  fragments: number;
  verbs: { witness: boolean };
  shards: string[];
  /** Memory-shard sub-fragments (4 = 1 shard). */
  shardFragments: number;
  seeds: Record<string, boolean>;
  /** Current Imaginal sub-region (set when entering / moving between zones). */
  region: ImaginalRegion | null;
  /** Field seed-echo motes touched. */
  seedEchoes: Record<string, boolean>;
  /** Unlocked lore entry IDs (see scenes/lore.ts). */
  lore: string[];
  /** Per-NPC arc state (0 = not met, 1+ = arc steps). */
  souls: Record<string, number>;
  /** Side-quest tracker. */
  sideQuests: Record<string, "todo" | "active" | "done">;
  updatedAt: number;
};

export const SAVE_KEY = "hermetic_comedy_save_v1";

export const DEFAULT_STATS: Stats = { clarity: 0, compassion: 0, courage: 0 };

export type Command = "observe" | "address" | "remember" | "release" | "witness";

/** Coerce older or partial save shapes into the current SaveSlot shape. */
export function migrateSave(raw: unknown): SaveSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SaveSlot> & { scene?: string; [k: string]: unknown };
  let scene = (r.scene ?? "LastDay") as string;
  // Legacy scene names → new
  if (scene === "MoonHall" || scene === "MoonGate") scene = "ImaginalRealm";
  const allowed: SceneKey[] = [
    "LastDay",
    "Crossing",
    "SilverThreshold",
    "ImaginalRealm",
    "CuratedSelf",
    "Epilogue",
  ];
  // Unknown scene → safest fallback is the start of the journey, not midway.
  if (!allowed.includes(scene as SceneKey)) scene = "LastDay";
  const act: number = ACT_BY_SCENE[scene as SceneKey] ?? 0;
  const region =
    (r.region as ImaginalRegion | null | undefined) ?? (scene === "ImaginalRealm" ? "pools" : null);
  const shardFrags = r.shardFragments;
  const loreList = r.lore;
  return {
    scene: scene as SceneKey,
    act: typeof r.act === "number" ? r.act : act,
    stats: { ...DEFAULT_STATS, ...(r.stats ?? {}) },
    flags: r.flags ?? {},
    fragments: r.fragments ?? 0,
    verbs: { witness: r.verbs?.witness ?? false },
    shards: Array.isArray(r.shards) ? r.shards : [],
    shardFragments: typeof shardFrags === "number" ? shardFrags : 0,
    seeds: r.seeds ?? {},
    region: region as ImaginalRegion | null,
    seedEchoes: (r.seedEchoes as Record<string, boolean> | undefined) ?? {},
    lore: Array.isArray(loreList) ? (loreList as string[]) : [],
    souls: (r.souls as Record<string, number> | undefined) ?? {},
    sideQuests: (r.sideQuests as Record<string, "todo" | "active" | "done"> | undefined) ?? {},
    updatedAt: r.updatedAt ?? Date.now(),
  };
}
