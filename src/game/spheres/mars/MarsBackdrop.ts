/**
 * Mars backdrop — sky/haze/silhouette layers per zone. Returns a handle
 * the room painter cleans up on zone change. Texture keys are passed in
 * by the room painter so backdrop art uses the same per-zone palette
 * bake as the rest of the room.
 */
import * as Phaser from "phaser";
import { MARS_ZONE_PALETTES, type MarsZoneKey } from "./MarsPalette";
import type { ScenicHandle } from "../../visual/ScenicTypes";
import type { MarsTextureKeys } from "./MarsTextures";

export function buildMarsBackdrop(
  scene: Phaser.Scene,
  zone: MarsZoneKey,
  textures: Pick<MarsTextureKeys, "banner" | "seal">,
): ScenicHandle {
  const pal = MARS_ZONE_PALETTES[zone];
  const parts: Phaser.GameObjects.GameObject[] = [];

  const sky = scene.add
    .rectangle(
      0,
      0,
      160,
      144,
      Phaser.Display.Color.HexStringToColor(pal.bg0).color,
    )
    .setOrigin(0, 0)
    .setDepth(0);
  parts.push(sky);

  const haze = scene.add
    .rectangle(
      0,
      18,
      160,
      68,
      Phaser.Display.Color.HexStringToColor(pal.bg1).color,
      0.85,
    )
    .setOrigin(0, 0)
    .setDepth(0);
  parts.push(haze);

  if (zone === "approach" || zone === "stands" || zone === "line_yard") {
    for (let i = 0; i < 5; i++) {
      const block = scene.add
        .rectangle(
          i * 34 - 4,
          76 - (18 + (i % 3) * 8),
          24,
          26 + (i % 4) * 8,
          Phaser.Display.Color.HexStringToColor(pal.bg2).color,
        )
        .setOrigin(0, 0)
        .setDepth(1);
      parts.push(block);
    }
  }

  if (zone === "stands") {
    for (let i = 0; i < 7; i++) {
      const banner = scene.add
        .image(16 + i * 20, 18, textures.banner)
        .setOrigin(0.5, 0)
        .setDepth(2);
      parts.push(banner);
    }
  }

  if (zone === "trial" || zone === "threshold") {
    const seal = scene.add
      .image(80, 34, textures.seal)
      .setOrigin(0.5, 0.5)
      .setDepth(2);
    parts.push(seal);
    scene.tweens.add({
      targets: seal,
      alpha: { from: 0.7, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });
  }

  return {
    destroy() {
      parts.forEach((p) => p.destroy());
    },
  };
}
