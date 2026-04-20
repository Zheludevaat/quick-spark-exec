import * as Phaser from "phaser";
import { ASSETS, SHEETS, PAL, pixelText, VIEW_W, VIEW_H } from "../shared";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  preload() {
    // minimal loader bg
    this.cameras.main.setBackgroundColor(PAL.void);
    const g = this.add.graphics();
    g.fillStyle(PAL.silverDark, 1);
    g.fillRect(40, VIEW_H / 2 - 4, VIEW_W - 80, 8);
    const bar = this.add.graphics();
    pixelText(this, VIEW_W / 2 - 32, VIEW_H / 2 - 24, "AWAKENING…");

    this.load.on("progress", (p: number) => {
      bar.clear();
      bar.fillStyle(PAL.moonCyan, 1);
      bar.fillRect(42, VIEW_H / 2 - 2, (VIEW_W - 84) * p, 4);
    });

    Object.entries(ASSETS).forEach(([k, v]) => this.load.image(k, v));
    Object.values(SHEETS).forEach((s) =>
      this.load.spritesheet(s.key, s.url, { frameWidth: s.frameWidth, frameHeight: s.frameHeight }),
    );
  }
  create() {
    // Rowan walk animations: rows 0=down, 1=left, 2=right, 3=up; 4 frames each
    const dirs = ["down", "left", "right", "up"];
    dirs.forEach((d, row) => {
      const start = row * 4;
      this.anims.create({
        key: `rowan_${d}`,
        frames: this.anims.generateFrameNumbers("rowan_walk", { start, end: start + 3 }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `rowan_${d}_idle`,
        frames: [{ key: "rowan_walk", frame: start }],
        frameRate: 1,
      });
    });

    // Curated Self states: 3 frames per row across 3 rows = 9 frames
    // Map our 5 narrative states onto the 3 visual states we received: composed/flattering -> row 0, fractured -> row 1, exposed/released -> row 2
    const stateRows: Record<string, number> = {
      composed: 0, flattering: 0, fractured: 1, exposed: 2, released: 2,
    };
    Object.entries(stateRows).forEach(([state, row]) => {
      this.anims.create({
        key: `boss_${state}`,
        frames: this.anims.generateFrameNumbers("curated_self", { start: row * 3, end: row * 3 + 2 }),
        frameRate: 3,
        repeat: -1,
      });
    });

    this.scene.start("Title");
  }
}
