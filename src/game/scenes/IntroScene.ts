import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../gbcArt";
import type { SaveSlot } from "../types";

const LINES = [
  "TUESDAY. 8:14 AM.",
  "BRAKE LIGHTS.",
  "A TRUCK. A TURN",
  "NEVER FINISHED.",
  "THEN... SILENCE.",
  "WEIGHTLESS SILVER.",
  "YOU ARE ROWAN.",
  "YOU ARE DEAD.",
  "AND THE WORK IS",
  "ONLY BEGINNING.",
];

export class IntroScene extends Phaser.Scene {
  private save!: SaveSlot;
  constructor() { super("Intro"); }
  init(data: { save: SaveSlot }) { this.save = data.save; }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // Drifting silver flecks
    const g = this.add.graphics();
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, GBC_W);
      const y = Phaser.Math.Between(0, GBC_H - 50);
      const dot = this.add.rectangle(x, y, 1, 1, 0xdde6f5, Phaser.Math.FloatBetween(0.3, 1));
      this.tweens.add({ targets: dot, y: dot.y + 50, alpha: 0,
        duration: Phaser.Math.Between(2500, 5000), repeat: -1,
        delay: Phaser.Math.Between(0, 3000) });
    }
    void g;

    drawGBCBox(this, 8, GBC_H - 50, GBC_W - 16, 42);
    const text = new GBCText(this, 14, GBC_H - 44, "", { color: COLOR.textLight, maxWidthPx: GBC_W - 28 });
    const hint = new GBCText(this, GBC_W - 22, GBC_H - 14, "▼A", { color: COLOR.textAccent });
    this.tweens.add({ targets: hint.obj, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    let i = 0;
    const advance = () => {
      if (i >= LINES.length) {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("SilverThreshold", { save: this.save }));
        return;
      }
      // Show two lines at a time for readability
      const a = LINES[i++] ?? "";
      const b = LINES[i++] ?? "";
      text.setText(`${a}\n${b}`.trim());
    };
    advance();

    this.input.on("pointerdown", advance);
    this.input.keyboard?.on("keydown-ENTER", advance);
    this.input.keyboard?.on("keydown-SPACE", advance);
  }
}
