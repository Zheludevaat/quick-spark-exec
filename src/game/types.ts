export type Stats = { clarity: number; compassion: number; courage: number };

export type SceneKey =
  | "LastDay"
  | "Crossing"
  | "SilverThreshold"
  | "ImaginalRealm"
  | "AthanorThreshold"
  | "Nigredo"
  | "Albedo"
  | "Citrinitas"
  | "Rubedo"
  | "SealedVessel"
  | "MetaxyHub"
  | "CuratedSelf"
  | "Epilogue";

export type ImaginalRegion = "pools" | "field" | "corridor";

/** The seven planetary spheres of the Metaxy ascent. */
export type SphereKey = "moon" | "mercury" | "venus" | "sun" | "mars" | "jupiter" | "saturn";

export type Calling = "scholar" | "caregiver" | "reformer";

/** Canonical act number per scene. Extend as new acts ship. */
export const ACT_BY_SCENE: Record<SceneKey, number> = {
  LastDay: 0,
  Crossing: 0,
  SilverThreshold: 1,
  ImaginalRealm: 2,
  AthanorThreshold: 3,
  Nigredo: 3,
  Albedo: 3,
  Citrinitas: 3,
  Rubedo: 3,
  SealedVessel: 3,
  MetaxyHub: 3,
  CuratedSelf: 6,
  Epilogue: 10,
};

/** Stable shard ID — derived from Act 1 quest completions + 2 prelude defaults. */
export type ShardId =
  | "breath"
  | "name"
  | "mothers_apron"
  | "unfinished_song"
  | "the_feather"
  | "stonechild_name"
  | "refused_gift"
  | "pools_chart"
  | "collectors_jar"
  | "plateaus_weight";

export type StoneColor = "black" | "white" | "yellow" | "red";

export type WeddingType = "strong" | "gentle" | "fractured";

/** Roman numeral + chapter title shown on the title screen. */
export const ACT_TITLES: Record<number, string> = {
  0: "PRELUDE - THE LAST DAY",
  1: "ACT I - RECEPTION",
  2: "ACT II - THE PLATEAU",
  3: "ACT III - MOON SPHERE",
  4: "ACT IV - MERCURY SPHERE",
  5: "ACT V - VENUS SPHERE",
  6: "ACT VI - SUN SPHERE",
  7: "ACT VII - MARS SPHERE",
  8: "ACT VIII - JUPITER SPHERE",
  9: "ACT IX - SATURN SPHERE",
  10: "ACT X - THE RETURN",
};

/** Per-scene short label for the Continue row. */
export const SCENE_LABEL: Record<SceneKey, string> = {
  LastDay: "The Last Day",
  Crossing: "The Crossing",
  SilverThreshold: "Silver Threshold",
  ImaginalRealm: "Imaginal Realm",
  AthanorThreshold: "Threshold of the Athanor",
  Nigredo: "Nigredo",
  Albedo: "Albedo",
  Citrinitas: "Citrinitas",
  Rubedo: "Rubedo",
  SealedVessel: "The Sealed Vessel",
  CuratedSelf: "Curated Self",
  Epilogue: "Epilogue",
};

export type SaveSlot = {
  scene: SceneKey;
  act: number;
  stats: Stats;
  flags: Record<string, boolean>;
  fragments: number;
  verbs: { witness: boolean; transmute: boolean };
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
  /** Per-NPC arc state (0 = not met, 1+ = arc steps, >=1000 = done). */
  souls: Record<string, number>;
  /** Per-soul ledger of choices made (keyed by soul id → ordered list of choice tags). */
  soulChoices: Record<string, string[]>;
  /** How many souls' arcs have completed — fast read for chained unlocks. */
  soulsCompleted: number;
  /** How many times the WITNESS verb has been used in the realm. */
  witnessUses: number;
  /** Side-quest tracker. */
  sideQuests: Record<string, "todo" | "active" | "done">;
  /** Ring buffer of recent soul events (max 5). */
  soulEventLog: string[];

  // ===== ACT 2 — THE GREAT WORK =====
  shardInventory: ShardId[];
  shardsConsumed: ShardId[];
  blackStones: number;
  whiteStones: number;
  yellowStones: number;
  redStones: number;
  goldStone: boolean;
  shadesEncountered: Record<string, "fled" | "sat_with" | "destroyed">;
  convictions: Record<string, boolean>;
  weddingType: WeddingType | null;
  act2Inscription: string | null;
  sorynReleased: boolean;
  stainsCarried: number;

  updatedAt: number;
};

