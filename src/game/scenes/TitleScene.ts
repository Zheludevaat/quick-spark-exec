import * as Phaser from "phaser";
import { PAL, pixelText, VIEW_W, VIEW_H, drawDialogBox } from "../shared";
import { loadSave, newSave, clearSave } from "../save";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }
  create() {
    this.cameras.main.setBackgroundColor(PAL.void);

    // Painted moon backdrop using Silver Threshold base + moon gate
    const base = this.add.image(VIEW_W / 2, VIEW_H / 2, "silver_threshold_base")
      .setDisplaySize(VIEW_W, VIEW_H)
      .setAlpha(0.35);
    void base;
    this.add.image(VIEW_W / 2, VIEW_H / 2 + 12, "moon_gate_threshold")
      .setDisplaySize(180, 180)
      .setAlpha(0.55);

    // Falling silver dust
    for (let i = 0; i < 40; i++) {
      const d = this.add.rectangle(
        Phaser.Math.Between(0, VIEW_W),
        Phaser.Math.Between(0, VIEW_H),
        1, 1,
        PAL.silverLight,
        Phaser.Math.FloatBetween(0.3, 1),
      );
      this.tweens.add({
        targets: d,
        y: d.y + Phaser.Math.Between(40, 100),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 5000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      });
    }

    pixelText(this, VIEW_W / 2 - 64, 40, "HERMETIC COMEDY", 14, "#eef3ff");
    pixelText(this, VIEW_W / 2 - 38, 60, "act 0 · the silver threshold", 7, "#8ec8e8");

    const save = loadSave();
    drawDialogBox(this, 60, 150, 200, 70);

    const continueBtn = pixelText(this, 80, 162, save ? "▶  CONTINUE" : "▶  CONTINUE  (no save)", 9,
      save ? "#eef3ff" : "#6a7a9c").setInteractive({ useHandCursor: !!save });
    const newBtn = pixelText(this, 80, 180, "✦  NEW JOURNEY", 9, "#eef3ff").setInteractive({ useHandCursor: true });
    const wipeBtn = pixelText(this, 80, 198, "✕  ERASE SAVE", 8, "#d86a6a").setInteractive({ useHandCursor: true });

    if (save) {
      continueBtn.on("pointerdown", () => this.scene.start(save.scene, { save }));
    }
    newBtn.on("pointerdown", () => {
      clearSave();
      this.scene.start("Intro", { save: newSave() });
    });
    wipeBtn.on("pointerdown", () => {
      clearSave();
      this.scene.restart();
    });

    // Keyboard: Enter to start
    this.input.keyboard?.on("keydown-ENTER", () => {
      this.scene.start("Intro", { save: save ?? newSave() });
    });
  }
}
