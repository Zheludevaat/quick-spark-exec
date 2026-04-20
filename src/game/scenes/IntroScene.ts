import Phaser from "phaser";
import { PAL, pixelText, VIEW_W, VIEW_H, drawDialogBox } from "../shared";
import type { SaveSlot } from "../types";

const LINES = [
  "Tuesday. 8:14 AM. Brake lights.",
  "A truck. A turn never finished.",
  "Then — silence. Weightless silver.",
  "You are Rowan. You are dead.",
  "And the work is only beginning.",
];

export class IntroScene extends Phaser.Scene {
  private save!: SaveSlot;
  constructor() {
    super("Intro");
  }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
  }
  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.add.image(VIEW_W / 2, VIEW_H / 2, "silver_threshold_effects")
      .setDisplaySize(VIEW_W, VIEW_H)
      .setAlpha(0.4);

    drawDialogBox(this, 16, 170, VIEW_W - 32, 56);
    const t = pixelText(this, 28, 184, "", 9);
    t.setWordWrapWidth(VIEW_W - 56);
    let i = 0;
    const advance = () => {
      if (i >= LINES.length) {
        this.scene.start("SilverThreshold", { save: this.save });
        return;
      }
      t.setText(LINES[i++]);
    };
    advance();

    const hint = pixelText(this, VIEW_W - 60, 212, "▼ tap / ↵", 7, "#8ec8e8");
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    this.input.on("pointerdown", advance);
    this.input.keyboard?.on("keydown-ENTER", advance);
    this.input.keyboard?.on("keydown-SPACE", advance);
  }
}
