/**
 * Mars textures — bakes per-zone canvas tile/prop set used by the Mars
 * room painter. Each zone gets its own palette-bound texture keys so
 * floors / banners / props actually shift across zones rather than
 * always falling back to a shared base-palette bake.
 */
import * as Phaser from "phaser";
import {
  ensureCanvasTexture,
  px,
  border,
  checker,
  lineH,
} from "../../visual/PixelCanvas";
import { MARS_ZONE_PALETTES, type MarsZoneKey } from "./MarsPalette";
import type { ScenicPalette } from "../../visual/ScenicTypes";

export type MarsTextureKeys = {
  floorPlain: string;
  floorLine: string;
  floorInfirm: string;
  pillar: string;
  banner: string;
  lineMarker: string;
  seal: string;
  cot: string;
};

function k(zone: MarsZoneKey, name: string) {
  return `mars_${zone}_${name}`;
}

export function ensureMarsTextures(
  scene: Phaser.Scene,
  zone: MarsZoneKey,
  pal: ScenicPalette = MARS_ZONE_PALETTES[zone],
): MarsTextureKeys {
  const keys: MarsTextureKeys = {
    floorPlain: k(zone, "floor_plain"),
    floorLine: k(zone, "floor_line"),
    floorInfirm: k(zone, "floor_infirm"),
    pillar: k(zone, "pillar"),
    banner: k(zone, "banner"),
    lineMarker: k(zone, "line_marker"),
    seal: k(zone, "seal"),
    cot: k(zone, "cot"),
  };

  ensureCanvasTexture(scene, keys.floorPlain, 16, 16, (ctx) => {
    px(ctx, 0, 0, 16, 16, pal.floor0);
    checker(ctx, 0, 0, 16, 16, pal.floor0, pal.floor1, 2);
    lineH(ctx, 0, 0, 16, pal.floor1);
  });

  ensureCanvasTexture(scene, keys.floorLine, 16, 16, (ctx) => {
    px(ctx, 0, 0, 16, 16, pal.floor0);
    checker(ctx, 0, 0, 16, 16, pal.floor0, pal.floor1, 2);
    lineH(ctx, 0, 8, 16, pal.accent1);
  });

  ensureCanvasTexture(scene, keys.floorInfirm, 16, 16, (ctx) => {
    px(ctx, 0, 0, 16, 16, pal.floor0);
    checker(ctx, 0, 0, 16, 16, pal.floor0, pal.floor1, 4);
  });

  ensureCanvasTexture(scene, keys.pillar, 16, 32, (ctx) => {
    px(ctx, 0, 0, 16, 32, "rgba(0,0,0,0)");
    px(ctx, 4, 0, 8, 32, pal.wall1);
    border(ctx, 4, 0, 8, 32, pal.accent1, pal.wall0);
    px(ctx, 2, 0, 12, 3, pal.trim0);
    px(ctx, 2, 29, 12, 3, pal.trim0);
  });

  ensureCanvasTexture(scene, keys.banner, 12, 24, (ctx) => {
    px(ctx, 0, 0, 12, 24, "rgba(0,0,0,0)");
    px(ctx, 5, 0, 2, 4, pal.trim1);
    px(ctx, 2, 4, 8, 16, pal.accent0);
    border(ctx, 2, 4, 8, 16, pal.trim1);
    px(ctx, 4, 20, 4, 2, pal.trim1);
  });

  ensureCanvasTexture(scene, keys.lineMarker, 20, 8, (ctx) => {
    px(ctx, 0, 0, 20, 8, "rgba(0,0,0,0)");
    lineH(ctx, 0, 3, 20, pal.accent1);
    lineH(ctx, 0, 4, 20, pal.trim1);
  });

  ensureCanvasTexture(scene, keys.seal, 24, 24, (ctx) => {
    px(ctx, 0, 0, 24, 24, "rgba(0,0,0,0)");
    border(ctx, 4, 4, 16, 16, pal.accent0, pal.accent1);
    px(ctx, 11, 7, 2, 10, pal.accent1);
    px(ctx, 7, 11, 10, 2, pal.accent1);
  });

  ensureCanvasTexture(scene, keys.cot, 20, 10, (ctx) => {
    px(ctx, 0, 0, 20, 10, "rgba(0,0,0,0)");
    px(ctx, 0, 2, 20, 5, pal.wall1);
    border(ctx, 0, 2, 20, 5, pal.trim0);
    px(ctx, 1, 7, 2, 3, pal.wall0);
    px(ctx, 17, 7, 2, 3, pal.wall0);
  });

  return keys;
}
