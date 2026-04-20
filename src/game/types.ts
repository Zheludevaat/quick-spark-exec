export type Stats = { clarity: number; compassion: number; courage: number };

export type SceneKey =
  | "LastDay"
  | "Crossing"
  | "SilverThreshold"
  | "ImaginalRealm"
  | "CuratedSelf"
  | "Epilogue";

export type SaveSlot = {
  scene: SceneKey;
  act: 0 | 1;
  stats: Stats;
  flags: Record<string, boolean>;
  fragments: number;
  verbs: { witness: boolean };
  shards: string[];
  seeds: Record<string, boolean>;
  updatedAt: number;
};

export const SAVE_KEY = "hermetic_comedy_save_v1";

export const DEFAULT_STATS: Stats = { clarity: 0, compassion: 0, courage: 0 };

export type Command = "observe" | "address" | "remember" | "release" | "witness";

/** Coerce older or partial save shapes into the current SaveSlot shape. */
export function migrateSave(raw: unknown): SaveSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SaveSlot> & { scene?: string };
  let scene = (r.scene ?? "SilverThreshold") as string;
  // Legacy scene names → new
  if (scene === "MoonHall" || scene === "MoonGate") scene = "ImaginalRealm";
  const allowed: SceneKey[] = ["LastDay", "Crossing", "SilverThreshold", "ImaginalRealm", "CuratedSelf", "Epilogue"];
  if (!allowed.includes(scene as SceneKey)) scene = "SilverThreshold";
  const act: 0 | 1 = scene === "ImaginalRealm" || scene === "CuratedSelf" || scene === "Epilogue" ? 1 : 0;
  return {
    scene: scene as SceneKey,
    act: (r.act as 0 | 1) ?? act,
    stats: { ...DEFAULT_STATS, ...(r.stats ?? {}) },
    flags: r.flags ?? {},
    fragments: r.fragments ?? 0,
    verbs: { witness: r.verbs?.witness ?? false },
    shards: Array.isArray(r.shards) ? r.shards : [],
    seeds: r.seeds ?? {},
    updatedAt: r.updatedAt ?? Date.now(),
  };
}
