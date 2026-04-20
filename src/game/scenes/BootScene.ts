import * as Phaser from "phaser";
import { ASSETS, PAL, pixelText, VIEW_W, VIEW_H } from "../shared";

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
  }
  create() {
    this.scene.start("Title");
  }
}
