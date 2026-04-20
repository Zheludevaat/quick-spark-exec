import { DEFAULT_STATS, SAVE_KEY, migrateSave, type SaveSlot } from "./types";

export function loadSave(): SaveSlot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrateSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSave(slot: SaveSlot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVE_KEY, JSON.stringify({ ...slot, updatedAt: Date.now() }));
}

export function clearSave() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
}

export function newSave(): SaveSlot {
  return {
    scene: "LastDay",
    act: 0,
    stats: { ...DEFAULT_STATS },
    flags: {},
    fragments: 0,
    verbs: { witness: false },
    shards: [],
    shardFragments: 0,
    seeds: {},
    updatedAt: Date.now(),
  };
}
