/**
 * Mercury layered backdrop. Provides depth and atmosphere behind the
 * playable architecture: void wash, distant horizon massings, signature
 * Tower silhouette for exterior rooms, and a quiet star field. Lives at
 * depth 0..2 so existing scene rectangles paint cleanly on top.
 */
import * as Phaser from "phaser";
import {
  MERCURY_ZONE_PALETTES,
  hexToColor,
  type MercuryZoneKey,
} from "./MercuryPalette";

export type MercuryBackdropHandle = {
  destroy(): void;
};

export function buildMercuryBackdrop(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
): MercuryBackdropHandle {
  const pal = MERCURY_ZONE_PALETTES[zone];
  const parts: Phaser.GameObjects.GameObject[] = [];

  // Void wash
  parts.push(
    scene.add
      .rectangle(0, 0, 160, 144, hexToColor(pal.bg0))
      .setOrigin(0, 0)
      .setDepth(0),
  );

  // Mid-haze band — gives the upper void a soft horizon glow
  parts.push(
    scene.add
      .rectangle(0, 18, 160, 60, hexToColor(pal.bg1), 0.85)
      .setOrigin(0, 0)
      .setDepth(0),
  );

  // Distant skyline blocks (modulated by zone)
  const blockCount =
    zone === "trial" || zone === "hermaia"
      ? 4
      : zone === "plateau"
        ? 4
        : 6;
  for (let i = 0; i < blockCount; i++) {
    const plateau = zone === "plateau";
    const w = plateau ? 22 + (i % 2) * 10 : 18 + (i % 3) * 8;
    const h = plateau ? 26 + (i % 3) * 7 : 22 + (i % 4) * 6;
    const x = plateau ? i * 36 - 6 : i * 28 - 4;
    const y = 74 - h;
    parts.push(
      scene.add
        .rectangle(x, y, w, h, hexToColor(pal.bg2), plateau ? 0.82 : 1)
        .setOrigin(0, 0)
        .setDepth(1),
    );
  }

  // Signature Tower silhouette — only for exterior rooms where it makes sense
  if (zone === "plateau" || zone === "ascent") {
    parts.push(
      scene.add
        .rectangle(108, 28, 18, 54, hexToColor(pal.stone0))
        .setOrigin(0, 0)
        .setDepth(1),
    );
    parts.push(
      scene.add
        .rectangle(104, 20, 26, 10, hexToColor(pal.stone1))
        .setOrigin(0, 0)
        .setDepth(1),
    );
    // Tower crown spire
    parts.push(
      scene.add
        .triangle(117, 12, 0, 8, 5, 0, 10, 8, hexToColor(pal.brass1))
        .setOrigin(0, 0)
        .setDepth(1),
    );
  }

  // Quiet star field — a faint ordered scatter
  const starColor = hexToColor(pal.chalk1);
  for (let i = 0; i < 22; i++) {
    parts.push(
      scene.add
        .rectangle(
          8 + ((i * 13) % 144),
          6 + ((i * 19) % 36),
          1,
          1,
          starColor,
          0.65,
        )
        .setOrigin(0, 0)
        .setDepth(2),
    );
  }

  return {
    destroy() {
      parts.forEach((p) => p.destroy());
    },
  };
}
