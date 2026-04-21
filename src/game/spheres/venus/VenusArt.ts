/**
 * Venus chapter room art builders.
 *
 * Each builder lays down a tiled environment, scatters sprite props,
 * and adds atmospheric overlays for one Venus zone. Builders are
 * additive — they parent everything to the provided `root` container
 * so the host scene controls lifetime via `root.removeAll(true)`.
 *
 * Composition contract:
 *   depth 4..6   : floor + reflective floor
 *   depth 7..9   : back walls, drape, arch
 *   depth 10..12 : props (frames, busts, lamps, table, ladder)
 *   depth 13..14 : foreground frame + atmospheric overlays
 *
 * NPCs and gameplay markers are NOT placed here — venus.ts owns those.
 * Builders MUST stay below depth 18 so player (depth 40) reads cleanly.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H } from "../../gbcArt";
import { VENUS_TILE } from "./VenusTiles";
import { VENUS_SPRITE } from "./VenusSprites";

const TILE = 16;
const TEX = "venus_tiles";

/** Stamp a tile from the Venus tilesheet at integer pixel position. */
function stamp(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  x: number,
  y: number,
  frame: number,
  depth: number,
) {
  const img = scene.add.image(x, y, TEX, frame).setOrigin(0, 0).setDepth(depth);
  root.add(img);
  return img;
}

/** Stamp a sprite prop centered on (cx, cy). */
function placeProp(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  cx: number,
  cy: number,
  key: string,
  depth: number,
  alpha = 1,
) {
  const img = scene.add.image(cx, cy, key).setOrigin(0.5, 0.5).setDepth(depth).setAlpha(alpha);
  root.add(img);
  return img;
}

/** Tile a horizontal floor strip from y..y+TILE across the full width. */
function tileFloorStrip(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  y: number,
  frame: number,
  depth = 4,
) {
  for (let x = 0; x < GBC_W; x += TILE) stamp(scene, root, x, y, frame, depth);
}

/** Tile a horizontal wall band along the back. */
function tileWallBand(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  y: number,
  frame: number,
  depth = 7,
) {
  for (let x = 0; x < GBC_W; x += TILE) stamp(scene, root, x, y, frame, depth);
}

/** Soft floor reflection streaks under the player walking band. */
function addReflectionPool(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  y: number,
  alpha = 0.35,
) {
  const pool = scene.add
    .rectangle(0, y, GBC_W, 18, 0xf6eef8, alpha)
    .setOrigin(0, 0)
    .setDepth(5)
    .setBlendMode(Phaser.BlendModes.ADD);
  root.add(pool);
  scene.tweens.add({
    targets: pool,
    alpha: alpha * 0.55,
    duration: 2400,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });
}

// =====================================================================
// ATRIUM — divine fashion foyer.
// Mirrored columns, central dais, ornate arch, hanging lamps.
// =====================================================================
export function buildVenusAtriumArt(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
) {
  // Back wall
  tileWallBand(scene, root, 22, VENUS_TILE.WALL_PANEL, 7);
  // Drape over wall
  for (let x = 0; x < GBC_W; x += TILE) {
    stamp(scene, root, x, 22, VENUS_TILE.WALL_DRAPE, 8);
  }
  // Arch trim across top
  stamp(scene, root, 64, 18, VENUS_TILE.ARCH_TRIM, 9);
  stamp(scene, root, 80, 18, VENUS_TILE.ARCH_TRIM, 9);

  // Floor: checker mid-band, reflective row in front
  tileFloorStrip(scene, root, 96, VENUS_TILE.FLOOR_CHECKER, 4);
  tileFloorStrip(scene, root, 112, VENUS_TILE.FLOOR_REFLECT, 4);
  tileFloorStrip(scene, root, 128, VENUS_TILE.FLOOR_CHECKER, 4);

  // Central dais medallion
  stamp(scene, root, GBC_W / 2 - 8, 80, VENUS_TILE.MEDALLION, 6);

  // Mirror columns flanking
  stamp(scene, root, 32, 38, VENUS_TILE.MIRROR_BAY, 10);
  stamp(scene, root, 32, 54, VENUS_TILE.MIRROR_BAY, 10);
  stamp(scene, root, GBC_W - 48, 38, VENUS_TILE.MIRROR_BAY, 10);
  stamp(scene, root, GBC_W - 48, 54, VENUS_TILE.MIRROR_BAY, 10);

  // Hanging lamps
  placeProp(scene, root, 28, 28, VENUS_SPRITE.prop.lamp, 11);
  placeProp(scene, root, GBC_W - 28, 28, VENUS_SPRITE.prop.lamp, 11);

  // Floral arrangements bordering the dais
  placeProp(scene, root, 60, 92, VENUS_SPRITE.prop.floral, 11);
  placeProp(scene, root, 100, 92, VENUS_SPRITE.prop.floral, 11);

  addReflectionPool(scene, root, 110);
}

