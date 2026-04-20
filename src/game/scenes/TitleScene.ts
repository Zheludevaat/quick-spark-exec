import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, spawnMotes } from "../gbcArt";
import { loadSave, newSave, clearSave } from "../save";
import { getAudio, SONG_TITLE } from "../audio";

export class TitleScene extends Phaser.Scene {
  constructor() { super("Title"); }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.void);

    // Tile-painted starfield
    const g = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      const c = Phaser.Math.RND.pick(["#2a3550", "#7889a8", "#dde6f5"]);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(c).color, 1);
      g.fillRect(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(0, GBC_H), 1, 1);
    }
    // Twinkling foreground stars
    for (let i = 0; i < 12; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(0, 80), 1, 1, 0xffffff, 1);
      this.tweens.add({ targets: s, alpha: 0.15, duration: Phaser.Math.Between(500, 1500), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
    }

    // Moon disc with halo + craters
    const cx = GBC_W / 2, cy = 50;
    const halo = this.add.circle(cx, cy, 30, 0xa8c8e8, 0.18);
    this.tweens.add({ targets: halo, scale: 1.18, alpha: 0.08, duration: 2200, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    g.fillStyle(0x243058, 1); g.fillCircle(cx, cy, 26);
    g.fillStyle(0x3a5078, 1); g.fillCircle(cx, cy, 22);
    g.fillStyle(0x7898c0, 1); g.fillCircle(cx, cy, 18);
    g.fillStyle(0xa8c8e8, 1); g.fillCircle(cx, cy, 14);
    g.fillStyle(0xdde6f5, 0.4); g.fillCircle(cx - 4, cy - 4, 6);
    g.fillStyle(0x7898c0, 0.6); g.fillCircle(cx + 5, cy + 3, 2);
    g.fillStyle(0x7898c0, 0.6); g.fillCircle(cx - 6, cy + 6, 1);

    // Drifting silver motes upward
    spawnMotes(this, { count: 18, color: 0xdde6f5, alpha: 0.5, driftY: -0.01, driftX: 0.003, depth: 30 });

    // Title
    new GBCText(this, GBC_W / 2 - 38, 86, "HERMETIC", { color: COLOR.textLight, shadow: "#1a2030" });
    new GBCText(this, GBC_W / 2 - 24, 96, "COMEDY", { color: COLOR.textLight, shadow: "#1a2030" });
    new GBCText(this, GBC_W / 2 - 44, 108, "ACT ZERO", { color: COLOR.textAccent });

    const save = loadSave();
    drawGBCBox(this, 18, 118, GBC_W - 36, 22);
    const startLabel = save ? "PRESS A: CONTINUE" : "PRESS A: NEW GAME";
    const start = new GBCText(this, 26, 124, startLabel, { color: COLOR.textLight, depth: 110 });
    new GBCText(this, 26, 132, save ? "B: ERASE SAVE" : "", { color: COLOR.textDim, depth: 110 });

    // Blink the prompt
    this.tweens.add({ targets: start.obj, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // Boot audio on first user gesture (browsers require it)
    const audio = getAudio();
    const startMusic = () => { audio.resume(); audio.music.play("title", SONG_TITLE); };
    this.input.keyboard?.once("keydown", startMusic);
    this.input.once("pointerdown", startMusic);
    this.events.once("vinput-action", startMusic);

    const launch = () => {
      audio.sfx("confirm");
      const slot = save ?? newSave();
      const next = save ? save.scene : "Intro";
      audio.music.stop();
      this.scene.start(next, { save: slot });
    };
    const erase = () => { audio.sfx("cancel"); clearSave(); this.scene.restart(); };

    this.input.keyboard?.on("keydown-ENTER", launch);
    this.input.keyboard?.on("keydown-SPACE", launch);
    this.input.on("pointerdown", launch);
    this.input.keyboard?.on("keydown-BACKSPACE", erase);
  }
}
