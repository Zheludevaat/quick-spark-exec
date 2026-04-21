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

/* ------------------------------------------------------------------ *
 *  UNIFIED HALL BACKDROP
 *
 *  Phase 2 of the Sun rebuild: instead of swapping a per-zone painting
 *  every time the player crosses an anchor, we paint the Hall as one
 *  continuous room. Six bays sit shoulder-to-shoulder, each carrying a
 *  miniaturised version of its zone's hero motif. A shared ceiling,
 *  cornice, and floor run the full width so movement feels like a
 *  procession rather than a slideshow.
 * ------------------------------------------------------------------ */

const HALL_BAY_X: { id: SunZoneId; cx: number }[] = [
  { id: "vestibule", cx: 18 },
  { id: "testimony", cx: 46 },
  { id: "archive", cx: 70 },
  { id: "mirrors", cx: 94 },
  { id: "warmth", cx: 120 },
  { id: "threshold", cx: 146 },
];

function bayPlinth(g: Phaser.GameObjects.Graphics, cx: number) {
  g.fillStyle(PAL.shadow, 1).fillRect(cx - 12, 84, 24, 6);
  g.lineStyle(1, PAL.gold, 0.35).strokeRect(cx - 12, 84, 24, 6);
}

function bayPilasters(g: Phaser.GameObjects.Graphics, cx: number) {
  g.fillStyle(PAL.maroon, 0.9).fillRect(cx - 13, 30, 2, 54);
  g.fillStyle(PAL.maroon, 0.9).fillRect(cx + 11, 30, 2, 54);
  g.fillStyle(PAL.gold, 0.7).fillRect(cx - 14, 28, 4, 2);
  g.fillStyle(PAL.gold, 0.7).fillRect(cx + 10, 28, 4, 2);
}

function bayVestibule(g: Phaser.GameObjects.Graphics, cx: number) {
  g.fillStyle(PAL.gold, 0.85).fillRect(cx - 10, 30, 20, 3);
  g.fillStyle(PAL.paleGold, 0.18).fillEllipse(cx, 32, 22, 8);
  g.lineStyle(1, PAL.gold, 0.55).strokeEllipse(cx, 32, 22, 8);
  g.fillStyle(PAL.amber, 1).fillRect(cx - 4, 56, 8, 14);
  g.lineStyle(1, PAL.gold, 0.7).strokeRect(cx - 4, 56, 8, 14);
  g.fillStyle(PAL.ivory, 0.9).fillRect(cx - 6, 18, 12, 4);
  g.lineStyle(1, PAL.gold, 0.9).strokeRect(cx - 6, 18, 12, 4);
}

function bayTestimony(g: Phaser.GameObjects.Graphics, cx: number) {
  g.lineStyle(1, PAL.hush, 0.9);
  g.beginPath();
  g.moveTo(cx, 6);
  g.lineTo(cx, 22);
  g.strokePath();
  g.fillStyle(PAL.maroon, 0.85).fillRect(cx - 8, 22, 16, 16);
  g.lineStyle(1, PAL.gold, 0.8).strokeRect(cx - 8, 22, 16, 16);
  g.fillStyle(PAL.gold, 0.9).fillRect(cx - 6, 28, 12, 1);
  g.fillStyle(PAL.gold, 0.9).fillRect(cx - 6, 32, 12, 1);
  g.fillStyle(PAL.amber, 1).fillRect(cx - 5, 60, 10, 18);
  g.lineStyle(1, PAL.gold, 0.9).strokeRect(cx - 5, 60, 10, 18);
  g.fillStyle(PAL.gold, 1).fillRect(cx - 6, 58, 12, 2);
}

function bayArchive(g: Phaser.GameObjects.Graphics, cx: number) {
  g.fillStyle(PAL.ivory, 0.12).fillRect(cx - 11, 26, 22, 50);
  g.lineStyle(1, PAL.gold, 0.5).strokeRect(cx - 11, 26, 22, 50);
  g.lineStyle(1, PAL.amber, 0.6);
  g.beginPath();
  g.moveTo(cx - 8, 26);
  g.lineTo(cx - 8, 76);
  g.strokePath();
  g.fillStyle(PAL.ivory, 0.55);
  for (let r = 0; r < 6; r++) g.fillRect(cx - 5, 32 + r * 6, 14, 1);
  g.fillStyle(PAL.maroon, 0.85).fillRect(cx - 5, 46, 14, 2);
  g.fillStyle(PAL.amber, 1).fillRect(cx - 1, 64, 3, 3);
  g.lineStyle(1, PAL.ivory, 0.85);
  g.beginPath();
  g.moveTo(cx + 1, 64);
  g.lineTo(cx + 5, 56);
  g.strokePath();
}

function bayMirrors(g: Phaser.GameObjects.Graphics, cx: number) {
  for (let m = 0; m < 2; m++) {
    const mx = cx - 6 + m * 12;
    g.fillStyle(PAL.amber, 1).fillRect(mx - 4, 26, 8, 50);
    g.fillStyle(PAL.inkBlue, 1).fillRect(mx - 3, 27, 6, 48);
    g.fillStyle(PAL.paleGold, 0.35);
    for (let r = 0; r < 48; r += 2) {
      const off = Math.round(Math.sin((r + m * 4) * 0.4) * 1.5);
      g.fillRect(mx + off, 27 + r, 1, 1);
    }
    g.lineStyle(1, PAL.gold, 0.6).strokeRect(mx - 4, 26, 8, 50);
  }
}