// =====================================================================
// GALLERY — curated beauty with something wrong in it.
// Frame wall, draped masterpiece, bench, plaques, spotlight cones.
// =====================================================================
export function buildVenusGalleryArt(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
) {
  tileWallBand(scene, root, 22, VENUS_TILE.WALL_PANEL, 7);
  tileWallBand(scene, root, 38, VENUS_TILE.WALL_PANEL, 7);

  tileFloorStrip(scene, root, 96, VENUS_TILE.FLOOR_INLAY, 4);
  tileFloorStrip(scene, root, 112, VENUS_TILE.FLOOR_REFLECT, 4);
  tileFloorStrip(scene, root, 128, VENUS_TILE.FLOOR_INLAY, 4);

  // Frame wall
  const framePositions = [22, 50, 108, 136];
  for (const fx of framePositions) {
    placeProp(scene, root, fx, 50, VENUS_SPRITE.prop.frameOrnate, 10);
    // Spotlight cone: thin warm rectangle from frame to floor
    const cone = scene.add
      .rectangle(fx, 80, 12, 56, 0xf0d8a0, 0.1)
      .setOrigin(0.5, 0)
      .setDepth(6)
      .setBlendMode(Phaser.BlendModes.ADD);
    root.add(cone);
  }
  // Oversized draped masterpiece center
  placeProp(scene, root, 80, 50, VENUS_SPRITE.prop.frameDraped, 10);

  // Plaques under each frame
  for (const fx of framePositions) {
    placeProp(scene, root, fx, 64, VENUS_SPRITE.prop.plaque, 11);
  }

  // Bench foreground center
  stamp(scene, root, 56, 116, VENUS_TILE.BENCH, 11);
  stamp(scene, root, 88, 116, VENUS_TILE.BENCH, 11);

  addReflectionPool(scene, root, 110, 0.28);
}

// =====================================================================
// RECOGNITION HALL — a room that agrees with you too much.
// Repeated mirror bays, cold central bench, busts in niches.
// =====================================================================
export function buildVenusRecognitionHallArt(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
) {
  tileWallBand(scene, root, 22, VENUS_TILE.WALL_PANEL, 7);

  tileFloorStrip(scene, root, 96, VENUS_TILE.FLOOR_REFLECT, 4);
  tileFloorStrip(scene, root, 112, VENUS_TILE.FLOOR_REFLECT, 4);
  tileFloorStrip(scene, root, 128, VENUS_TILE.FLOOR_CHECKER, 4);

  // Mirror bay rhythm — 4 across, 2 stacked deep
  for (let i = 0; i < 4; i++) {
    const mx = 16 + i * 32;
    stamp(scene, root, mx, 38, VENUS_TILE.MIRROR_BAY, 9);
    stamp(scene, root, mx, 54, VENUS_TILE.MIRROR_BAY, 9);
  }

  // Busts in alternating niches
  placeProp(scene, root, 32, 80, VENUS_SPRITE.prop.bust, 10);
  placeProp(scene, root, 96, 80, VENUS_SPRITE.prop.bust, 10);

  // Cold central bench
  stamp(scene, root, 48, 118, VENUS_TILE.BENCH, 11);
  stamp(scene, root, 64, 118, VENUS_TILE.BENCH, 11);
  stamp(scene, root, 80, 118, VENUS_TILE.BENCH, 11);
  stamp(scene, root, 96, 118, VENUS_TILE.BENCH, 11);

  // Subtle shimmer across one mirror bay
  const shimmer = scene.add
    .rectangle(80, 46, 16, 32, 0xf6eef8, 0.18)
    .setDepth(10)
    .setBlendMode(Phaser.BlendModes.ADD);
  root.add(shimmer);
  scene.tweens.add({
    targets: shimmer,
    alpha: 0.05,
    duration: 1800,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });

  addReflectionPool(scene, root, 100, 0.4);
}

