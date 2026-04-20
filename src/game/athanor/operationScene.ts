/**
 * Shared helpers for the four operation scenes (Nigredo / Albedo /
 * Citrinitas / Rubedo).
 *
 * Each operation scene is structured as:
 *   1. Opening dialog (1-3 lines)
 *   2. Pick N shards from inventory (selectShards)
 *   3. Per-operation interaction
 *   4. Award stones + flags
 *   5. Closing dialog
 *   6. Return to AthanorThreshold
 *
 * This file exposes the "frame" so each scene only authors steps 3 and the
 * lines for 1 + 5.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, gbcWipe } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot, ShardId } from "../types";
import { onActionDown, onDirection } from "../controls";
import { shardName, consumeShard } from "./shards";
import { markOperationDone } from "./operations";

export type OperationKey = "nigredo" | "albedo" | "citrinitas" | "rubedo";

/**
 * Render a small picker UI for the player to pick `n` shards from their
 * inventory. If they have fewer than `n`, all are auto-selected.
 * Calls `onPicked` with the selected ShardIds (already consumed).
 */
export function selectShards(
  scene: Phaser.Scene,
  save: SaveSlot,
  prompt: string,
  n: number,
  onPicked: (picked: ShardId[]) => void,
): void {
  const inv = [...save.shardInventory];
  if (inv.length <= n) {
    // auto-consume all
    const picked: ShardId[] = [];
    for (const id of inv) {
      if (consumeShard(save, id)) picked.push(id);
    }
    onPicked(picked);
    return;
  }
  const picked = new Set<ShardId>();
  let cursor = 0;

  const w = GBC_W - 16;
  const h = Math.min(GBC_H - 32, 16 + inv.length * 8);
  const x = 8;
  const y = 16;
  drawGBCBox(scene, x, y, w, h, 200);

  const promptText = new GBCText(scene, x + 4, y + 4, prompt, {
    color: COLOR.textGold,
    depth: 201,
    maxWidthPx: w - 8,
  });
  const labels: GBCText[] = [];
  inv.forEach((id, i) => {
    const t = new GBCText(scene, x + 6, y + 14 + i * 8, "  " + shardName(id), {
      color: COLOR.textLight,
      depth: 201,
    });
    labels.push(t);
  });
  const footer = new GBCText(
    scene,
    x + 4,
    y + h - 8,
    `A: PICK   PICK ${n}`,
    { color: COLOR.textDim, depth: 201 },
  );

  const refresh = () => {
    inv.forEach((id, i) => {
      const mark = picked.has(id) ? "*" : i === cursor ? ">" : " ";
      labels[i].setText(`${mark} ${shardName(id)}`);
    });
    footer.setText(`A: PICK   ${picked.size}/${n}`);
  };
  refresh();

  const cleanup = () => {
    promptText.destroy();
    labels.forEach((l) => l.destroy());
    footer.destroy();
    unbindAct?.();
    unbindDir?.();
  };

  const unbindAct = onActionDown(scene, "action", () => {
    const id = inv[cursor];
    if (picked.has(id)) {
      picked.delete(id);
    } else if (picked.size < n) {
      picked.add(id);
    }
    refresh();
    if (picked.size === n) {
      const result = Array.from(picked);
      // Move from inventory → consumed
      for (const sid of result) consumeShard(save, sid);
      cleanup();
      onPicked(result);
    }
  });
  const unbindDir = onDirection(scene, (dir) => {
    if (dir === "up") cursor = (cursor - 1 + inv.length) % inv.length;
    if (dir === "down") cursor = (cursor + 1) % inv.length;
    refresh();
  });
}

/**
 * Standard "operation complete → return to threshold" tail. Marks the
 * op_<key>_done flag and wipes back.
 */
export function returnToThreshold(scene: Phaser.Scene, save: SaveSlot, key: OperationKey): void {
  markOperationDone(save, `op_${key}_done`);
  save.scene = "AthanorThreshold";
  writeSave(save);
  gbcWipe(scene, () => scene.scene.start("AthanorThreshold", { save }));
}
