/**
 * Sun Sphere — authored per-zone backdrops.
 *
 * Visual thesis: RADIANT EXACTNESS. CEREMONY UNDER SCRUTINY.
 *
 * Each zone composes:
 *  - sky/horizon band tinted to its mood
 *  - a hero architectural element (arch, stand, desk, bay, hearth, gate)
 *  - secondary furniture (plaques, banners, pages, mirrors, keepsakes, circle)
 *  - a dark floor band so foreground hotspots stay readable
 *
 * `addSunForeground` paints occlusion strips and a few low-priority
 * silhouettes that frame the playfield without competing with hotspots.
 */

import * as Phaser from "phaser";
import { GBC_W, GBC_H } from "../gbcArt";
import type { SunZoneId } from "./SunData";

const PAL = {
  void: 0x07060b,
  shadow: 0x120c12,
  ground: 0x1a1014,
  mid: 0x4a2c28,
  amber: 0xb87838,
  gold: 0xd8b060,
  paleGold: 0xe8c878,
  ivory: 0xf0e0b8,
  white: 0xf8eed0,
  red: 0x8a4038,
  maroon: 0x5a2028,
  inkBlue: 0x2c2438,
  hush: 0x6c4c40,
} as const;

/** Shared sky+horizon+floor wash tinted by mood. */
function paintSky(
  g: Phaser.GameObjects.Graphics,
  topTint: number,
  midTint: number,
) {
  g.fillStyle(PAL.void, 1).fillRect(0, 0, GBC_W, GBC_H);
  g.fillStyle(topTint, 0.55).fillRect(0, 0, GBC_W, 22);
  g.fillStyle(midTint, 1).fillRect(0, 20, GBC_W, 70);
  g.fillStyle(PAL.ground, 0.7).fillRect(0, 88, GBC_W, 56);
  // Tile lines on the floor for depth.
  g.lineStyle(1, 0x000000, 0.35);
  for (let i = 0; i < 6; i++) {
    const y = 92 + i * 8;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(GBC_W, y);
    g.strokePath();
  }
}