// =====================================================================
// RECONSTRUCTION STUDIO — tender restoration bordering on violation.
// Restoration table, pinned sketches, glass case, portrait fragments.
// =====================================================================
export function buildVenusReconstructionArt(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
) {
  tileWallBand(scene, root, 22, VENUS_TILE.WALL_PANEL, 7);

  tileFloorStrip(scene, root, 96, VENUS_TILE.FLOOR_INLAY, 4);
  tileFloorStrip(scene, root, 112, VENUS_TILE.FLOOR_INLAY, 4);
  tileFloorStrip(scene, root, 128, VENUS_TILE.FLOOR_INLAY, 4);

  // Pinned sketches on the wall
  for (let i = 0; i < 5; i++) {
    placeProp(scene, root, 24 + i * 28, 42, VENUS_SPRITE.prop.fragment, 10);
  }

  // Glass case left, restoration table right
  placeProp(scene, root, 28, 76, VENUS_SPRITE.prop.bust, 10);
  stamp(scene, root, 56, 84, VENUS_TILE.TABLE, 10);
  stamp(scene, root, 72, 84, VENUS_TILE.TABLE, 10);
  stamp(scene, root, 88, 84, VENUS_TILE.TABLE, 10);

  // Notes scattered across the table surface
  for (let i = 0; i < 4; i++) {
    placeProp(scene, root, 60 + i * 12, 88, VENUS_SPRITE.prop.plaque, 11);
  }

  // Portrait fragment on the table
  placeProp(scene, root, 100, 80, VENUS_SPRITE.prop.fragment, 11);

  // Lamp glow over the table
  placeProp(scene, root, 72, 60, VENUS_SPRITE.prop.lamp, 11);
  const tableGlow = scene.add
    .ellipse(72, 86, 60, 14, 0xf0d8a0, 0.18)
    .setDepth(9)
    .setBlendMode(Phaser.BlendModes.ADD);
  root.add(tableGlow);
}

// =====================================================================
// LADDER OF LOVERS — ridiculously sincere sacred apparatus.
// Decorated posts, rung ornaments, votive lights, vertical motif backdrop.
// =====================================================================
export function buildVenusLadderArt(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
) {
  tileWallBand(scene, root, 22, VENUS_TILE.WALL_PANEL, 7);
  tileFloorStrip(scene, root, 128, VENUS_TILE.FLOOR_INLAY, 4);

  // Twin posts
  for (let py = 38; py < 128; py += 16) {
    stamp(scene, root, GBC_W / 2 - 38, py, VENUS_TILE.LADDER_POST, 9);
    stamp(scene, root, GBC_W / 2 + 22, py, VENUS_TILE.LADDER_POST, 9);
  }

  // Rungs (decorative — gameplay rungs are drawn separately by venus.ts)
  for (let i = 0; i < 6; i++) {
    const ry = 44 + i * 14;
    stamp(scene, root, GBC_W / 2 - 32, ry, VENUS_TILE.LADDER_RUNG, 10);
    stamp(scene, root, GBC_W / 2 - 16, ry, VENUS_TILE.LADDER_RUNG, 10);
    stamp(scene, root, GBC_W / 2, ry, VENUS_TILE.LADDER_RUNG, 10);
    stamp(scene, root, GBC_W / 2 + 16, ry, VENUS_TILE.LADDER_RUNG, 10);
  }

  // Votive lamps flanking
  placeProp(scene, root, 24, 60, VENUS_SPRITE.prop.lamp, 11);
  placeProp(scene, root, 24, 90, VENUS_SPRITE.prop.lamp, 11);
  placeProp(scene, root, GBC_W - 24, 60, VENUS_SPRITE.prop.lamp, 11);
  placeProp(scene, root, GBC_W - 24, 90, VENUS_SPRITE.prop.lamp, 11);

  // Floral garlands at base
  placeProp(scene, root, 40, 122, VENUS_SPRITE.prop.floral, 11);
  placeProp(scene, root, GBC_W - 40, 122, VENUS_SPRITE.prop.floral, 11);
}

