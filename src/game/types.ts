export type Stats = { clarity: number; compassion: number; courage: number };

export type SaveSlot = {
  scene: "SilverThreshold" | "MoonGate" | "MoonHall" | "CuratedSelf" | "Epilogue";
  stats: Stats;
  flags: Record<string, boolean>;
  fragments: number;
  updatedAt: number;
};

export const SAVE_KEY = "hermetic_comedy_save_v1";

export const DEFAULT_STATS: Stats = { clarity: 0, compassion: 0, courage: 0 };

export type Command = "observe" | "address" | "remember" | "release";
