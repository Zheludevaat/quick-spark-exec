import { applyCanonMigration } from "./canon/migrateCanon";
import {
  SCENE_KEYS,
  LEGACY_ACT_NUMBER_BY_SCENE,
  LEGACY_ACT_TITLES,
  PUBLIC_SCENE_LABELS,
  type SceneKey as RegistrySceneKey,
  type SphereKey as RegistrySphereKey,
} from "./canon/registry";

export type Stats = { clarity: number; compassion: number; courage: number };

/**
 * Re-export of canonical scene/sphere keys from the registry. The
 * registry is the single source of truth — this alias survives only
 * for the existing import path.
 */
export type SceneKey = RegistrySceneKey;
export type SphereKey = RegistrySphereKey;

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

export type Calling = "scholar" | "caregiver" | "reformer";

/**
 * Canonical act number per scene — COMPATIBILITY SHIM ONLY.
 * Public UI MUST NOT consume this. Use registry `getPublicChapterTitle`
 * for chapter identity. Survives only for save persistence
 * (`save.act = ACT_BY_SCENE[scene]`).
 */
export const ACT_BY_SCENE: Record<SceneKey, number> = LEGACY_ACT_NUMBER_BY_SCENE;

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

/**
 * Roman numeral + chapter title — COMPATIBILITY SHIM ONLY, derived
 * from registry. UI must use `getPublicChapterTitle(scene)` instead.
 */
export const ACT_TITLES: Record<number, string> = LEGACY_ACT_TITLES;

/**
 * Per-scene short label — COMPATIBILITY SHIM ONLY, derived from
 * registry. UI must use `getPublicSceneLabel(scene)` instead.
 */
export const SCENE_LABEL: Record<SceneKey, string> = PUBLIC_SCENE_LABELS;

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

  // ===== SECRET ANNEX / LEGACY ALCHEMY PROGRESS =====
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
  sopheneReleased: boolean;
  stainsCarried: number;

  // ===== ASCENT PROGRESSION (Reception and later chapters) =====
  /** Player's chosen vocation, set in LastDay. Null until chosen. */
  calling: Calling | null;
  /** Soul integrity (0-100). Drains in higher spheres; restored by Stillness. */
  coherence: number;
  /** Bond with the daimon Sophene (0-10). Derived from cumulative choices. */
  daimonBond: number;
  /** Per-sphere garment release ledger. True after the sphere's trial is passed. */
  garmentsReleased: Partial<Record<SphereKey, boolean>>;
  /** Sphere verbs unlocked by completing each sphere trial. */
  sphereVerbs: {
    witness: boolean;
    name: boolean;
    attune: boolean;
    expose: boolean;
    stand: boolean;
    weigh: boolean;
    release: boolean;
  };
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

  // ===== CANONICAL FIELDS (canon-alignment pass) =====
  /** Canonical primary growth currency. Migrated from stats.clarity for old saves. */
  clarityPoints: number;
  /** Canonical garment burden per sphere (0..7). */
  garmentWeights: Record<GarmentKey, number>;
  /** Hidden but inspectable resonance profile (-7..7 per axis). */
  resonanceProfile: ResonanceProfile;
  /** Canonical memory lattice. */
  memoryLattice: MemoryShardId[];
  /** Canonical daimon naming reveal (Sophene). */
  sopheneNamed: boolean;


  // ===== VENUS SPHERE (Act 5) =====
  /** Current Venus plateau sub-zone. */
  venusZone:
    | "atrium"
    | "gallery"
    | "recognition_hall"
    | "reconstruction"
    | "ladder"
    | "threshold"
    | null;

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

  const allowed = new Set<SceneKey>(SCENE_KEYS as readonly SceneKey[]);
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

  const venusZoneRaw =
    typeof (r as { venusZone?: unknown }).venusZone === "string"
      ? (r as { venusZone: string }).venusZone
      : (() => {
          const legacy = (r.flags as Record<string, unknown> | undefined)?.["venus_zone_current"];
          return typeof legacy === "string" ? legacy : null;
        })();

  const venusZone:
    | "atrium"
    | "gallery"
    | "recognition_hall"
    | "reconstruction"
    | "ladder"
    | "threshold"
    | null =
    venusZoneRaw === "atrium" ||
    venusZoneRaw === "gallery" ||
    venusZoneRaw === "recognition_hall" ||
    venusZoneRaw === "reconstruction" ||
    venusZoneRaw === "ladder" ||
    venusZoneRaw === "threshold"
      ? venusZoneRaw
      : null;

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

  const migrated: SaveSlot = {
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
    sopheneReleased:
      (r as { sopheneReleased?: unknown }).sopheneReleased === true ||
      (r as { sorynReleased?: unknown }).sorynReleased === true,
    stainsCarried: typeof r.stainsCarried === "number" ? r.stainsCarried : 0,

    calling: (r.calling as Calling | null | undefined) ?? null,
    coherence: typeof r.coherence === "number" ? r.coherence : 100,
    daimonBond: typeof r.daimonBond === "number" ? r.daimonBond : 0,
    garmentsReleased,
    sphereVerbs: {
      witness: true,
      name: (r.sphereVerbs as { name?: boolean } | undefined)?.name ?? false,
      attune: (r.sphereVerbs as { attune?: boolean } | undefined)?.attune ?? false,
      expose: (r.sphereVerbs as { expose?: boolean } | undefined)?.expose ?? false,
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

    clarityPoints:
      typeof (r as { clarityPoints?: unknown }).clarityPoints === "number"
        ? (r as { clarityPoints: number }).clarityPoints
        : ((r.stats as { clarity?: number } | undefined)?.clarity ?? 0),

    garmentWeights:
      (r as { garmentWeights?: Record<GarmentKey, number> }).garmentWeights ?? {
        moon: 3,
        mercury: 3,
        venus: 3,
        sun: 3,
        mars: 3,
        jupiter: 3,
        saturn: 3,
      },

    resonanceProfile:
      (r as { resonanceProfile?: ResonanceProfile }).resonanceProfile ?? {
        witnessing: 0,
        control: 0,
        possession: 0,
        performance: 0,
        struggle: 0,
        structure: 0,
        surrender: 0,
      },

    memoryLattice:
      Array.isArray((r as { memoryLattice?: unknown[] }).memoryLattice)
        ? ((r as { memoryLattice: string[] }).memoryLattice)
        : (Array.isArray(r.shards) ? r.shards : []),

    sopheneNamed:
      typeof (r as { sopheneNamed?: unknown }).sopheneNamed === "boolean"
        ? ((r as { sopheneNamed: boolean }).sopheneNamed)
        : false,

    venusZone,

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

  return applyCanonMigration(migrated);
}
