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
  | "MoonTrial"
  | "MercuryPlateau"
  | "MercuryTrial"
  | "VenusPlateau"
  | "VenusTrial"
  | "CuratedSelf"
  | "SunPlateau"
  | "SunTrial"
  | "MarsPlateau"
  | "MarsTrial"
  | "JupiterPlateau"
  | "JupiterTrial"
  | "SaturnPlateau"
  | "SaturnTrial"
  | "EndingsRouter"
  | "Epilogue";

// ===== Canonical support types (added in canon-alignment pass) =====
export type GarmentKey = SphereKey;

export type ResonanceAxis =
  | "witnessing"
  | "control"
  | "possession"
  | "performance"
  | "struggle"
  | "structure"
  | "surrender";

export type ResonanceProfile = Record<ResonanceAxis, number>;

export type MemoryShardId = string;
export type RelicId = string;

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
  AthanorThreshold: 2,
  Nigredo: 2,
  Albedo: 2,
  Citrinitas: 2,
  Rubedo: 2,
  SealedVessel: 2,
  MetaxyHub: 2,
  MoonTrial: 2,
  MercuryPlateau: 3,
  MercuryTrial: 3,
  VenusPlateau: 4,
  VenusTrial: 4,
  CuratedSelf: 5,
  SunPlateau: 5,
  SunTrial: 5,
  MarsPlateau: 6,
  MarsTrial: 6,
  JupiterPlateau: 7,
  JupiterTrial: 7,
  SaturnPlateau: 8,
  SaturnTrial: 8,
  EndingsRouter: 9,
  Epilogue: 9,
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
  1: "ACT 0 - RECEPTION",
  2: "ACT I - MOON",
  3: "ACT II - MERCURY",
  4: "ACT III - VENUS",
  5: "ACT IV - SUN",
  6: "ACT V - MARS",
  7: "ACT VI - JUPITER",
  8: "ACT VII - SATURN",
  9: "EPILOGUE - BEYOND THE SPHERES",
};

