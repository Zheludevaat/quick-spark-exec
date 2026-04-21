/**
 * Generated Mercury textures. Every tile and prop is baked once into
 * the Phaser texture cache, keyed on the active palette zone so a
 * palette shift across rooms produces actually different art (not
 * tinted reuse).
 */
import * as Phaser from "phaser";
import {
  MERCURY_BASE_PALETTE,
  type MercuryPalette,
  type MercuryZoneKey,
} from "./MercuryPalette";
import { px, border, checker, dither25, lineH, lineV, runeDiamond } from "./MercuryPixel";

function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  paint(ctx);
  tex.refresh();
}

export function mercuryTexKey(base: string, zone: MercuryZoneKey): string {
  return `mercury_${zone}_${base}`;
}

export function ensureMercuryTextures(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  pal: MercuryPalette = MERCURY_BASE_PALETTE,
) {
  makeFloorTiles(scene, zone, pal);
  makeWallTiles(scene, zone, pal);
  makeProps(scene, zone, pal);
  makeDoorTextures(scene, zone, pal);
}

function makeFloorTiles(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  pal: MercuryPalette,
) {
  makeCanvasTexture(scene, mercuryTexKey("floor_plain", zone), 16, 16, (ctx) => {
    px(ctx, 0, 0, 16, 16, pal.stone0);
    checker(ctx, 0, 0, 16, 16, pal.stone0, pal.stone1, 2);
    lineH(ctx, 0, 0, 16, pal.stone1);
    lineV(ctx, 0, 0, 16, pal.stone1);
    dither25(ctx, 0, 0, 16, 16, pal.bg1);
  });

  makeCanvasTexture(scene, mercuryTexKey("floor_chalk", zone), 16, 16, (ctx) => {
    px(ctx, 0, 0, 16, 16, pal.stone0);
    checker(ctx, 0, 0, 16, 16, pal.stone0, pal.stone1, 2);
    lineH(ctx, 1, 8, 14, pal.chalk0);
    lineV(ctx, 8, 1, 14, pal.chalk0);
    runeDiamond(ctx, 6, 6, pal.chalk1);
  });

  makeCanvasTexture(scene, mercuryTexKey("floor_medallion", zone), 32, 32, (ctx) => {
    px(ctx, 0, 0, 32, 32, pal.stone0);
    border(ctx, 0, 0, 32, 32, pal.stone1, pal.brass1);
    border(ctx, 4, 4, 24, 24, pal.brass1, pal.stone2);
    lineH(ctx, 8, 16, 16, pal.chalk0);
    lineV(ctx, 16, 8, 16, pal.chalk0);
    runeDiamond(ctx, 14, 14, pal.chalk1);
  });
}

function makeWallTiles(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  pal: MercuryPalette,
) {
  makeCanvasTexture(scene, mercuryTexKey("wall", zone), 16, 24, (ctx) => {
    px(ctx, 0, 0, 16, 24, pal.bg1);
    px(ctx, 0, 4, 16, 20, pal.stone0);
    border(ctx, 0, 4, 16, 20, pal.stone1);
    lineV(ctx, 7, 4, 20, pal.stone1);
    lineV(ctx, 8, 4, 20, pal.bg2);
  });

  makeCanvasTexture(scene, mercuryTexKey("pillar", zone), 16, 32, (ctx) => {
    px(ctx, 0, 0, 16, 32, "rgba(0,0,0,0)");
    px(ctx, 4, 0, 8, 32, pal.stone1);
    border(ctx, 4, 0, 8, 32, pal.stone2, pal.stone0);
    px(ctx, 2, 0, 12, 3, pal.brass1);
    px(ctx, 2, 29, 12, 3, pal.brass1);
  });

  makeCanvasTexture(scene, mercuryTexKey("rail", zone), 16, 8, (ctx) => {
    px(ctx, 0, 0, 16, 8, "rgba(0,0,0,0)");
    lineH(ctx, 0, 2, 16, pal.brass2);
    lineH(ctx, 0, 5, 16, pal.brass1);
    lineV(ctx, 2, 2, 6, pal.brass1);
    lineV(ctx, 8, 2, 6, pal.brass1);
    lineV(ctx, 14, 2, 6, pal.brass1);
  });
}