// =====================================================================
// THRESHOLD — beauty waiting to see whether you are still performing.
// Sovereign mirror-door, floor medallion, audience silhouettes, drapes.
// =====================================================================
export function buildVenusThresholdArt(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
) {
  tileWallBand(scene, root, 22, VENUS_TILE.WALL_PANEL, 7);
  // Side drapes
  for (let y = 22; y < 100; y += 16) {
    stamp(scene, root, 0, y, VENUS_TILE.WALL_DRAPE, 8);
    stamp(scene, root, GBC_W - TILE, y, VENUS_TILE.WALL_DRAPE, 8);
  }

  tileFloorStrip(scene, root, 112, VENUS_TILE.FLOOR_REFLECT, 4);
  tileFloorStrip(scene, root, 128, VENUS_TILE.FLOOR_INLAY, 4);

  // Sovereign mirror-door — large central mirror bay stack with arch
  stamp(scene, root, 64, 38, VENUS_TILE.MIRROR_BAY, 9);
  stamp(scene, root, 80, 38, VENUS_TILE.MIRROR_BAY, 9);
  stamp(scene, root, 64, 54, VENUS_TILE.MIRROR_BAY, 9);
  stamp(scene, root, 80, 54, VENUS_TILE.MIRROR_BAY, 9);
  stamp(scene, root, 64, 70, VENUS_TILE.MIRROR_BAY, 9);
  stamp(scene, root, 80, 70, VENUS_TILE.MIRROR_BAY, 9);
  stamp(scene, root, 64, 26, VENUS_TILE.ARCH_TRIM, 10);
  stamp(scene, root, 80, 26, VENUS_TILE.ARCH_TRIM, 10);

  // Floor medallion at the threshold
  stamp(scene, root, GBC_W / 2 - 8, 96, VENUS_TILE.MEDALLION, 6);

  // Audience silhouettes — busts in shadow flanking the approach
  placeProp(scene, root, 28, 100, VENUS_SPRITE.prop.bust, 10, 0.7);
  placeProp(scene, root, GBC_W - 28, 100, VENUS_SPRITE.prop.bust, 10, 0.7);

  // Quiet rose halo over the door
  const halo = scene.add
    .ellipse(GBC_W / 2, 56, 60, 60, 0xe89bb8, 0.14)
    .setDepth(8)
    .setBlendMode(Phaser.BlendModes.ADD);
  root.add(halo);
  scene.tweens.add({
    targets: halo,
    alpha: 0.06,
    duration: 2200,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });

  addReflectionPool(scene, root, 110, 0.32);
}

