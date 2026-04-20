/**
 * Shard registry for Act 2.
 *
 * Each shard is a *named noun* — a piece of Rowan's history made matter.
 * Shards are derived from Act 1 quest completions + 2 prelude defaults
 * (BREATH and NAME, granted at the Athanor Threshold so the act is always
 * playable even by speedrunners).
 *
 * Shards live in `save.shardInventory`. Operations move them to
 * `save.shardsConsumed` (no return except via the salvage_a_shard quest).
 */
import type { SaveSlot, ShardId } from "../types";
import { writeSave } from "../save";

export type ShardDef = {
  id: ShardId;
  /** Display name shown in the inventory + on the dissolving altar. */
  name: string;
  /** One-line flavour for the inventory tooltip. */
  flavour: string;
  /**
   * Should this shard exist in the player's inventory? Returns true when
   * the upstream Act 1 condition has been met. Run once on Athanor entry.
   */
  derive: (s: SaveSlot) => boolean;
};

export const SHARD_DEFS: ShardDef[] = [
  // ===== prelude defaults — always granted =====
  {
    id: "breath",
    name: "BREATH",
    flavour: "The first thing Rowan still owns.",
    derive: () => true,
  },
  {
    id: "name",
    name: "NAME",
    flavour: "What she answered to.",
    derive: () => true,
  },

  // ===== Act 1 derivations =====
  {
    id: "mothers_apron",
    name: "MOTHER'S APRON",
    flavour: "Folded too neatly, smelling of bread.",
    derive: (s) => s.lore.includes("on_the_kitchen") || !!s.flags.gate_kitchen_read,
  },
  {
    id: "unfinished_song",
    name: "THE UNFINISHED SONG",
    flavour: "A half-line. Now it has the missing word.",
    derive: (s) => s.sideQuests["the_unfinished_song"] === "done",
  },
  {
    id: "the_feather",
    name: "THE FEATHER",
    flavour: "Lighter than expected. Heavier than hoped.",
    derive: (s) => s.sideQuests["weigh_the_feather"] === "done",
  },
  {
    id: "stonechild_name",
    name: "EL · I · AS",
    flavour: "Three syllables a child remembered.",
    derive: (s) => s.sideQuests["name_the_stonechild"] === "done" || !!s.flags.stonechild_named,
  },
  {
    id: "refused_gift",
    name: "THE REFUSED GIFT",
    flavour: "A small thing the saint would not take.",
    derive: (s) => s.sideQuests["witness_the_saint"] === "done",
  },
  {
    id: "pools_chart",
    name: "THE POOLS' CHART",
    flavour: "A map of three waters that all reflect the same thing.",
    derive: (s) => s.sideQuests["chart_the_pools"] === "done",
  },
  {
    id: "collectors_jar",
    name: "THE COLLECTOR'S JAR",
    flavour: "Empty now. He let it go.",
    derive: (s) => s.sideQuests["feed_the_collector"] === "done",
  },
  {
    id: "plateaus_weight",
    name: "THE PLATEAU'S WEIGHT",
    flavour: "What it costs to walk past souls without leaving.",
    derive: (s) => s.soulsCompleted >= 8,
  },
];

export function getShardDef(id: ShardId): ShardDef | undefined {
  return SHARD_DEFS.find((d) => d.id === id);
}

export function shardName(id: ShardId): string {
  return getShardDef(id)?.name ?? id.toUpperCase();
}

/**
 * Populate `save.shardInventory` from Act 1 history. Idempotent — running
 * twice will not duplicate shards, and will not re-add a consumed shard.
 */
export function deriveInventory(save: SaveSlot): SaveSlot {
  const have = new Set(save.shardInventory);
  const consumed = new Set(save.shardsConsumed);
  for (const def of SHARD_DEFS) {
    if (consumed.has(def.id)) continue;
    if (have.has(def.id)) continue;
    if (def.derive(save)) {
      save.shardInventory.push(def.id);
    }
  }
  writeSave(save);
  return save;
}

/** Move a shard from inventory → consumed. */
export function consumeShard(save: SaveSlot, id: ShardId): boolean {
  const i = save.shardInventory.indexOf(id);
  if (i < 0) return false;
  save.shardInventory.splice(i, 1);
  save.shardsConsumed.push(id);
  writeSave(save);
  return true;
}

/** Salvage a previously-consumed shard. Used by the salvage_a_shard quest. */
export function salvageShard(save: SaveSlot, id: ShardId): boolean {
  const i = save.shardsConsumed.indexOf(id);
  if (i < 0) return false;
  save.shardsConsumed.splice(i, 1);
  if (!save.shardInventory.includes(id)) save.shardInventory.push(id);
  writeSave(save);
  return true;
}
