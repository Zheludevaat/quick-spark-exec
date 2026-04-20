/**
 * Centralized feedback for memory-shard progression.
 *
 * Every scene that grants `shardFragments` should call `awardShardFragment`
 * so the player gets consistent SFX, a "FRAGMENT N/4" toast while building,
 * and a "MEMORY SHARD!" flash + chime when one fully forms.
 */
import * as Phaser from "phaser";
import { GBCText, COLOR } from "./gbcArt";
import { getAudio } from "./audio";
import type { SaveSlot } from "./types";

export type ShardAwardResult = {
  /** True when the fragment completed a shard this call. */
  formed: boolean;
  /** New fragment count (0–3 after a form, 1–3 otherwise). */
  fragments: number;
};

export function awardShardFragment(
  scene: Phaser.Scene,
  save: SaveSlot,
  shardIdFactory: () => string,
  anchor: { x: number; y: number },
): ShardAwardResult {
  save.shardFragments = (save.shardFragments ?? 0) + 1;
  let formed = false;
  if (save.shardFragments >= 4) {
    save.shardFragments -= 4;
    const id = shardIdFactory();
    if (!save.shards.includes(id)) save.shards.push(id);
    formed = true;
  }
  showShardToast(scene, anchor, formed, save.shardFragments);
  return { formed, fragments: save.shardFragments };
}

export function showShardToast(
  scene: Phaser.Scene,
  anchor: { x: number; y: number },
  formed: boolean,
  fragments: number,
) {
  const a = getAudio();
  if (formed) {
    a.sfx("resolve");
    scene.cameras.main.flash(180, 255, 224, 152);
    const t = new GBCText(scene, anchor.x - 32, anchor.y - 22, "MEMORY SHARD!", {
      color: COLOR.textGold,
      depth: 222,
    });
    scene.tweens.add({
      targets: t.obj,
      alpha: 0,
      y: anchor.y - 38,
      duration: 1800,
      onComplete: () => t.destroy(),
    });
  } else {
    a.sfx("confirm");
    const t = new GBCText(scene, anchor.x - 24, anchor.y - 14, `FRAGMENT ${fragments}/4`, {
      color: COLOR.textWarn,
      depth: 220,
    });
    scene.tweens.add({
      targets: t.obj,
      alpha: 0,
      y: anchor.y - 26,
      duration: 1200,
      onComplete: () => t.destroy(),
    });
  }
}
