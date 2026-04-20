/**
 * Lightweight side-quest tracker.
 *
 * Side quests are small optional objectives. They live in `save.sideQuests`
 * as a status map: "todo" (unseen), "active" (started), "done" (complete).
 * Calls here are idempotent — safe to invoke from update loops.
 */
import * as Phaser from "phaser";
import { GBCText, COLOR, GBC_W } from "./gbcArt";
import { getAudio } from "./audio";
import { writeSave } from "./save";
import type { SaveSlot } from "./types";

export type SideQuestId =
  | "all_seeds_lastday"
  | "all_echoes_field"
  | "release_lantern"
  // Plateau soul-chain quests
  | "chart_the_pools"
  | "feed_the_collector"
  | "name_the_stonechild"
  | "the_unfinished_song"
  | "weigh_the_feather"
  | "witness_the_saint";

export const SIDE_QUEST_TITLES: Record<SideQuestId, string> = {
  all_seeds_lastday: "FIND EVERY SEED IN THE FLAT",
  all_echoes_field: "TOUCH EVERY ECHO IN THE FIELD",
  release_lantern: "RELEASE THE LANTERN",
  chart_the_pools: "CHART THE THREE POOLS",
  feed_the_collector: "BRING THE COLLECTOR THREE ECHOES",
  name_the_stonechild: "FIND THE STONECHILD'S NAME",
  the_unfinished_song: "FINISH THE DROWNED SONG",
  weigh_the_feather: "HOLD THE FEATHER STILL",
  witness_the_saint: "WITNESS THE ONE WHO REFUSES",
};

/** Optional follow-up hint shown when a quest completes. */
export const SIDE_QUEST_NEXT_HINT: Partial<Record<SideQuestId, SideQuestId>> = {
  feed_the_collector: "the_unfinished_song",
  the_unfinished_song: "name_the_stonechild",
  chart_the_pools: "weigh_the_feather",
  witness_the_saint: "weigh_the_feather",
};

export function activateQuest(scene: Phaser.Scene, save: SaveSlot, id: SideQuestId) {
  if (save.sideQuests[id]) return;
  save.sideQuests[id] = "active";
  writeSave(save);
  toast(scene, "QUEST: " + SIDE_QUEST_TITLES[id], COLOR.textAccent);
}

export function completeQuest(scene: Phaser.Scene, save: SaveSlot, id: SideQuestId) {
  if (save.sideQuests[id] === "done") return;
  save.sideQuests[id] = "done";
  writeSave(save);
  getAudio().sfx("resolve");
  toast(scene, "QUEST DONE: " + SIDE_QUEST_TITLES[id], COLOR.textGold);

  // Chain hint
  const next = SIDE_QUEST_NEXT_HINT[id];
  if (next && !save.sideQuests[next]) {
    scene.time.delayedCall(2400, () => {
      toast(scene, "HINT: " + SIDE_QUEST_TITLES[next], COLOR.textWarn);
    });
  }
}

export function questStatus(save: SaveSlot, id: SideQuestId): "todo" | "active" | "done" {
  return save.sideQuests[id] ?? "todo";
}

function toast(scene: Phaser.Scene, msg: string, color: string) {
  const t = new GBCText(scene, 6, 22, msg, {
    color,
    depth: 240,
    maxWidthPx: GBC_W - 12,
  });
  scene.tweens.add({
    targets: t.obj,
    alpha: 0,
    y: 14,
    duration: 2400,
    delay: 1200,
    onComplete: () => t.destroy(),
  });
}
