/**
 * Vessel HUD widget: shows the four stone counts as small colored pips
 * along the bottom-left of the screen, plus shard/stains/conviction chips
 * and an "ALONE" indicator if Soryn has been released.
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
  const shardChip = new GBCText(scene, baseX, baseY - 14, "", { color: COLOR.textDim, depth: 220 });
  // Stains pip row — small open circles that fill as stains accumulate.
  const stainsLabel = new GBCText(scene, scene.scale.width - 40, baseY - 14, "", {
    color: COLOR.textDim,
    depth: 220,
  });
  const stainDots: Phaser.GameObjects.Arc[] = [];
  for (let i = 0; i < 3; i++) {
    const d = scene.add
      .circle(scene.scale.width - 18 + i * 4, baseY - 12, 1.5, 0xffffff, 0)
      .setStrokeStyle(0.5, 0x88a0b8)
      .setDepth(220);
    stainDots.push(d);
  }

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
    const conv = Object.values(save.convictions).filter(Boolean).length;
    let line = `SHARDS ${total}`;
    if (conv > 0) line += `  CONV ${conv}/3`;
    if (save.goldStone) line += `  *GOLD*`;
    if (save.sorynReleased) line += `  ALONE`;
    shardChip.setText(line);

    // Stains: show pip row only if stains have ever been carried.
    if (save.stainsCarried > 0) {
      stainsLabel.setText("STAIN");
      for (let i = 0; i < 3; i++) {
        stainDots[i].setFillStyle(0x88a0b8, i < save.stainsCarried ? 1 : 0);
      }
    } else {
      stainsLabel.setText("");
      for (const d of stainDots) d.setFillStyle(0xffffff, 0);
    }
  };

  refresh();

  return {
    refresh,
    destroy: () => {
      pips.forEach((p) => p.destroy());
      labels.forEach((l) => l.destroy());
      stainDots.forEach((d) => d.destroy());
      stainsLabel.destroy();
      shardChip.destroy();
    },
  };
}
