/**
 * Shared helpers for the four alchemical operation scenes.
 *
 * The pattern: pick N shards → run a per-operation interaction →
 * award stones (and sometimes lore / stat shifts).
 */
import * as Phaser from "phaser";
import { GBCText, COLOR, GBC_W } from "../gbcArt";
import { getAudio } from "../audio";
import type { SaveSlot, ShardId, StoneColor } from "../types";
import { writeSave } from "../save";
import { consumeShard } from "./shards";

const STONE_LABEL: Record<StoneColor, string> = {
  black: "BLACK STONE",
  white: "WHITE STONE",
  yellow: "YELLOW STONE",
  red: "RED STONE",
};

export function awardStone(save: SaveSlot, color: StoneColor, n = 1): void {
  switch (color) {
    case "black":
      save.blackStones = Math.min(3, save.blackStones + n);
      break;
    case "white":
      save.whiteStones = Math.min(3, save.whiteStones + n);
      break;
    case "yellow":
      save.yellowStones = Math.min(3, save.yellowStones + n);
      break;
    case "red":
      save.redStones = Math.min(3, save.redStones + n);
      break;
  }
  writeSave(save);
}

/** Total stones across all four colors (gold not counted). */
export function totalStones(save: SaveSlot): number {
  return save.blackStones + save.whiteStones + save.yellowStones + save.redStones;
}

/** Has every operation produced at least 1 stone? */
export function allOperationsTouched(save: SaveSlot): boolean {
  return (
    save.blackStones > 0 && save.whiteStones > 0 && save.yellowStones > 0 && save.redStones > 0
  );
}

/**
 * Convenience: dissolve a list of shards in one call. Returns the count
 * actually consumed (skips shards already absent from inventory).
 */
export function dissolveAll(save: SaveSlot, ids: ShardId[]): number {
  let n = 0;
  for (const id of ids) if (consumeShard(save, id)) n++;
  return n;
}

/**
 * "Operation completion" hook — write a flag and persist. Used by every
 * operation scene so other scenes (and the Sealed Vessel) can branch.
 */
export function markOperationDone(save: SaveSlot, key: string): void {
  save.flags[key] = true;
  writeSave(save);
}
