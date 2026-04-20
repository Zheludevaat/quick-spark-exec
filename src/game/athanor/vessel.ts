/**
 * Vessel HUD widget — single centered bottom plate.
 *
 * Mounted only in Act 2 / Act 3 gameplay scenes (Athanor + operations +
 * CuratedSelf). NEVER in Imaginal, Prelude, Crossing, SilverThreshold,
 * SealedVessel.
 *
 * Layout (centered above touch-pad safe area):
 *   Row 1: stone pips grouped by color (B W Y R, 3 each)
 *   Row 2 left:   SHD n
 *   Row 2 mid:    stain pips (only if stainsCarried > 0)
 *   Row 2 right:  status chips: ★ if goldStone, ALN if sorynReleased
 *
 * All gain feedback (stone pop, +1 SHD chip, stain flash, ALN fade-in) is
 * driven by HUD events so it never replays on first mount or re-mount.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, GBCText, COLOR, drawGBCPlate } from "../gbcArt";
import type { SaveSlot, StoneColor } from "../types";
import {
  HUD_EVENTS,
  type StoneFilledPayload,
  type ShardGainedPayload,
  type StainAddedPayload,
} from "../ui/hudSignals";

const STONE_COLOR: Record<StoneColor, number> = {
  black: 0x202028,
  white: 0xe8e8f0,
  yellow: 0xe8c860,
  red: 0xb84040,
};
const STONE_ORDER: StoneColor[] = ["black", "white", "yellow", "red"];

export type VesselHud = {
  refresh: () => void;
  destroy: () => void;
};

export function mountVesselHud(scene: Phaser.Scene, save: SaveSlot): VesselHud {
  // Plate sized & centered, sitting above the bottom touch-pad safe area.
  const PLATE_W = 96;
  const PLATE_H = 22;
  const PLATE_X = Math.floor((GBC_W - PLATE_W) / 2);
  const PLATE_Y = GBC_H - PLATE_H - 30; // 30 px clear for pad / dialog chrome
  const plate = drawGBCPlate(scene, PLATE_X, PLATE_Y, PLATE_W, PLATE_H, 219, "dark");

  // ----- Row 1: stone pips, grouped per color, with a tiny color label -----
  const pipsByColor: Record<StoneColor, Phaser.GameObjects.Arc[]> = {
    black: [],
    white: [],
    yellow: [],
    red: [],
  };
  const groupW = 22;
  const rowY = PLATE_Y + 4;
  STONE_ORDER.forEach((c, ci) => {
    const groupX = PLATE_X + 4 + ci * groupW;
    // Letter label
    new GBCText(scene, groupX, rowY, c[0].toUpperCase(), {
      color: COLOR.textDim,
      depth: 220,
      scrollFactor: 0,
    });
    for (let i = 0; i < 3; i++) {
      const dot = scene.add
        .circle(groupX + 6 + i * 4, rowY + 3, 1.6, STONE_COLOR[c])
        .setStrokeStyle(0.5, 0x000000, 1)
        .setScrollFactor(0)
        .setDepth(220)
        .setVisible(false);
      pipsByColor[c].push(dot);
    }
  });

  // ----- Row 2 -----
  const row2Y = PLATE_Y + 13;
  const shdLabel = new GBCText(scene, PLATE_X + 4, row2Y, "SHD 0", {
    color: COLOR.textLight,
    depth: 220,
    scrollFactor: 0,
  });

  // Stain pips (mid). Created lazily but allocated up-front to avoid layout shift.
  const stainDots: Phaser.GameObjects.Arc[] = [];
  const stainBaseX = PLATE_X + 36;
  for (let i = 0; i < 3; i++) {
    const d = scene.add
      .circle(stainBaseX + i * 4, row2Y + 3, 1.4, 0x88a0b8, 0)
      .setStrokeStyle(0.5, 0x88a0b8, 1)
      .setScrollFactor(0)
      .setDepth(220)
      .setVisible(false);
    stainDots.push(d);
  }

  // Status chips (right)
  const goldChip = new GBCText(scene, PLATE_X + PLATE_W - 18, row2Y, "", {
    color: COLOR.textGold,
    depth: 220,
    scrollFactor: 0,
  });
  const alnChip = new GBCText(scene, PLATE_X + PLATE_W - 12, row2Y, "", {
    color: COLOR.textAccent,
    depth: 220,
    scrollFactor: 0,
  });
  let alnEverShown = false;
  let alnPulseTween: Phaser.Tweens.Tween | null = null;

  // ----- Refresh: redraw current state WITHOUT triggering gain animations.
  const refresh = () => {
    STONE_ORDER.forEach((c) => {
      const n =
        c === "black"
          ? save.blackStones
          : c === "white"
            ? save.whiteStones
            : c === "yellow"
              ? save.yellowStones
              : save.redStones;
      pipsByColor[c].forEach((dot, i) => dot.setVisible(i < n));
    });
    shdLabel.setText(`SHD ${save.shardInventory.length}`);
    if (save.stainsCarried > 0) {
      stainDots.forEach((d, i) => {
        d.setVisible(true);
        d.setFillStyle(0x88a0b8, i < save.stainsCarried ? 1 : 0);
      });
    } else {
      stainDots.forEach((d) => d.setVisible(false));
    }
    // Status chips — render compactly: "★" then "ALN" right-aligned-ish
    const showGold = !!save.goldStone;
    const showAln = !!save.sorynReleased;
    goldChip.setText(showGold ? "★" : "");
    alnChip.setText(showAln ? "ALN" : "");
    // Position: if both, gold sits one chip-width to the left of ALN
    if (showGold && showAln) {
      goldChip.obj.setX(PLATE_X + PLATE_W - 22);
      alnChip.obj.setX(PLATE_X + PLATE_W - 14);
    } else if (showGold) {
      goldChip.obj.setX(PLATE_X + PLATE_W - 8);
    } else if (showAln) {
      alnChip.obj.setX(PLATE_X + PLATE_W - 16);
    }
    // Keep pulse running once ALN ever appeared (no first-mount fade).
    if (showAln && !alnEverShown) {
      alnEverShown = true;
      // First paint of an existing ALN save: do NOT fade-in, just set alpha 1.
      alnChip.obj.setAlpha(1);
      alnPulseTween?.stop();
      alnPulseTween = scene.tweens.add({
        targets: alnChip.obj,
        alpha: { from: 1, to: 0.55 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
      });
    }
  };
  refresh();

  // ----- Event-driven feedback -----
  const onStoneFilled = (p: StoneFilledPayload) => {
    refresh();
    const arr = pipsByColor[p.color];
    const dot = arr[Math.max(0, p.next - 1)];
    if (!dot) return;
    dot.setScale(1);
    scene.tweens.add({
      targets: dot,
      scaleX: { from: 2.6, to: 1 },
      scaleY: { from: 2.6, to: 1 },
      duration: 380,
      ease: "Back.out",
    });
    // 2-frame "sparkle"
    const sparkle = scene.add
      .circle(dot.x, dot.y, 3, 0xffffff, 1)
      .setScrollFactor(0)
      .setDepth(231);
    scene.tweens.add({
      targets: sparkle,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 2 },
      duration: 240,
      onComplete: () => sparkle.destroy(),
    });
  };

  const onShardGain = (_p: ShardGainedPayload) => {
    refresh();
    const chip = new GBCText(scene, PLATE_X + 4, row2Y - 2, "+1 SHD", {
      color: COLOR.textGold,
      depth: 232,
      scrollFactor: 0,
    });
    scene.tweens.add({
      targets: chip.obj,
      y: row2Y - 14,
      alpha: { from: 1, to: 0 },
      duration: 1100,
      ease: "Sine.out",
      onComplete: () => chip.destroy(),
    });
  };

  const onStainAdded = (p: StainAddedPayload) => {
    refresh();
    const idx = Math.max(0, Math.min(2, p.next - 1));
    const dot = stainDots[idx];
    if (!dot) return;
    const orig = 0x88a0b8;
    dot.setFillStyle(0xff8060, 1);
    scene.time.delayedCall(220, () => dot.setFillStyle(orig, 1));
  };

  const onAlnFirst = () => {
    if (alnEverShown || !save.sorynReleased) return refresh();
    alnEverShown = true;
    alnChip.setText("ALN");
    alnChip.obj.setAlpha(0);
    scene.tweens.add({
      targets: alnChip.obj,
      alpha: { from: 0, to: 1 },
      duration: 600,
      onComplete: () => {
        alnPulseTween?.stop();
        alnPulseTween = scene.tweens.add({
          targets: alnChip.obj,
          alpha: { from: 1, to: 0.55 },
          duration: 1600,
          yoyo: true,
          repeat: -1,
        });
      },
    });
  };

  scene.events.on(HUD_EVENTS.stoneFilled, onStoneFilled);
  scene.events.on(HUD_EVENTS.shardGained, onShardGain);
  scene.events.on(HUD_EVENTS.stainAdded, onStainAdded);
  // Reuse stat-changed bus to refresh; ALN fade-in is rare so polled here:
  scene.events.on("stats-changed", () => {
    if (!alnEverShown && save.sorynReleased) onAlnFirst();
    else refresh();
  });

  return {
    refresh,
    destroy: () => {
      scene.events.off(HUD_EVENTS.stoneFilled, onStoneFilled);
      scene.events.off(HUD_EVENTS.shardGained, onShardGain);
      scene.events.off(HUD_EVENTS.stainAdded, onStainAdded);
      alnPulseTween?.stop();
      Object.values(pipsByColor)
        .flat()
        .forEach((p) => p.destroy());
      stainDots.forEach((d) => d.destroy());
      shdLabel.destroy();
      goldChip.destroy();
      alnChip.destroy();
      plate.destroy();
    },
  };
}
