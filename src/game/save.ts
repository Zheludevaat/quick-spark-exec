import { DEFAULT_STATS, SAVE_KEY, type SaveSlot } from "./types";

export function loadSave(): SaveSlot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveSlot;
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
    scene: "SilverThreshold",
    stats: { ...DEFAULT_STATS },
    flags: {},
    fragments: 0,
    updatedAt: Date.now(),
  };
}
