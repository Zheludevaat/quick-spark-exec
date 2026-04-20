import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../gbcArt";
import { loadSave, newSave, clearSave } from "../save";

export class TitleScene extends Phaser.Scene {
  constructor() { super("Title"); }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.void);

    // Tile-painted starfield using the silver_void tile look (cheap: random dots)
    const g = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      const c = Phaser.Math.RND.pick(["#2a3550", "#7889a8", "#dde6f5"]);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(c).color, 1);
      g.fillRect(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(0, GBC_H), 1, 1);
    }

    // Moon disc (concentric circles)
    const cx = GBC_W / 2, cy = 50;
    g.fillStyle(0x243058, 1); g.fillCircle(cx, cy, 26);
    g.fillStyle(0x3a5078, 1); g.fillCircle(cx, cy, 22);
    g.fillStyle(0x7898c0, 1); g.fillCircle(cx, cy, 18);
    g.fillStyle(0xa8c8e8, 1); g.fillCircle(cx, cy, 14);
    g.fillStyle(0xdde6f5, 0.4); g.fillCircle(cx - 4, cy - 4, 6);

    // Title
    new GBCText(this, GBC_W / 2 - 38, 86, "HERMETIC", { color: COLOR.textLight, shadow: "#1a2030" });
    new GBCText(this, GBC_W / 2 - 24, 96, "COMEDY", { color: COLOR.textLight, shadow: "#1a2030" });
    new GBCText(this, GBC_W / 2 - 44, 108, "ACT ZERO", { color: COLOR.textAccent });

    const save = loadSave();
    drawGBCBox(this, 18, 118, GBC_W - 36, 22);
    const startLabel = save ? "PRESS A: CONTINUE" : "PRESS A: NEW GAME";
    const start = new GBCText(this, 26, 124, startLabel, { color: COLOR.textLight });
    new GBCText(this, 26, 132, save ? "B: ERASE SAVE" : "", { color: COLOR.textDim });

    // Blink the prompt
    this.tweens.add({ targets: start.obj, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    const launch = () => {
      const next = save ? save.scene : "Intro";
      const slot = save ?? newSave();
      this.scene.start(next === "Title" ? "Intro" : next, { save: slot });
    };
    const erase = () => { clearSave(); this.scene.restart(); };

    this.input.keyboard?.on("keydown-ENTER", launch);
    this.input.keyboard?.on("keydown-SPACE", launch);
    this.input.on("pointerdown", launch);
    this.input.keyboard?.on("keydown-BACKSPACE", erase);
  }
}
