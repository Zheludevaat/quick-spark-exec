/**
 * Vessel HUD widget — slim right-edge vertical strip.
 *
 * Mounted only in Act 2 / Act 3 gameplay scenes (Athanor + operations +
 * CuratedSelf). NEVER in Imaginal, Prelude, Crossing, SilverThreshold,
 * SealedVessel.
 *
 * Layout (right-edge column, leaves the play area unobstructed):
 *   Top:    4 stone groups stacked (B / W / Y / R), 3 pips each
 *   Middle: SHD n
 *   Below:  stain pips (only if stainsCarried > 0)
 *   Bottom: status chips: ★ if goldStone, ALN if sorynReleased
 *
 * All gain feedback (stone pop, +1 SHD chip, stain flash, ALN fade-in) is
 * driven by HUD events so it never replays on first mount or re-mount.
 */
import * as Phaser from "phaser";
import { GBC_W, GBCText, COLOR, drawGBCPlate } from "../gbcArt";
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
  // Slim right-edge column: 22 px wide, 56 px tall, anchored top-right so the
  // centre of the screen and the bottom dialog/command band stay unobstructed.
  // Slim right-edge column. Widened so "SHD n" and "ALN" never clip.
  const PLATE_W = 34;
  const PLATE_H = 56;
  const PLATE_X = GBC_W - PLATE_W - 2;
  const PLATE_Y = 16; // sits below the global top stat bar (y=0..13)
  const plate = drawGBCPlate(scene, PLATE_X, PLATE_Y, PLATE_W, PLATE_H, 219, "dark");

  // ----- Stones: one row per color, label + 3 pips -----
  const pipsByColor: Record<StoneColor, Phaser.GameObjects.Arc[]> = {
    black: [],
    white: [],
    yellow: [],
    red: [],
  };
  const rowH = 7;
  const stonesTop = PLATE_Y + 2;
  STONE_ORDER.forEach((c, ci) => {
    const ry = stonesTop + ci * rowH;
    new GBCText(scene, PLATE_X + 3, ry, c[0].toUpperCase(), {
      color: COLOR.textDim,
      depth: 220,
      scrollFactor: 0,
    });
    for (let i = 0; i < 3; i++) {
      const dot = scene.add
        .circle(PLATE_X + 12 + i * 5, ry + 3, 1.4, STONE_COLOR[c])
        .setStrokeStyle(0.5, 0x000000, 1)
        .setScrollFactor(0)
        .setDepth(220)
        .setVisible(false);
      pipsByColor[c].push(dot);
    }
  });

  // ----- SHD count -----
  const shdY = stonesTop + 4 * rowH + 1;
  const shdLabel = new GBCText(scene, PLATE_X + 3, shdY, "SHD 0", {
    color: COLOR.textLight,
    depth: 220,
    scrollFactor: 0,
  });

  // ----- Stain pips (only if any) -----
  const stainY = shdY + 7;
  const stainDots: Phaser.GameObjects.Arc[] = [];
  for (let i = 0; i < 3; i++) {
    const d = scene.add
      .circle(PLATE_X + 5 + i * 5, stainY + 3, 1.4, 0x88a0b8, 0)
      .setStrokeStyle(0.5, 0x88a0b8, 1)
      .setScrollFactor(0)
      .setDepth(220)
      .setVisible(false);
    stainDots.push(d);
  }

  // ----- Status chips at bottom of strip -----
  const chipY = PLATE_Y + PLATE_H - 8;
  const goldChip = new GBCText(scene, PLATE_X + 3, chipY, "", {
    color: COLOR.textGold,
    depth: 220,
    scrollFactor: 0,
  });
  const alnChip = new GBCText(scene, PLATE_X + 11, chipY, "", {
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
    const showGold = !!save.goldStone;
    const showAln = !!save.sopheneReleased;
    goldChip.setText(showGold ? "★" : "");
    alnChip.setText(showAln ? "ALN" : "");
    if (showAln && !alnEverShown) {
      alnEverShown = true;
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
    const chip = new GBCText(scene, PLATE_X + 3, shdY - 2, "+1", {
      color: COLOR.textGold,
      depth: 232,
      scrollFactor: 0,
    });
    scene.tweens.add({
      targets: chip.obj,
      y: shdY - 12,
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
    if (alnEverShown || !save.sopheneReleased) return refresh();
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
  scene.events.on("stats-changed", () => {
    if (!alnEverShown && save.sopheneReleased) onAlnFirst();
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
