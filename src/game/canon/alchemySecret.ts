import type { SaveSlot } from "../types";

export type AlchemyHintId =
  | "reception_basin"
  | "moon_flaw"
  | "metaxy_whisper";

export const ALCHEMY_HINT_FLAGS: Record<AlchemyHintId, string> = {
  reception_basin: "alchemy_hint_reception_basin",
  moon_flaw: "alchemy_hint_moon_flaw",
  metaxy_whisper: "alchemy_hint_metaxy_whisper",
};

export const ALCHEMY_SECRET_UNLOCK_FLAG = "alchemy_secret_annex_unlocked";
export const ALCHEMY_SECRET_SEEN_FLAG = "alchemy_secret_annex_seen";

export function hasAlchemyHint(save: SaveSlot, hint: AlchemyHintId): boolean {
  return !!save.flags[ALCHEMY_HINT_FLAGS[hint]];
}

export function countAlchemyHints(save: SaveSlot): number {
  return (Object.values(ALCHEMY_HINT_FLAGS) as string[]).reduce(
    (n, flag) => n + (save.flags[flag] ? 1 : 0),
    0,
  );
}

export function grantAlchemyHint(save: SaveSlot, hint: AlchemyHintId): boolean {
  save.flags[ALCHEMY_HINT_FLAGS[hint]] = true;
  const unlocked = countAlchemyHints(save) >= 3;
  if (unlocked) {
    save.flags[ALCHEMY_SECRET_UNLOCK_FLAG] = true;
  }
  return unlocked;
}

export function alchemySecretUnlocked(save: SaveSlot): boolean {
  return !!save.flags[ALCHEMY_SECRET_UNLOCK_FLAG];
}

export function markAlchemySecretSeen(save: SaveSlot) {
  save.flags[ALCHEMY_SECRET_SEEN_FLAG] = true;
}

export function shouldRevealAlchemyEntrance(save: SaveSlot): boolean {
  return alchemySecretUnlocked(save);
}
