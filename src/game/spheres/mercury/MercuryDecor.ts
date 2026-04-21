/**
 * Mercury scene-dressing helpers — placement utilities that compose
 * the baked tiles into rails, pillar runs, and plaque rows. Each
 * helper returns a destroyable handle so the room painter can clean up
 * cleanly when zones swap.
 */
import * as Phaser from "phaser";
import { mercuryTexKey } from "./MercuryTextures";
import type { MercuryZoneKey } from "./MercuryPalette";

export type MercuryDecorHandle = {
  destroy(): void;
};

export function placeMercuryRails(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  x: number,
  y: number,
  count: number,
): MercuryDecorHandle {
  const parts: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(
      scene.add
        .image(x + i * 16, y, mercuryTexKey("rail", zone))
        .setOrigin(0, 0)
        .setDepth(3),
    );
  }
  return { destroy: () => parts.forEach((p) => p.destroy()) };
}

export function placeMercuryPillars(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  x: number,
  y: number,
  count: number,
  gap = 28,
): MercuryDecorHandle {
  const parts: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(
      scene.add
        .image(x + i * gap, y, mercuryTexKey("pillar", zone))
        .setOrigin(0, 0)
        .setDepth(2),
    );
  }
  return { destroy: () => parts.forEach((p) => p.destroy()) };
}

export function placePlaques(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  x: number,
  y: number,
  count: number,
  gap = 28,
): MercuryDecorHandle {
  const parts: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(
      scene.add
        .image(x + i * gap, y, mercuryTexKey("plaque", zone))
        .setOrigin(0, 0)
        .setDepth(3),
    );
  }
  return { destroy: () => parts.forEach((p) => p.destroy()) };
}

export function placeMercuryLamps(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  positions: Array<[number, number]>,
): { handle: MercuryDecorHandle; lamps: Phaser.GameObjects.Image[] } {
  const lamps: Phaser.GameObjects.Image[] = positions.map(([x, y]) =>
    scene.add
      .image(x, y, mercuryTexKey("lamp", zone))
      .setOrigin(0, 0)
      .setDepth(3),
  );
  return {
    lamps,
    handle: { destroy: () => lamps.forEach((p) => p.destroy()) },
  };
}

export function placeMercuryObelisk(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
  x: number,
  y: number,
): MercuryDecorHandle {
  const o = scene.add
    .image(x, y, mercuryTexKey("obelisk", zone))
    .setOrigin(0, 0)
    .setDepth(3);
  return { destroy: () => o.destroy() };
}
