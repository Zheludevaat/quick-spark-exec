import * as Phaser from "phaser";
import { bakeAll, GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../gbcArt";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  preload() {
    this.cameras.main.setBackgroundColor(COLOR.void);
  }
  create() {
    bakeAll(this);

    // Loading box
    const box = drawGBCBox(this, 24, 56, GBC_W - 48, 32);
    void box;
    new GBCText(this, 32, 64, "AWAKENING...", { color: COLOR.textAccent });
    new GBCText(this, 32, 76, "PRESS START", { color: COLOR.textDim });

    // Rowan walk anims
    const dirs = ["down", "left", "right", "up"];
    dirs.forEach((d, row) => {
      const start = row * 4;
      this.anims.create({
        key: `rowan_${d}`,
        frames: this.anims.generateFrameNumbers("rowan", { start, end: start + 3 }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `rowan_${d}_idle`,
        frames: [{ key: "rowan", frame: start }],
        frameRate: 1,
      });
    });

    // Soryn flicker (legacy v1 sprite, kept for fallback)
    this.anims.create({
      key: "soryn_flicker",
      frames: this.anims.generateFrameNumbers("soryn", { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1,
    });

    // Soryn v2 — mystical daimon (4-frame ring rotation)
    this.anims.create({
      key: "daimon_idle",
      frames: this.anims.generateFrameNumbers("soryn_v2", { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });

    // Enemy idle anims
    (["reflection", "echo", "glitter"] as const).forEach((kind, i) => {
      this.anims.create({
        key: `enemy_${kind}`,
        frames: this.anims.generateFrameNumbers("enemies", { start: i * 2, end: i * 2 + 1 }),
        frameRate: 3,
        repeat: -1,
      });
    });

    // Boss state anims
    (["composed", "flattering", "fractured", "exposed", "released"] as const).forEach((s, i) => {
      this.anims.create({
        key: `boss_${s}`,
        frames: this.anims.generateFrameNumbers("boss", { start: i * 2, end: i * 2 + 1 }),
        frameRate: 2,
        repeat: -1,
      });
    });

    // Element pulses
    (["air", "fire", "water", "earth"] as const).forEach((e, i) => {
      this.anims.create({
        key: `elem_${e}`,
        frames: this.anims.generateFrameNumbers("elements", { start: i * 2, end: i * 2 + 1 }),
        frameRate: 2,
        repeat: -1,
      });
    });

    this.time.delayedCall(400, () => this.scene.start("Title"));
  }
}