/** Per-scene short label for the Continue row. */
export const SCENE_LABEL: Record<SceneKey, string> = {
  LastDay: "The Last Day",
  Crossing: "The Crossing",
  SilverThreshold: "Reception - Silver Threshold",
  ImaginalRealm: "Moon - Mirror's Palace",
  AthanorThreshold: "Moon - Secret Great Work Annex",
  Nigredo: "Moon - Secret Nigredo Annex",
  Albedo: "Moon - Secret Albedo Annex",
  Citrinitas: "Moon - Secret Citrinitas Annex",
  Rubedo: "Moon - Secret Rubedo Annex",
  SealedVessel: "Moon - Secret Sealed Vessel Annex",
  MetaxyHub: "Metaxy",
  MoonTrial: "Moon - Selenos' Trial",
  MercuryPlateau: "Mercury - Tower of Reasons",
  MercuryTrial: "Mercury - Hermaia's Trial",
  VenusPlateau: "Venus - Eternal Biennale",
  VenusTrial: "Venus - Kypria's Trial",
  CuratedSelf: "Sun - Curated Self",
  SunPlateau: "Sun - Hall of Illuminated Testimony",
  SunTrial: "Sun - Helion's Trial",
  MarsPlateau: "Mars - Arena of the Strong",
  MarsTrial: "Mars - Areon's Trial",
  JupiterPlateau: "Jupiter - Grand Tribunal of Perfect Justice",
  JupiterTrial: "Jupiter - Jovian's Trial",
  SaturnPlateau: "Saturn - Avenue of Accepted Fate",
  SaturnTrial: "Saturn - Kronikos' Trial",
  EndingsRouter: "Beyond the Spheres",
  Epilogue: "Beyond the Spheres",
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

  // ===== METAXY (Acts 3+) =====
  /** Player's chosen vocation, set in LastDay. Null until chosen. */
  calling: Calling | null;
  /** Soul integrity (0-100). Drains in higher spheres; restored by Stillness. */
  coherence: number;
  /** Bond with the daimon Soryn (0-10). Derived from cumulative choices. */
  daimonBond: number;
  /** Per-sphere garment release ledger. True after the sphere's trial is passed. */
  garmentsReleased: Partial<Record<SphereKey, boolean>>;
  /** Sphere verbs unlocked by completing each sphere trial. */
  sphereVerbs: { name: boolean; attune: boolean; stand: boolean; weigh: boolean; release: boolean };
  /** Identity-objects collected per sphere; releasable at the Metaxy altar. */
  relics: string[];
  /** Set true only on Saturn if the player accepts the Gnostic offer. */
  gnosticAccepted: boolean;
  /** Final ending id once chosen by EndingsRouter. */
  endingChosen: string | null;
  /** Per-sphere "settle here" soft-ending ledger. */
  plateauSettled: Partial<Record<SphereKey, boolean>>;

  /** Hermetic puzzle ledger — multi-state node values keyed by `puzzle:{roomId}:{nodeId}`. */
  puzzleState: Record<string, string | number | boolean>;

  // ===== SUN SPHERE (Act 6) =====
  /** Current Sun plateau sub-zone (null until first entry). */
  sunZone: "vestibule" | "testimony" | "archive" | "mirrors" | "warmth" | "threshold" | null;
  /** Witness arcs heard at the Hall of Testimony. */
  sunWitnessHeard: Record<string, boolean>;
  /** Sun-themed operations completed. */
  sunOpsDone: Record<string, boolean>;
  /** Set true when all Sun gating is satisfied — Helion may be faced. */
  sunTrialReady: boolean;

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

  const allowed = new Set<SceneKey>(Object.keys(ACT_BY_SCENE) as SceneKey[]);
  if (!allowed.has(scene as SceneKey)) scene = "LastDay";

  const act: number = ACT_BY_SCENE[scene as SceneKey] ?? 0;
  const region =
    (r.region as ImaginalRegion | null | undefined) ?? (scene === "ImaginalRealm" ? "pools" : null);
  const shardFrags = r.shardFragments;
  const loreList = r.lore;
  const verbsRaw = (r.verbs ?? {}) as { witness?: boolean; transmute?: boolean };

  const flags: Record<string, boolean> = { ...(r.flags ?? {}) };
  const garmentsReleased =
    (r.garmentsReleased as Partial<Record<SphereKey, boolean>> | undefined) ?? {};

  // One-time compatibility bridge for saves that had already crossed into
  // Sun-era content before Mercury/Venus gating was introduced.
  if (
    flags.legacy_sun_bridge !== true &&
    (
      scene === "CuratedSelf" ||
      scene === "Epilogue" ||
      (typeof r.act === "number" && r.act >= 6)
    )
  ) {
    flags.legacy_sun_bridge = true;
  }

  return {
    scene: scene as SceneKey,
    act,
    stats: { ...DEFAULT_STATS, ...(r.stats ?? {}) },
    flags,
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

    calling: (r.calling as Calling | null | undefined) ?? null,
    coherence: typeof r.coherence === "number" ? r.coherence : 100,
    daimonBond: typeof r.daimonBond === "number" ? r.daimonBond : 0,
    garmentsReleased,
    sphereVerbs: {
      name: (r.sphereVerbs as { name?: boolean } | undefined)?.name ?? false,
      attune: (r.sphereVerbs as { attune?: boolean } | undefined)?.attune ?? false,
      stand: (r.sphereVerbs as { stand?: boolean } | undefined)?.stand ?? false,
      weigh: (r.sphereVerbs as { weigh?: boolean } | undefined)?.weigh ?? false,
      release: (r.sphereVerbs as { release?: boolean } | undefined)?.release ?? false,
    },
    relics: Array.isArray(r.relics) ? (r.relics as string[]) : [],
    gnosticAccepted: r.gnosticAccepted === true,
    endingChosen: typeof r.endingChosen === "string" ? r.endingChosen : null,
    plateauSettled: (r.plateauSettled as Partial<Record<SphereKey, boolean>> | undefined) ?? {},
    puzzleState:
      (r.puzzleState as Record<string, string | number | boolean> | undefined) ?? {},

    sunZone:
      (r.sunZone as
        | "vestibule"
        | "testimony"
        | "archive"
        | "mirrors"
        | "warmth"
        | "threshold"
        | null
        | undefined) ?? null,
    sunWitnessHeard: (r.sunWitnessHeard as Record<string, boolean> | undefined) ?? {},
    sunOpsDone: (r.sunOpsDone as Record<string, boolean> | undefined) ?? {},
    sunTrialReady: r.sunTrialReady === true,

    updatedAt: r.updatedAt ?? Date.now(),
  };
}
