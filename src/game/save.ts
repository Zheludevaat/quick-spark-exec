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
  // Notify HUDs / overlays that a save has been written, so they can show
  // a transient "SAVED" indicator. Throttled in the listener.
  try {
    window.dispatchEvent(new CustomEvent("hermetic-saved"));
  } catch {
    // ignore (older runtimes)
  }
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
    verbs: { witness: false, transmute: false },
    shards: [],
    shardFragments: 0,
    seeds: {},
    region: null,
    seedEchoes: {},
    lore: [],
    souls: {},
    soulChoices: {},
    soulsCompleted: 0,
    witnessUses: 0,
    sideQuests: {},
    soulEventLog: [],
    shardInventory: [],
    shardsConsumed: [],
    blackStones: 0,
    whiteStones: 0,
    yellowStones: 0,
    redStones: 0,
    goldStone: false,
    shadesEncountered: {},
    convictions: {},
    weddingType: null,
    act2Inscription: null,
    sorynReleased: false,
    stainsCarried: 0,
    updatedAt: Date.now(),
  };
}
