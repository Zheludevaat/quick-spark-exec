/**
 * Vessel HUD widget: shows the four stone counts as small colored pips
 * along the bottom-left of the screen, plus a tiny shard-count chip.
 *
 * Mounted by Act 2 scenes via `mountVesselHud(scene, save)`.
 */
import * as Phaser from "phaser";
import { GBCText, COLOR } from "../gbcArt";
import type { SaveSlot, StoneColor } from "../types";

const STONE_COLOR: Record<StoneColor, number> = {
  black: 0x202028,
  white: 0xe8e8f0,
  yellow: 0xe8c860,
  red: 0xb84040,
};

export type VesselHud = {
  refresh: () => void;
  destroy: () => void;
};

export function mountVesselHud(scene: Phaser.Scene, save: SaveSlot): VesselHud {
  const baseY = scene.scale.height - 12;
  const baseX = 4;
  const pips: Phaser.GameObjects.Arc[] = [];
  const labels: GBCText[] = [];
  const shardChip = new GBCText(scene, baseX, baseY - 8, "", { color: COLOR.textDim, depth: 220 });

  // 4 colors × max 3 pips = 12 small circles
  const colors: StoneColor[] = ["black", "white", "yellow", "red"];
  colors.forEach((c, ci) => {
    for (let i = 0; i < 3; i++) {
      const dot = scene.add
        .circle(baseX + ci * 16 + i * 4, baseY, 1.5, STONE_COLOR[c])
        .setDepth(220)
        .setStrokeStyle(0.5, 0x000000)
        .setVisible(false);
      pips.push(dot);
    }
    const lbl = new GBCText(scene, baseX + ci * 16, baseY + 3, c[0].toUpperCase(), {
      color: COLOR.textDim,
      depth: 220,
    });
    labels.push(lbl);
  });

  const refresh = () => {
    const counts = [save.blackStones, save.whiteStones, save.yellowStones, save.redStones];
    counts.forEach((n, ci) => {
      for (let i = 0; i < 3; i++) pips[ci * 3 + i].setVisible(i < n);
    });
    const total = save.shardInventory.length;
    shardChip.setText(`SHARDS ${total}`);
    if (save.goldStone) shardChip.setText(`SHARDS ${total}  *GOLD*`);
  };

  refresh();

  return {
    refresh,
    destroy: () => {
      pips.forEach((p) => p.destroy());
      labels.forEach((l) => l.destroy());
      shardChip.destroy();
    },
  };
}