function bayWarmth(g: Phaser.GameObjects.Graphics, cx: number) {
  g.fillStyle(0xe0a060, 0.18).fillEllipse(cx, 56, 30, 30);
  g.fillStyle(0xff9040, 0.5).fillEllipse(cx, 62, 12, 6);
  g.fillStyle(PAL.maroon, 1).fillRect(cx - 11, 50, 22, 4);
  g.fillStyle(PAL.shadow, 1).fillRect(cx - 11, 54, 22, 14);
  g.lineStyle(1, PAL.amber, 0.6).strokeRect(cx - 11, 54, 22, 14);
  g.fillStyle(PAL.ivory, 0.9).fillRect(cx - 3, 78, 6, 3);
}

function bayThreshold(g: Phaser.GameObjects.Graphics, cx: number) {
  g.fillStyle(0xffd070, 0.16).fillEllipse(cx, 48, 36, 56);
  g.lineStyle(1, PAL.gold, 0.7).strokeEllipse(cx, 48, 36, 56);
  g.lineStyle(1, PAL.gold, 0.4).strokeEllipse(cx, 48, 26, 42);
  g.fillStyle(0x140808, 1).fillRect(cx - 8, 26, 16, 50);
  g.lineStyle(1, PAL.gold, 0.95).strokeRect(cx - 8, 26, 16, 50);
  g.fillStyle(PAL.gold, 0.95).fillRect(cx - 1, 26, 2, 50);
  g.lineStyle(1, PAL.paleGold, 0.5);
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(cx + i * 3, 22);
    g.lineTo(cx + i * 8, 8);
    g.strokePath();
  }
}

export function buildSunHallBackdrop(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
) {
  const g = scene.add.graphics().setDepth(1);
  root.add(g);

  g.fillStyle(PAL.void, 1).fillRect(0, 0, GBC_W, GBC_H);
  // Sky gradient warming toward the threshold (right).
  g.fillStyle(PAL.maroon, 0.45).fillRect(0, 0, GBC_W, 18);
  g.fillStyle(PAL.amber, 0.18).fillRect(60, 0, 100, 18);
  g.fillStyle(PAL.gold, 0.15).fillRect(110, 0, 50, 18);
  // Cornice beam.
  g.fillStyle(PAL.shadow, 1).fillRect(0, 18, GBC_W, 4);
  g.lineStyle(1, PAL.gold, 0.6);
  g.beginPath();
  g.moveTo(0, 22);
  g.lineTo(GBC_W, 22);
  g.strokePath();
  // Mid wall wash + warm gradient.
  g.fillStyle(PAL.mid, 1).fillRect(0, 22, GBC_W, 66);
  g.fillStyle(PAL.amber, 0.08).fillRect(60, 22, 100, 66);
  g.fillStyle(PAL.gold, 0.08).fillRect(110, 22, 50, 66);
  // Floor.
  g.fillStyle(PAL.ground, 0.78).fillRect(0, 88, GBC_W, 56);
  g.lineStyle(1, 0x000000, 0.35);
  for (let i = 0; i < 6; i++) {
    const y = 92 + i * 8;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(GBC_W, y);
    g.strokePath();
  }
  // Center aisle inlay.
  g.fillStyle(PAL.maroon, 0.35).fillRect(0, 108, GBC_W, 6);
  g.lineStyle(1, PAL.gold, 0.35);
  g.beginPath();
  g.moveTo(0, 108);
  g.lineTo(GBC_W, 108);
  g.strokePath();
  g.beginPath();
  g.moveTo(0, 114);
  g.lineTo(GBC_W, 114);
  g.strokePath();

  for (const { id, cx } of HALL_BAY_X) {
    bayPilasters(g, cx);
    bayPlinth(g, cx);
    switch (id) {
      case "vestibule": bayVestibule(g, cx); break;
      case "testimony": bayTestimony(g, cx); break;
      case "archive":   bayArchive(g, cx);   break;
      case "mirrors":   bayMirrors(g, cx);   break;
      case "warmth":    bayWarmth(g, cx);    break;
      case "threshold": bayThreshold(g, cx); break;
    }
  }
}

export function addSunHallForeground(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
) {
  const g = scene.add.graphics().setDepth(90);
  root.add(g);
  g.fillStyle(0x000000, 0.28).fillRect(0, 128, GBC_W, 16);
  g.fillStyle(0x000000, 0.32).fillRect(0, 22, 6, 122);
  g.fillStyle(0x000000, 0.32).fillRect(GBC_W - 6, 22, 6, 122);
  g.fillStyle(PAL.paleGold, 0.1).fillEllipse(146, 124, 44, 10);
}

/**
 * Hall aftermath: paints every zone whose progress > 0, so multiple
 * bays can soften simultaneously as the player completes the room.
 */
export function addSunHallAftermath(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  progressFor: (zone: SunZoneId) => number,
) {
  const ZONES: SunZoneId[] = [
    "vestibule", "testimony", "archive", "mirrors", "warmth", "threshold",
  ];
  for (const z of ZONES) {
    const p = progressFor(z);
    if (p > 0) addSunAftermath(scene, root, z, p);
  }
}