function makeProps(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  pal: MercuryPalette,
) {
  makeCanvasTexture(scene, mercuryTexKey("obelisk", zone), 16, 24, (ctx) => {
    px(ctx, 0, 0, 16, 24, "rgba(0,0,0,0)");
    px(ctx, 4, 2, 8, 20, pal.stone1);
    border(ctx, 4, 2, 8, 20, pal.stone2);
    lineH(ctx, 5, 8, 6, pal.chalk0);
    lineH(ctx, 5, 12, 6, pal.chalk0);
    runeDiamond(ctx, 6, 15, pal.chalk1);
    px(ctx, 2, 22, 12, 2, pal.brass1);
  });

  makeCanvasTexture(scene, mercuryTexKey("plaque", zone), 24, 16, (ctx) => {
    px(ctx, 0, 0, 24, 16, pal.brass0);
    border(ctx, 0, 0, 24, 16, pal.brass2, pal.brass1);
    lineH(ctx, 4, 5, 16, pal.chalk1);
    lineH(ctx, 5, 9, 14, pal.chalk0);
    lineH(ctx, 6, 12, 12, pal.chalk0);
  });

  makeCanvasTexture(scene, mercuryTexKey("lamp", zone), 8, 16, (ctx) => {
    px(ctx, 0, 0, 8, 16, "rgba(0,0,0,0)");
    px(ctx, 3, 2, 2, 10, pal.brass1);
    px(ctx, 1, 10, 6, 4, pal.brass2);
    px(ctx, 2, 11, 4, 2, pal.chalk1);
    px(ctx, 2, 14, 4, 2, pal.brass0);
  });

  makeCanvasTexture(scene, mercuryTexKey("cracked_lens", zone), 40, 40, (ctx) => {
    px(ctx, 0, 0, 40, 40, "rgba(0,0,0,0)");
    // Outer scaffold tick marks
    for (let i = 0; i < 40; i += 2) {
      px(ctx, 10, i, 1, 1, pal.brass1);
      px(ctx, 29, i, 1, 1, pal.brass1);
      px(ctx, i, 10, 1, 1, pal.brass1);
      px(ctx, i, 29, 1, 1, pal.brass1);
    }
    border(ctx, 8, 8, 24, 24, pal.brass2, pal.stone1);
    lineH(ctx, 11, 20, 18, pal.chalk0);
    lineV(ctx, 20, 11, 18, pal.chalk0);
    // Crack
    px(ctx, 17, 12, 1, 4, pal.chalk1);
    px(ctx, 18, 15, 1, 1, pal.chalk1);
    px(ctx, 19, 16, 1, 3, pal.chalk1);
    px(ctx, 20, 18, 1, 2, pal.chalk1);
    px(ctx, 21, 20, 1, 3, pal.chalk1);
    px(ctx, 22, 23, 1, 2, pal.chalk1);
    px(ctx, 23, 25, 1, 4, pal.chalk1);
  });

  makeCanvasTexture(scene, mercuryTexKey("hermaia_seal", zone), 48, 48, (ctx) => {
    px(ctx, 0, 0, 48, 48, "rgba(0,0,0,0)");
    border(ctx, 8, 8, 32, 32, pal.chalk0, pal.chalk1);
    border(ctx, 14, 14, 20, 20, pal.brass1, pal.chalk0);
    lineH(ctx, 16, 24, 16, pal.chalk1);
    lineV(ctx, 24, 16, 16, pal.chalk1);
    runeDiamond(ctx, 22, 22, pal.brass2);
    // Outer cardinal sparks
    px(ctx, 24, 4, 1, 2, pal.chalk1);
    px(ctx, 24, 42, 1, 2, pal.chalk1);
    px(ctx, 4, 24, 2, 1, pal.chalk1);
    px(ctx, 42, 24, 2, 1, pal.chalk1);
  });
}

function makeDoorTextures(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  pal: MercuryPalette,
) {
  const makeDoor = (
    suffix: string,
    accent: string,
    motif: "doubt" | "certainty" | "silence",
  ) => {
    makeCanvasTexture(scene, mercuryTexKey(suffix, zone), 32, 48, (ctx) => {
      px(ctx, 0, 0, 32, 48, pal.stone0);
      border(ctx, 0, 0, 32, 48, pal.stone2, pal.brass1);
      border(ctx, 4, 4, 24, 40, pal.stone1, pal.bg1);
      if (motif === "doubt") {
        // Open-form glyph: arc + central dot, slightly broken lines
        lineH(ctx, 8, 14, 16, accent);
        lineV(ctx, 16, 12, 12, accent);
        // Unstable chalk-mark breaks
        px(ctx, 12, 18, 1, 1, "rgba(0,0,0,0.0)");
        px(ctx, 18, 22, 1, 1, "rgba(0,0,0,0.0)");
        px(ctx, 15, 30, 3, 3, pal.chalk1);
      } else if (motif === "certainty") {
        // Closed square within a heavy frame
        border(ctx, 10, 12, 12, 18, accent, pal.chalk1);
        lineH(ctx, 12, 21, 8, accent);
        // Brass corner studs
        px(ctx, 9, 11, 2, 2, pal.brass2);
        px(ctx, 21, 11, 2, 2, pal.brass2);
        px(ctx, 9, 29, 2, 2, pal.brass2);
        px(ctx, 21, 29, 2, 2, pal.brass2);
      } else {
        // Silence: a single luminous centerline, monolithic
        lineV(ctx, 16, 10, 24, accent);
        // Faint side ticks
        px(ctx, 14, 14, 1, 1, pal.chalk0);
        px(ctx, 18, 14, 1, 1, pal.chalk0);
        px(ctx, 14, 30, 1, 1, pal.chalk0);
        px(ctx, 18, 30, 1, 1, pal.chalk0);
        px(ctx, 14, 36, 5, 2, pal.chalk1);
      }
    });
  };

  makeDoor("door_doubt", pal.chalk0, "doubt");
  makeDoor("door_certainty", pal.brass2, "certainty");
  makeDoor("door_silence", pal.accent0, "silence");
}
