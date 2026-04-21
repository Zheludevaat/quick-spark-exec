/**
 * Mars textures — bakes the small canvas tile/prop set used by the Mars
 * room painter. Idempotent: re-baking is a no-op once textures exist.
 */
import * as Phaser from "phaser";
import {
  ensureCanvasTexture,
  px,
  border,
  checker,
  lineH,
} from "../../visual/PixelCanvas";
import { MARS_BASE_PALETTE } from "./MarsPalette";
import type { ScenicPalette } from "../../visual/ScenicTypes";

export function ensureMarsTextures(
  scene: Phaser.Scene,
  pal: ScenicPalette = MARS_BASE_PALETTE,
) {
  ensureCanvasTexture(scene, "mars_floor_plain", 16, 16, (ctx) => {
    px(ctx, 0, 0, 16, 16, pal.floor0);
    checker(ctx, 0, 0, 16, 16, pal.floor0, pal.floor1, 2);
    lineH(ctx, 0, 0, 16, pal.floor1);
  });

  ensureCanvasTexture(scene, "mars_floor_line", 16, 16, (ctx) => {
    px(ctx, 0, 0, 16, 16, pal.floor0);
    checker(ctx, 0, 0, 16, 16, pal.floor0, pal.floor1, 2);
    lineH(ctx, 0, 8, 16, pal.accent1);
  });

  ensureCanvasTexture(scene, "mars_floor_infirm", 16, 16, (ctx) => {
    px(ctx, 0, 0, 16, 16, pal.floor0);
    checker(ctx, 0, 0, 16, 16, pal.floor0, pal.floor1, 4);
  });

  ensureCanvasTexture(scene, "mars_pillar", 16, 32, (ctx) => {
    px(ctx, 0, 0, 16, 32, "rgba(0,0,0,0)");
    px(ctx, 4, 0, 8, 32, pal.wall1);
    border(ctx, 4, 0, 8, 32, pal.accent1, pal.wall0);
    px(ctx, 2, 0, 12, 3, pal.trim0);
    px(ctx, 2, 29, 12, 3, pal.trim0);
  });

  ensureCanvasTexture(scene, "mars_banner", 12, 24, (ctx) => {
    px(ctx, 0, 0, 12, 24, "rgba(0,0,0,0)");
    px(ctx, 5, 0, 2, 4, pal.trim1);
    px(ctx, 2, 4, 8, 16, pal.accent0);
    border(ctx, 2, 4, 8, 16, pal.trim1);
    px(ctx, 4, 20, 4, 2, pal.trim1);
  });

  ensureCanvasTexture(scene, "mars_line_marker", 20, 8, (ctx) => {
    px(ctx, 0, 0, 20, 8, "rgba(0,0,0,0)");
    lineH(ctx, 0, 3, 20, pal.accent1);
    lineH(ctx, 0, 4, 20, pal.trim1);
  });

  ensureCanvasTexture(scene, "mars_seal", 24, 24, (ctx) => {
    px(ctx, 0, 0, 24, 24, "rgba(0,0,0,0)");
    border(ctx, 4, 4, 16, 16, pal.accent0, pal.accent1);
    px(ctx, 11, 7, 2, 10, pal.accent1);
    px(ctx, 7, 11, 10, 2, pal.accent1);
  });

  ensureCanvasTexture(scene, "mars_cot", 20, 10, (ctx) => {
    px(ctx, 0, 0, 20, 10, "rgba(0,0,0,0)");
    px(ctx, 0, 2, 20, 5, pal.wall1);
    border(ctx, 0, 2, 20, 5, pal.trim0);
    px(ctx, 1, 7, 2, 3, pal.wall0);
    px(ctx, 17, 7, 2, 3, pal.wall0);
  });
}