export function buildSunBackdrop(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  zone: SunZoneId,
) {
  const g = scene.add.graphics().setDepth(1);
  root.add(g);

  switch (zone) {
    case "vestibule":
      paintSky(g, PAL.amber, PAL.maroon);
      // Reception arch: two pylons + golden lintel + halo above.
      g.fillStyle(PAL.maroon, 1).fillRect(20, 30, 12, 60);
      g.fillStyle(PAL.maroon, 1).fillRect(128, 30, 12, 60);
      g.fillStyle(PAL.gold, 0.85).fillRect(20, 26, 120, 6);
      g.fillStyle(PAL.paleGold, 0.18).fillEllipse(80, 30, 96, 16);
      g.lineStyle(1, PAL.gold, 0.5).strokeEllipse(80, 30, 96, 16);
      // Laurel motif on lintel.
      g.fillStyle(PAL.ivory, 0.8);
      for (let i = 0; i < 11; i++) {
        g.fillRect(28 + i * 10, 25, 2, 2);
        g.fillRect(32 + i * 10, 33, 2, 2);
      }
      // Brass plaques flanking the arch.
      g.fillStyle(PAL.amber, 1).fillRect(8, 56, 10, 18);
      g.lineStyle(1, PAL.gold, 0.7).strokeRect(8, 56, 10, 18);
      g.fillStyle(PAL.amber, 1).fillRect(142, 56, 10, 18);
      g.lineStyle(1, PAL.gold, 0.7).strokeRect(142, 56, 10, 18);
      // Audience bench silhouette.
      g.fillStyle(0x000000, 0.6).fillRect(36, 96, 88, 4);
      g.fillStyle(0x000000, 0.6).fillRect(40, 100, 4, 8);
      g.fillStyle(0x000000, 0.6).fillRect(116, 100, 4, 8);
      // Title plate above the arch.
      g.fillStyle(PAL.ivory, 0.9).fillRect(64, 16, 32, 6);
      g.lineStyle(1, PAL.gold, 0.9).strokeRect(64, 16, 32, 6);
      break;

    case "testimony": {
      paintSky(g, PAL.paleGold, PAL.mid);
      // Two suspended banners (judicial chapel feel).
      g.fillStyle(PAL.maroon, 0.85).fillRect(22, 22, 36, 28);
      g.lineStyle(1, PAL.gold, 0.8).strokeRect(22, 22, 36, 28);
      g.fillStyle(PAL.gold, 0.9).fillRect(28, 30, 24, 2);
      g.fillStyle(PAL.gold, 0.9).fillRect(28, 36, 24, 2);
      g.fillStyle(PAL.maroon, 0.85).fillRect(102, 22, 36, 28);
      g.lineStyle(1, PAL.gold, 0.8).strokeRect(102, 22, 36, 28);
      g.fillStyle(PAL.gold, 0.9).fillRect(108, 30, 24, 2);
      g.fillStyle(PAL.gold, 0.9).fillRect(108, 36, 24, 2);
      // Banner ropes.
      g.lineStyle(1, PAL.hush, 0.9);
      g.beginPath();
      g.moveTo(40, 6); g.lineTo(40, 22); g.strokePath();
      g.beginPath();
      g.moveTo(120, 6); g.lineTo(120, 22); g.strokePath();
      // Witness stand: lectern at center stage.
      g.fillStyle(PAL.amber, 1).fillRect(72, 60, 16, 24);
      g.lineStyle(1, PAL.gold, 0.9).strokeRect(72, 60, 16, 24);
      g.fillStyle(PAL.gold, 1).fillRect(70, 58, 20, 4);
      // Speaking floor — golden inlay disc.
      g.fillStyle(PAL.gold, 0.18).fillEllipse(80, 100, 80, 14);
      g.lineStyle(1, PAL.gold, 0.5).strokeEllipse(80, 100, 80, 14);
      break;
    }

    case "archive": {
      paintSky(g, PAL.ivory, PAL.shadow);
      // Vellum wall — tall page with margin border.
      g.fillStyle(PAL.ivory, 0.12).fillRect(14, 26, 132, 58);
      g.lineStyle(1, PAL.gold, 0.5).strokeRect(14, 26, 132, 58);
      g.lineStyle(1, PAL.amber, 0.6);
      g.beginPath();
      g.moveTo(28, 26); g.lineTo(28, 84); g.strokePath();
      // Lines of text (approx).
      g.fillStyle(PAL.ivory, 0.55);
      for (let row = 0; row < 7; row++) {
        const y = 32 + row * 7;
        const len = 80 + ((row * 17) % 30);
        g.fillRect(34, y, len, 1);
      }
      // Redacted bars (crossed-out passages).
      g.fillStyle(PAL.maroon, 0.85).fillRect(34, 46, 44, 3);
      g.fillStyle(PAL.maroon, 0.85).fillRect(60, 67, 56, 3);
      // Marginal annotations (small jagged ink).
      g.fillStyle(PAL.red, 0.95);
      for (let i = 0; i < 5; i++) {
        g.fillRect(18, 38 + i * 8, 4, 1);
        g.fillRect(20, 40 + i * 8, 5, 1);
      }
      // Revision desk silhouette.
      g.fillStyle(0x000000, 0.7).fillRect(40, 96, 80, 6);
      g.fillStyle(0x000000, 0.7).fillRect(46, 102, 4, 10);
      g.fillStyle(0x000000, 0.7).fillRect(110, 102, 4, 10);
      // Inkwell + quill on desk.
      g.fillStyle(PAL.amber, 1).fillRect(74, 92, 4, 4);
      g.lineStyle(1, PAL.ivory, 0.9);
      g.beginPath();
      g.moveTo(80, 92); g.lineTo(86, 84); g.strokePath();
      break;
    }

    case "mirrors": {
      paintSky(g, PAL.inkBlue, PAL.shadow);
      // Five standing mirrors with frames — distortion lines.
      const ws = [22, 18, 24, 18, 22];
      let x = 8;
      for (let i = 0; i < ws.length; i++) {
        const w = ws[i];
        const h = 50 + (i % 2 === 0 ? 0 : -6);
        // Frame.
        g.fillStyle(PAL.amber, 1).fillRect(x - 1, 24, w + 2, h + 2);
        // Glass.
        g.fillStyle(PAL.inkBlue, 1).fillRect(x, 25, w, h);
        // Distorted reflection — a bent vertical streak.
        g.fillStyle(PAL.paleGold, 0.35);
        for (let r = 0; r < h; r += 2) {
          const off = Math.round(Math.sin((r + i * 4) * 0.4) * 2);
          g.fillRect(x + Math.floor(w / 2) + off, 25 + r, 2, 1);
        }
        // Small caption plate beneath each mirror.
        g.fillStyle(PAL.ivory, 0.8).fillRect(x, 25 + h + 1, w, 3);
        g.lineStyle(1, PAL.gold, 0.6).strokeRect(x - 1, 24, w + 2, h + 2);
        x += w + 6;
      }
      // Reflective floor highlight.
      g.fillStyle(PAL.paleGold, 0.06).fillRect(0, 88, GBC_W, 6);
      break;
    }

    case "warmth": {
      paintSky(g, PAL.amber, PAL.maroon);
      // Hearth: warm glow with ember core.
      g.fillStyle(0xe0a060, 0.15).fillEllipse(80, 58, 130, 44);
      g.fillStyle(0xe0a060, 0.25).fillEllipse(80, 62, 70, 22);
      g.fillStyle(0xff9040, 0.5).fillEllipse(80, 64, 22, 8);
      // Mantle and hearthstones.
      g.fillStyle(PAL.maroon, 1).fillRect(48, 52, 64, 4);
      g.fillStyle(PAL.shadow, 1).fillRect(48, 56, 64, 16);
      g.lineStyle(1, PAL.amber, 0.6).strokeRect(48, 56, 64, 16);
      // A low intimate bench (closer than vestibule).
      g.fillStyle(PAL.amber, 1).fillRect(20, 96, 120, 4);
      g.fillStyle(PAL.amber, 1).fillRect(24, 100, 4, 10);
      g.fillStyle(PAL.amber, 1).fillRect(132, 100, 4, 10);
      // Keepsakes table (left): cup + folded letters.
      g.fillStyle(PAL.shadow, 1).fillRect(8, 78, 22, 4);
      g.fillStyle(PAL.ivory, 0.95).fillRect(10, 74, 6, 4);
      g.fillStyle(PAL.ivory, 0.85).fillRect(18, 76, 10, 2);
      g.fillStyle(PAL.ivory, 0.85).fillRect(20, 72, 8, 2);
      // Keepsakes table (right): small portrait.
      g.fillStyle(PAL.shadow, 1).fillRect(130, 78, 22, 4);
      g.fillStyle(PAL.ivory, 0.9).fillRect(135, 70, 12, 8);
      g.lineStyle(1, PAL.gold, 0.85).strokeRect(135, 70, 12, 8);
      break;
    }

    case "threshold": {
      paintSky(g, PAL.gold, PAL.maroon);
      // Sovereign sun disc behind the gate.
      g.fillStyle(0xffd070, 0.18).fillEllipse(80, 50, 120, 84);
      g.lineStyle(1, PAL.gold, 0.7).strokeEllipse(80, 50, 120, 84);
      g.lineStyle(1, PAL.gold, 0.45).strokeEllipse(80, 50, 100, 70);
      g.lineStyle(1, PAL.gold, 0.3).strokeEllipse(80, 50, 80, 56);
      // Concentric witness circle (low ground inlay).
      g.lineStyle(1, PAL.paleGold, 0.55).strokeEllipse(80, 104, 130, 18);
      g.lineStyle(1, PAL.paleGold, 0.4).strokeEllipse(80, 104, 100, 14);
      g.lineStyle(1, PAL.paleGold, 0.3).strokeEllipse(80, 104, 70, 10);
      // The Helion gate.
      g.fillStyle(0x140808, 1).fillRect(64, 26, 32, 56);
      g.lineStyle(1, PAL.gold, 0.95).strokeRect(64, 26, 32, 56);
      g.fillStyle(PAL.gold, 0.95).fillRect(78, 26, 4, 56);
      g.fillStyle(PAL.gold, 0.6).fillRect(64, 52, 32, 2);
      // Sun-rays radiating from the gate top.
      g.lineStyle(1, PAL.paleGold, 0.55);
      for (let i = -3; i <= 3; i++) {
        const x1 = 80 + i * 4;
        const x2 = 80 + i * 14;
        g.beginPath();
        g.moveTo(x1, 24); g.lineTo(x2, 8); g.strokePath();
      }
      // Two sentinel pillars.
      g.fillStyle(PAL.maroon, 1).fillRect(36, 70, 8, 22);
      g.fillStyle(PAL.gold, 1).fillRect(34, 68, 12, 4);
      g.fillStyle(PAL.maroon, 1).fillRect(116, 70, 8, 22);
      g.fillStyle(PAL.gold, 1).fillRect(114, 68, 12, 4);
      break;
    }
  }
}

