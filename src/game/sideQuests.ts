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

export type SideQuestId = "all_seeds_lastday" | "all_echoes_field" | "release_lantern";

export const SIDE_QUEST_TITLES: Record<SideQuestId, string> = {
  all_seeds_lastday: "FIND EVERY SEED IN THE FLAT",
  all_echoes_field: "TOUCH EVERY ECHO IN THE FIELD",
  release_lantern: "RELEASE THE LANTERN",
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
