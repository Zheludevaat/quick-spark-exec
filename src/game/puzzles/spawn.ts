/**
 * Hermetic Puzzle Framework — render helpers.
 *
 * Tiny pixel-art primitives that keep the GBC palette and read at 160x144.
 * Each helper returns the GameObjects so the chamber scene can re-tint or
 * tween them as state changes.
 */
import * as Phaser from "phaser";
import { COLOR, GBCText } from "../gbcArt";

export function spawnHermeticGate(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  open: boolean,
) {
  const base = scene.add.rectangle(x, y, 16, 20, open ? 0x243248 : 0x1a1410, 1);
  base.setStrokeStyle(1, open ? 0xc8d8f0 : 0x4a3828, 0.7);
  const seal = scene.add.circle(x, y - 2, 3, open ? 0xc8d8f0 : 0xc8a060, open ? 0.15 : 0.55);
  const text = new GBCText(scene, x - 14, y + 14, label.toUpperCase(), {
    color: open ? COLOR.textDim : COLOR.textGold,
    depth: 30,
  });
  return { base, seal, text };
}

export function spawnWitnessCircle(scene: Phaser.Scene, x: number, y: number, active = false) {
  const ring = scene.add
    .circle(x, y, 8, 0xdde6f5, active ? 0.18 : 0.06)
    .setStrokeStyle(1, 0xa8c8e8, active ? 0.85 : 0.4);
  return { ring };
}

export function spawnNameGlyph(scene: Phaser.Scene, x: number, y: number, lit: boolean) {
  const glyph = scene.add.rectangle(x, y, 10, 10, lit ? 0xc8a060 : 0x2a221a, lit ? 0.85 : 0.4);
  glyph.setStrokeStyle(1, lit ? 0xf0d088 : 0x5a4828, lit ? 0.9 : 0.5);
  return { glyph };
}

export function spawnResonator(scene: Phaser.Scene, x: number, y: number, active: boolean) {
  const orb = scene.add.circle(x, y, 5, active ? 0xf0c8d8 : 0x584858, active ? 0.85 : 0.35);
  const halo = scene.add.circle(x, y, 8, active ? 0xf0c8d8 : 0x584858, active ? 0.2 : 0.08);
  return { orb, halo };
}

export function spawnMirror(scene: Phaser.Scene, x: number, y: number, aligned: boolean) {
  const body = scene.add.rectangle(x, y, 12, 4, aligned ? 0xe0e8f0 : 0x4a5060, 1);
  body.setStrokeStyle(1, aligned ? 0xffffff : 0x707888, 0.9);
  const halo = scene.add.circle(x, y, 7, 0xc8d8f0, aligned ? 0.25 : 0.08);
  return { body, halo };
}

export function spawnBeamColumn(scene: Phaser.Scene, x: number, y: number, lit: boolean) {
  const beam = scene.add.rectangle(x, y, 4, 28, lit ? 0xf0e8c8 : 0x4a4838, lit ? 0.85 : 0.3);
  const cap = scene.add.circle(x, y - 14, 3, lit ? 0xfff0a8 : 0x584828, lit ? 0.9 : 0.35);
  return { beam, cap };
}

export function spawnReleaseAltar(scene: Phaser.Scene, x: number, y: number, released: boolean) {
  const stone = scene.add.rectangle(x, y, 14, 8, released ? 0x2a2a30 : 0x4a4858, 1);
  stone.setStrokeStyle(1, 0x707080, 0.8);
  const offering = released ? null : scene.add.circle(x, y - 6, 3, 0xc8a060, 0.85);
  return { stone, offering };
}