/**
 * Foreground occlusion + framing strips. Kept low-impact so hotspots
 * remain the reading priority.
 */
export function addSunForeground(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  zone: SunZoneId,
) {
  const g = scene.add.graphics().setDepth(90);
  root.add(g);
  g.fillStyle(0x000000, 0.28);

  switch (zone) {
    case "vestibule":
      g.fillRect(0, 124, GBC_W, 20);
      // Floor runner.
      g.fillStyle(PAL.maroon, 0.6).fillRect(56, 110, 48, 14);
      break;
    case "testimony":
      g.fillRect(0, 100, 14, 44);
      g.fillRect(146, 100, 14, 44);
      // Spotlight pool downstage.
      g.fillStyle(PAL.paleGold, 0.08).fillEllipse(80, 128, 80, 14);
      break;
    case "archive":
      g.fillRect(0, 116, GBC_W, 28);
      // Stack of paper edge.
      g.fillStyle(PAL.ivory, 0.18).fillRect(8, 116, 22, 4);
      g.fillStyle(PAL.ivory, 0.18).fillRect(130, 118, 22, 3);
      break;
    case "mirrors":
      g.fillRect(0, 122, GBC_W, 22);
      // Reflected light pool.
      g.fillStyle(PAL.paleGold, 0.07).fillRect(0, 120, GBC_W, 4);
      break;
    case "warmth":
      g.fillRect(0, 126, GBC_W, 18);
      // Ember light catching the floor.
      g.fillStyle(0xff9040, 0.1).fillEllipse(80, 124, 110, 10);
      break;
    case "threshold":
      g.fillRect(0, 124, GBC_W, 20);
      // Light spilling from the gate.
      g.fillStyle(PAL.paleGold, 0.12).fillEllipse(80, 122, 60, 10);
      break;
  }
}

