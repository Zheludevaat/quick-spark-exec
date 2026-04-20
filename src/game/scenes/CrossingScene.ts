import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan, runDialog } from "./hud";
import { getAudio, SONG_CROSSING } from "../audio";

/**
 * The Crossing — a near-silent corridor that dims as Rowan walks south.
 * Soryn's voice arrives without a portrait. Ends at a fade-to-silver into
 * the SilverThreshold scene.
 */
export class CrossingScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private input2!: InputState;
  private dim = 0;
  private overlay!: Phaser.GameObjects.Rectangle;
  private dialogActive = false;
  private done = false;
  private milestones = [false, false, false];

  constructor() { super("Crossing"); }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.dim = 0;
    this.dialogActive = false;
    this.done = false;
    this.milestones = [false, false, false];
  }

  create() {
    this.cameras.main.setBackgroundColor("#080a12");
    this.cameras.main.fadeIn(700);
    getAudio().music.play("crossing", SONG_CROSSING);

    const g = this.add.graphics();
    // Hallway walls — vanishing-point illusion from receding rectangles
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const inset = Phaser.Math.Linear(0, 60, t);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x2a3550),
        Phaser.Display.Color.ValueToColor(0x080a12),
        8, i,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(inset, 14 + inset * 0.6, GBC_W - inset * 2, GBC_H - 28 - inset * 1.2);
    }

    // Faint floor lines receding south
    for (let y = 30; y < GBC_H; y += 10) {
      const a = (1 - (y / GBC_H)) * 0.4 + 0.1;
      g.fillStyle(0x3a4868, a); g.fillRect(20, y, GBC_W - 40, 1);
    }

    // Drifting silver flecks (sparse)
    spawnMotes(this, { count: 10, color: 0xdde6f5, alpha: 0.4, driftY: -0.006, driftX: 0.002, depth: 25 });

    // Player at top
    this.rowan = makeRowan(this, GBC_W / 2, 24);

    // Dimming overlay (gets darker as Rowan walks south)
    this.overlay = this.add.rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0).setOrigin(0, 0).setDepth(190);

    // HUD off-vibe (still attaches stats bar; that's fine — it stays minimal)
    attachHUD(this, () => this.save.stats);
    this.input2 = new InputState(this);

    // Hint
    this.add.rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85).setOrigin(0, 0).setScrollFactor(0).setDepth(199);
    new GBCText(this, 4, GBC_H - 9, "WALK SOUTH", { color: COLOR.textDim, depth: 200, scrollFactor: 0 });
  }

  update(_t: number, dt: number) {
    if (this.dialogActive || this.done) return;
    const speed = 0.035 * dt;
    const i = this.input2.poll();
    let dx = 0, dy = 0;
    if (i.left) dx -= speed * 0.5;
    if (i.right) dx += speed * 0.5;
    if (i.up) dy -= speed * 0.4;
    if (i.down) dy += speed;
    this.rowan.x += dx;
    this.rowan.y += dy;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 32, GBC_W - 32);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, 24, GBC_H - 12);
    animateRowan(this.rowan, dx, dy);

    // Dim with progress
    const progress = (this.rowan.y - 24) / (GBC_H - 36);
    this.dim = Phaser.Math.Linear(this.dim, progress * 0.6, 0.05);
    this.overlay.fillAlpha = this.dim;

    // Milestone voices
    if (!this.milestones[0] && progress > 0.25) this.speak(0, [
      { who: "?", text: "Do not be afraid. This is not punishment." },
    ]);
    else if (!this.milestones[1] && progress > 0.55) this.speak(1, [
      { who: "?", text: "It is only a doorway you have always walked toward." },
    ]);
    else if (!this.milestones[2] && progress > 0.85) this.speak(2, [
      { who: "?", text: "I will meet you on the other side. Keep walking." },
    ]);

    if (progress >= 0.99 && !this.done) {
      this.done = true;
      this.save.scene = "SilverThreshold";
      writeSave(this.save);
      const a = getAudio(); a.music.stop(); a.sfx("open");
      this.cameras.main.fadeOut(900, 220, 230, 245);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("SilverThreshold", { save: this.save }));
    }
  }

  private speak(idx: number, lines: { who: string; text: string }[]) {
    this.milestones[idx] = true;
    this.dialogActive = true;
    runDialog(this, lines, () => { this.dialogActive = false; });
  }
}
