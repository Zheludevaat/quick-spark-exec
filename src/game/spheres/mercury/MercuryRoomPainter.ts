/**
 * Mercury room painter. Composes the full visual stack for a given
 * zone:
 *   - backdrop (depth 0..2)
 *   - decor: pillars, rails, plaques, lamps (depth 2..3)
 *   - landmark (depth 3)
 *   - subtle fx (depth 4)
 *
 * Keeps gameplay readability by NOT carpeting the floor with tiles —
 * the existing scenes already establish walkable surfaces. The painter
 * owns only the atmospheric layers behind them.
 */
import * as Phaser from "phaser";
import {
  MERCURY_ZONE_PALETTES,
  type MercuryZoneKey,
} from "./MercuryPalette";
import { ensureMercuryTextures, mercuryTexKey } from "./MercuryTextures";
import { buildMercuryBackdrop } from "./MercuryBackdrop";
import {
  placeMercuryLamps,
  placeMercuryObelisk,
  placeMercuryPillars,
  placeMercuryRails,
  placePlaques,
} from "./MercuryDecor";
import {
  createCrackedLensLandmark,
  createHermaiaSealLandmark,
  createTrialDoorsLandmark,
} from "./MercuryLandmarks";
import { createLampShimmer, createMercuryMotes } from "./MercuryFx";

export type MercuryRoomArtHandle = {
  destroy(): void;
};

export function paintMercuryRoom(
  scene: Phaser.Scene,
  zone: MercuryZoneKey,
): MercuryRoomArtHandle {
  const pal = MERCURY_ZONE_PALETTES[zone];
  ensureMercuryTextures(scene, zone, pal);

  const parts: Array<{ destroy(): void }> = [];
  parts.push(buildMercuryBackdrop(scene, zone));

  // Per-zone composition. Compositions are deliberately spare — they
  // sit behind authored stations and add silhouette, not clutter.
  switch (zone) {
    case "plateau": {
      parts.push(placeMercuryPillars(scene, zone, 4, 50, 1, 0));
      parts.push(placeMercuryPillars(scene, zone, 144, 50, 1, 0));

      const lampSet = placeMercuryLamps(scene, zone, [
        [24, 28],
        [132, 28],
      ]);
      parts.push(lampSet.handle, createLampShimmer(scene, lampSet.lamps));

      parts.push(createMercuryMotes(scene, 5));
      break;
    }
    case "ascent": {
      parts.push(placeMercuryPillars(scene, zone, 8, 44, 5, 30));
      parts.push(placePlaques(scene, zone, 18, 32, 4, 30));
      parts.push(placeMercuryRails(scene, zone, 8, 90, 9));
      parts.push(createMercuryMotes(scene, 10));
      break;
    }
    case "defender": {
      parts.push(placeMercuryPillars(scene, zone, 16, 40, 4, 32));
      const med = scene.add
        .image(64, 100, mercuryTexKey("floor_medallion", zone))
        .setOrigin(0, 0)
        .setDepth(3);
      parts.push({ destroy: () => med.destroy() });
      break;
    }
    case "pedant": {
      parts.push(placePlaques(scene, zone, 8, 30, 6, 24));
      parts.push(placePlaques(scene, zone, 14, 52, 5, 26));
      parts.push(placeMercuryPillars(scene, zone, 12, 70, 3, 56));
      break;
    }
    case "casuist": {
      parts.push(placeMercuryPillars(scene, zone, 14, 50, 2, 96));
      parts.push(placeMercuryRails(scene, zone, 8, 92, 9));
      const med = scene.add
        .image(64, 96, mercuryTexKey("floor_medallion", zone))
        .setOrigin(0, 0)
        .setDepth(3);
      parts.push({ destroy: () => med.destroy() });
      break;
    }
    case "cracking": {
      const med = scene.add
        .image(64, 96, mercuryTexKey("floor_medallion", zone))
        .setOrigin(0, 0)
        .setDepth(3);
      parts.push({ destroy: () => med.destroy() });
      parts.push(createCrackedLensLandmark(scene, zone, 80, 64));
      parts.push(createMercuryMotes(scene, 14));
      break;
    }
    case "trial": {
      const med = scene.add
        .image(64, 100, mercuryTexKey("floor_medallion", zone))
        .setOrigin(0, 0)
        .setDepth(3);
      parts.push({ destroy: () => med.destroy() });
      parts.push(createTrialDoorsLandmark(scene, zone, 80, 90));
      parts.push(placeMercuryPillars(scene, zone, 8, 32, 1, 0));
      parts.push(placeMercuryPillars(scene, zone, 144, 32, 1, 0));
      parts.push(createMercuryMotes(scene, 12));
      break;
    }
    case "hermaia": {
      parts.push(placeMercuryPillars(scene, zone, 16, 32, 4, 36));
      parts.push(createHermaiaSealLandmark(scene, zone, 80, 44));
      const med = scene.add
        .image(64, 100, mercuryTexKey("floor_medallion", zone))
        .setOrigin(0, 0)
        .setDepth(3);
      parts.push({ destroy: () => med.destroy() });
      parts.push(createMercuryMotes(scene, 10));
      break;
    }
  }

  return {
    destroy() {
      parts.forEach((p) => {
        try {
          p.destroy();
        } catch {
          /* ignore */
        }
      });
    },
  };
}