/**
 * Optional aftermath overlay — paints subtle softening when the zone's
 * primary witness/operation is complete. Caller passes a 0..1 progress.
 */
export function addSunAftermath(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  zone: SunZoneId,
  progress: number,
) {
  if (progress <= 0) return;
  const a = Math.min(1, Math.max(0, progress));
  const g = scene.add.graphics().setDepth(85);
  root.add(g);

  switch (zone) {
    case "vestibule":
      // Brass plaques begin to dim, halo softens.
      g.fillStyle(0x000000, 0.18 * a).fillRect(8, 56, 10, 18);
      g.fillStyle(0x000000, 0.18 * a).fillRect(142, 56, 10, 18);
      g.fillStyle(PAL.ivory, 0.12 * a).fillEllipse(80, 30, 96, 16);
      break;
    case "testimony":
      // Stand grows a quiet golden underline.
      g.fillStyle(PAL.paleGold, 0.55 * a).fillRect(70, 82, 20, 1);
      break;
    case "archive":
      // A new annotation appears in the margin.
      g.fillStyle(PAL.ivory, 0.85 * a).fillRect(18, 74, 6, 1);
      g.fillStyle(PAL.ivory, 0.7 * a).fillRect(18, 76, 8, 1);
      break;
    case "mirrors":
      // Mirrors steady (less wobble) — paint a clarifying highlight.
      g.fillStyle(PAL.paleGold, 0.18 * a).fillRect(0, 72, GBC_W, 2);
      break;
    case "warmth":
      // Hearth quiets; a folded letter appears on the bench.
      g.fillStyle(PAL.ivory, 0.95 * a).fillRect(74, 92, 8, 4);
      g.fillStyle(0x000000, 0.18 * a).fillEllipse(80, 64, 22, 8);
      break;
    case "threshold":
      // Gate seam parts a hair; ground circle brightens.
      g.fillStyle(PAL.paleGold, 0.4 * a).fillRect(78, 30, 4, 48);
      g.lineStyle(1, PAL.paleGold, 0.6 * a).strokeEllipse(80, 104, 130, 18);
      break;
  }
}