// =====================================================================
// TRIAL CHAMBER — sovereign mirror court.
// Concentric rings, floating frame fragments, black-glass dais.
// Phase-based overlay tone.
// =====================================================================
export function buildVenusTrialArt(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  phase = 0,
) {
  // Deep wall band + side drapes
  tileWallBand(scene, root, 22, VENUS_TILE.WALL_PANEL, 7);
  for (let y = 22; y < 110; y += 16) {
    stamp(scene, root, 0, y, VENUS_TILE.WALL_DRAPE, 8);
    stamp(scene, root, GBC_W - TILE, y, VENUS_TILE.WALL_DRAPE, 8);
  }

  // Black-glass dais — full-floor reflective with deep tone
  tileFloorStrip(scene, root, 96, VENUS_TILE.FLOOR_REFLECT, 4);
  tileFloorStrip(scene, root, 112, VENUS_TILE.FLOOR_REFLECT, 4);
  tileFloorStrip(scene, root, 128, VENUS_TILE.FLOOR_REFLECT, 4);

  // Concentric ring ornament around chamber center
  const cx = GBC_W / 2;
  const cy = GBC_H / 2 + 8;
  const ringA = scene.add.circle(cx, cy, 36, 0xe89bb8, 0).setStrokeStyle(1, 0xe89bb8, 0.55).setDepth(9);
  const ringB = scene.add.circle(cx, cy, 50, 0xe89bb8, 0).setStrokeStyle(1, 0xb07a48, 0.45).setDepth(9);
  const ringC = scene.add.circle(cx, cy, 64, 0xe89bb8, 0).setStrokeStyle(1, 0xf0c8d8, 0.3).setDepth(9);
  root.add([ringA, ringB, ringC]);
  scene.tweens.add({
    targets: [ringA, ringB, ringC],
    alpha: 0.4,
    duration: 2600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });

  // Floating frame fragments suspended around the chamber
  const orbits = [
    { x: cx - 56, y: cy - 36 },
    { x: cx + 56, y: cy - 36 },
    { x: cx - 56, y: cy + 36 },
    { x: cx + 56, y: cy + 36 },
  ];
  for (const o of orbits) {
    const f = placeProp(scene, root, o.x, o.y, VENUS_SPRITE.prop.frameOrnate, 10, 0.85);
    scene.tweens.add({
      targets: f,
      y: o.y - 3,
      duration: 1800 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  // Phase-based atmospheric overlay
  // 0 — calm beauty glow, 1 — cooling absence, 2 — harsher self-recognition
  const phaseTints = [
    { color: 0xf0c8d8, alpha: 0.16 },
    { color: 0x8a7aa0, alpha: 0.22 },
    { color: 0x5a2038, alpha: 0.28 },
  ];
  const tint = phaseTints[Math.max(0, Math.min(2, phase))];
  const overlay = scene.add
    .rectangle(0, 22, GBC_W, GBC_H - 22, tint.color, tint.alpha)
    .setOrigin(0, 0)
    .setDepth(13)
    .setBlendMode(Phaser.BlendModes.ADD);
  root.add(overlay);
}

// =====================================================================
// LIGHTING + FOREGROUND OVERLAYS
// =====================================================================

/**
 * Rest-state lighting overlay applied AFTER the room fills with art.
 * `softeningLevel` (0|1|2) is forwarded from VenusExpandedContent so
 * rooms whose quests have settled feel slightly warmer.
 */
export function addVenusLightingOverlay(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  zone: string,
  softeningLevel: 0 | 1 | 2,
) {
  if (softeningLevel === 0) return;
  const a = softeningLevel === 2 ? 0.16 : 0.09;
  const tone = scene.add
    .rectangle(0, 22, GBC_W, GBC_H - 22, 0xffe2d8, a)
    .setOrigin(0, 0)
    .setDepth(14)
    .setBlendMode(Phaser.BlendModes.ADD);
  root.add(tone);
}

/**
 * Decorative foreground frame — a pair of dim curtain edges at the
 * left/right that subtly proscenium the viewport without occluding
 * gameplay. Skipped for rooms where it would crowd hotspots (ladder).
 */
export function addVenusForegroundFrame(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  zone: string,
) {
  if (zone === "ladder") return;
  const left = scene.add
    .rectangle(0, 22, 4, GBC_H - 22, 0x281018, 0.6)
    .setOrigin(0, 0)
    .setDepth(14);
  const right = scene.add
    .rectangle(GBC_W - 4, 22, 4, GBC_H - 22, 0x281018, 0.6)
    .setOrigin(0, 0)
    .setDepth(14);
  root.add([left, right]);
}
