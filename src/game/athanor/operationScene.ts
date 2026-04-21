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
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  gbcWipe,
  GBC_LINE_H,
  textHeightPx,
  fitSingleLineState,
} from "../gbcArt";
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

  const rowH = GBC_LINE_H;
  const x = 8;
  const boxW = GBC_W - 16;
  const innerW = boxW - 8;

  const promptUpper = prompt.toUpperCase();
  const promptH = textHeightPx(promptUpper, innerW);

  const minBoxH = 44;
  const maxBoxH = GBC_H - 32;
  const footerBand = GBC_LINE_H + 2;

  // Compute final-display state per shard. Reserve a wrapped readout band
  // inside the box if any shard name would have been trimmed.
  const rowFitW = innerW - 12;
  const itemStates = inv.map((id) => fitSingleLineState(shardName(id), rowFitW));
  const needsReadout = itemStates.some((s) => s.trimmed);
  const readoutW = innerW;
  const readoutH = needsReadout
    ? Math.max(...itemStates.map((s) => textHeightPx(s.full, readoutW)))
    : 0;
  const readoutBandH = needsReadout ? GBC_LINE_H + readoutH : 0;

  // Determine how many rows can be shown while leaving room for prompt + readout + footer.
  const maxVisibleRows = Math.max(
    1,
    Math.floor((maxBoxH - promptH - footerBand - readoutBandH - 14) / rowH),
  );
  const visibleRows = Math.min(inv.length, maxVisibleRows);

  const boxH = Math.max(
    minBoxH,
    promptH + footerBand + visibleRows * rowH + readoutBandH + 14,
  );
  const y = Math.max(8, Math.floor((GBC_H - boxH) / 2));

  const box = drawGBCBox(scene, x, y, boxW, boxH, 200);

  const promptText = new GBCText(scene, x + 4, y + 4, promptUpper, {
    color: COLOR.textGold,
    depth: 201,
    maxWidthPx: innerW,
  });

  const listTop = y + 4 + promptH + GBC_LINE_H;
  const footerY = y + boxH - 8;

  const labels: GBCText[] = [];
  for (let row = 0; row < visibleRows; row++) {
    labels.push(
      new GBCText(scene, x + 6, listTop + row * rowH, "", {
        color: COLOR.textLight,
        depth: 201,
      }),
    );
  }

  const readoutY = listTop + visibleRows * rowH + GBC_LINE_H;
  const selectedReadout = needsReadout
    ? new GBCText(scene, x + 4, readoutY, "", {
        color: COLOR.textAccent,
        depth: 201,
        maxWidthPx: readoutW,
      })
    : null;

  const footer = new GBCText(scene, x + 4, footerY, "", {
    color: COLOR.textDim,
    depth: 201,
  });

  const computeStart = () => {
    if (inv.length <= visibleRows) return 0;
    const half = Math.floor(visibleRows / 2);
    const maxStart = Math.max(0, inv.length - visibleRows);
    return Math.max(0, Math.min(maxStart, cursor - half));
  };

  const refresh = () => {
    const start = computeStart();
    for (let row = 0; row < visibleRows; row++) {
      const abs = start + row;
      const id = inv[abs];
      if (!id) {
        labels[row].setText("");
        continue;
      }
      const mark = picked.has(id) ? "*" : abs === cursor ? ">" : " ";
      labels[row].setText(`${mark} ${itemStates[abs].fitted}`);
    }
    if (selectedReadout) selectedReadout.setText(itemStates[cursor].full);
    footer.setText(`A: PICK   ${picked.size}/${n}`);
  };
  refresh();

  let unbindAct: (() => void) | null = null;
  let unbindDir: (() => void) | null = null;

  const cleanup = () => {
    box.destroy();
    promptText.destroy();
    labels.forEach((l) => l.destroy());
    footer.destroy();
    unbindAct?.();
    unbindDir?.();
  };

  unbindAct = onActionDown(scene, "action", () => {
    const id = inv[cursor];
    if (picked.has(id)) {
      picked.delete(id);
    } else if (picked.size < n) {
      picked.add(id);
    }
    refresh();
    if (picked.size === n) {
      const result = Array.from(picked);
      // Move from inventory → consumed (single source of truth).
      for (const sid of result) consumeShard(save, sid);
      cleanup();
      onPicked(result);
    }
  });
  unbindDir = onDirection(scene, (dir) => {
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
