/**
 * Sun Sphere — minimal authored backdrop kit per zone.
 *
 * Not noisy random detail; one dominant landmark per zone, gold/red/pale
 * palette discipline, dark floor band for foreground readability.
 */

import * as Phaser from "phaser";
import { GBC_W, GBC_H } from "../gbcArt";
import type { SunZoneId } from "./SunData";

const PAL = {
  dark: 0x120c12,
  mid: 0x4a2c28,
  gold: 0xd8b060,
  pale: 0xf0e0b8,
  red: 0x8a4038,
} as const;

/**
 * Paint the backdrop for a Sun sub-zone into `root`. Caller owns lifetime
 * by destroying `root`'s children when the zone changes.
 */
export function buildSunBackdrop(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  zone: SunZoneId,
) {
  const g = scene.add.graphics().setDepth(1);
  root.add(g);

  // Sky band + horizon haze + dark floor band.
  g.fillStyle(PAL.dark, 1).fillRect(0, 0, GBC_W, GBC_H);
  g.fillStyle(PAL.mid, 1).fillRect(0, 20, GBC_W, 70);
  g.fillStyle(0x0a0a0a, 0.65).fillRect(0, 94, GBC_W, 50);

  switch (zone) {
    case "vestibule":
      // Receiving line of light + two flanking pylons.
      g.fillStyle(PAL.gold, 0.16).fillEllipse(80, 42, 88, 20);
      g.lineStyle(1, PAL.gold, 0.45).strokeEllipse(80, 42, 88, 20);
      g.fillStyle(PAL.red, 1).fillRect(20, 32, 10, 34);
      g.fillStyle(PAL.red, 1).fillRect(130, 32, 10, 34);
      break;
    case "testimony":
      // Two long horizontal banners.
      g.fillStyle(PAL.gold, 0.1).fillRect(20, 28, 120, 8);
      g.fillStyle(PAL.gold, 0.06).fillRect(12, 56, 136, 10);
      break;
    case "archive":
      // A single vellum panel with margin border.
      g.fillStyle(PAL.pale, 0.08).fillRect(18, 30, 124, 52);
      g.lineStyle(1, PAL.gold, 0.25).strokeRect(18, 30, 124, 52);
      break;
    case "mirrors":
      // Four standing mirrors.
      for (let i = 0; i < 4; i++) {
        g.fillStyle(0x2c2438, 1).fillRect(14 + i * 34, 26, 22, 46);
        g.lineStyle(1, PAL.pale, 0.35).strokeRect(14 + i * 34, 26, 22, 46);
      }
      break;
    case "warmth":
      // Hearth glow and a long low bench.
      g.fillStyle(0xe0b070, 0.08).fillEllipse(80, 54, 110, 32);
      g.fillStyle(PAL.red, 1).fillRect(34, 66, 92, 6);
      break;
    case "threshold":
      // Sun-disc with a dark threshold gate inside.
      g.fillStyle(0xe0c890, 0.12).fillEllipse(80, 44, 70, 70);
      g.lineStyle(1, PAL.gold, 0.45).strokeEllipse(80, 44, 70, 70);
      g.fillStyle(0x201818, 1).fillRect(66, 28, 28, 44);
      g.lineStyle(1, PAL.pale, 0.5).strokeRect(66, 28, 28, 44);
      break;
  }
}

/**
 * Foreground occlusion strips that frame the playfield in select zones.
 */
export function addSunForeground(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  zone: SunZoneId,
) {
  const g = scene.add.graphics().setDepth(90);
  root.add(g);
  g.fillStyle(0x000000, 0.25);

  if (zone === "testimony") {
    g.fillRect(0, 100, 16, 44);
    g.fillRect(144, 100, 16, 44);
  }
  if (zone === "archive") {
    g.fillRect(0, 108, 160, 36);
  }
  if (zone === "threshold") {
    g.fillRect(0, 112, 160, 32);
  }
}