export const SAVE_KEY = "hermetic_comedy_save_v1";

export const DEFAULT_STATS: Stats = { clarity: 0, compassion: 0, courage: 0 };

export type Command = "observe" | "address" | "remember" | "release" | "witness" | "transmute";

/** Coerce older or partial save shapes into the current SaveSlot shape. */
export function migrateSave(raw: unknown): SaveSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SaveSlot> & { scene?: string; [k: string]: unknown };
  let scene = (r.scene ?? "LastDay") as string;
  if (scene === "MoonHall" || scene === "MoonGate") scene = "ImaginalRealm";
  const allowed: SceneKey[] = [
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
    "CuratedSelf",
    "Epilogue",
  ];
  if (!allowed.includes(scene as SceneKey)) scene = "LastDay";
  const act: number = ACT_BY_SCENE[scene as SceneKey] ?? 0;
  const region =
    (r.region as ImaginalRegion | null | undefined) ?? (scene === "ImaginalRealm" ? "pools" : null);
  const shardFrags = r.shardFragments;
  const loreList = r.lore;
  const verbsRaw = (r.verbs ?? {}) as { witness?: boolean; transmute?: boolean };
  return {
    scene: scene as SceneKey,
    act: typeof r.act === "number" ? r.act : act,
    stats: { ...DEFAULT_STATS, ...(r.stats ?? {}) },
    flags: r.flags ?? {},
    fragments: r.fragments ?? 0,
    verbs: { witness: verbsRaw.witness ?? false, transmute: verbsRaw.transmute ?? false },
    shards: Array.isArray(r.shards) ? r.shards : [],
    shardFragments: typeof shardFrags === "number" ? shardFrags : 0,
    seeds: r.seeds ?? {},
    region: region as ImaginalRegion | null,
    seedEchoes: (r.seedEchoes as Record<string, boolean> | undefined) ?? {},
    lore: Array.isArray(loreList) ? (loreList as string[]) : [],
    souls: (r.souls as Record<string, number> | undefined) ?? {},
    soulChoices: (r.soulChoices as Record<string, string[]> | undefined) ?? {},
    soulsCompleted: typeof r.soulsCompleted === "number" ? r.soulsCompleted : 0,
    witnessUses: typeof r.witnessUses === "number" ? r.witnessUses : 0,
    sideQuests: (r.sideQuests as Record<string, "todo" | "active" | "done"> | undefined) ?? {},
    soulEventLog: Array.isArray(r.soulEventLog) ? (r.soulEventLog as string[]).slice(-5) : [],

    shardInventory: Array.isArray(r.shardInventory) ? (r.shardInventory as ShardId[]) : [],
    shardsConsumed: Array.isArray(r.shardsConsumed) ? (r.shardsConsumed as ShardId[]) : [],
    blackStones: typeof r.blackStones === "number" ? r.blackStones : 0,
    whiteStones: typeof r.whiteStones === "number" ? r.whiteStones : 0,
    yellowStones: typeof r.yellowStones === "number" ? r.yellowStones : 0,
    redStones: typeof r.redStones === "number" ? r.redStones : 0,
    goldStone: r.goldStone === true,
    shadesEncountered:
      (r.shadesEncountered as Record<string, "fled" | "sat_with" | "destroyed"> | undefined) ?? {},
    convictions: (r.convictions as Record<string, boolean> | undefined) ?? {},
    weddingType: (r.weddingType as WeddingType | null | undefined) ?? null,
    act2Inscription: typeof r.act2Inscription === "string" ? r.act2Inscription : null,
    sorynReleased: r.sorynReleased === true,
    stainsCarried: typeof r.stainsCarried === "number" ? r.stainsCarried : 0,

    updatedAt: r.updatedAt ?? Date.now(),
  };
}
