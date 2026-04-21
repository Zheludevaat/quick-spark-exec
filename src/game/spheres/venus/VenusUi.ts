/**
 * Venus UI helpers — small zone label + hint factories used by the
 * bespoke plateau scene. Kept thin so the scene controls layering itself.
 */
import * as Phaser from "phaser";
import { COLOR, GBCText, GBC_W } from "../../gbcArt";

export function makeVenusZoneLabel(scene: Phaser.Scene, text: string): GBCText {
  return new GBCText(scene, 6, 14, text, {
    color: COLOR.textGold,
    depth: 120,
    maxWidthPx: GBC_W - 12,
  });
}

export function makeVenusHint(scene: Phaser.Scene, text: string): GBCText {
  return new GBCText(scene, 6, 132, text, {
    color: COLOR.textDim,
    depth: 120,
    maxWidthPx: GBC_W - 12,
  });
}

export function makeVenusSubtitle(scene: Phaser.Scene, text: string): GBCText {
  return new GBCText(scene, 6, 24, text, {
    color: COLOR.textAccent,
    depth: 120,
    maxWidthPx: GBC_W - 12,
  });
}

/**
 * Draws an attune progress arc (small ring filling clockwise) at (x,y).
 * Returns an updater that takes a 0..1 value.
 */
export function makeAttuneRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius = 7,
  color = 0xe89bb8,
): { gfx: Phaser.GameObjects.Graphics; update: (t: number) => void; destroy: () => void } {
  const gfx = scene.add.graphics().setDepth(50);
  const draw = (t: number) => {
    gfx.clear();
    gfx.lineStyle(1, 0x000000, 0.6);
    gfx.strokeCircle(x, y, radius);
    if (t > 0) {
      gfx.lineStyle(1, color, 1);
      gfx.beginPath();
      gfx.arc(x, y, radius - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
      gfx.strokePath();
    }
  };
  draw(0);
  return {
    gfx,
    update: draw,
    destroy: () => gfx.destroy(),
  };
}
