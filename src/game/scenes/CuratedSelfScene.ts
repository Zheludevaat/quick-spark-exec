import Phaser from "phaser";
import { PAL, pixelText, VIEW_W, VIEW_H, drawDialogBox } from "../shared";
import { writeSave, clearSave } from "../save";
import type { Command, SaveSlot } from "../types";
import { attachHUD } from "./hud";

type State = "composed" | "flattering" | "fractured" | "exposed" | "released";

const STATE_LINES: Record<State, { taunt: string; weakness: Command; next: State; success: string }> = {
  composed:    { taunt: "I am the version of you that smiles in photographs. Aren't I better?",
                 weakness: "observe",  next: "flattering",
                 success: "You see the careful posture. The smile loosens." },
  flattering:  { taunt: "Tell me what you actually wanted them to see. Tell me the real line.",
                 weakness: "address",  next: "fractured",
                 success: "You speak the unrehearsed sentence. The polish cracks." },
  fractured:   { taunt: "But remember the day you first started this — the one you were trying to be?",
                 weakness: "remember", next: "exposed",
                 success: "You remember. Not as a wound. As a small, stubborn child." },
  exposed:     { taunt: "And now? Will you keep me, or let me go?",
                 weakness: "release",  next: "released",
                 success: "You release. The figure exhales for the first time." },
  released:    { taunt: "", weakness: "release", next: "released", success: "" },
};

export class CuratedSelfScene extends Phaser.Scene {
  private save!: SaveSlot;
  private state: State = "composed";
  private cmdText: Phaser.GameObjects.Text[] = [];
  private cursor = 0;
  private busy = false;
  private bossSprite!: Phaser.GameObjects.Container;
  private logText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;

  constructor() { super("CuratedSelf"); }
  init(data: { save: SaveSlot }) { this.save = data.save; }

  create() {
    this.cameras.main.setBackgroundColor(0x05070d);
    this.cameras.main.fadeIn(500);

    this.add.image(VIEW_W / 2, VIEW_H / 2, "moon_overlays_sigils")
      .setDisplaySize(VIEW_W, VIEW_H).setAlpha(0.25);

    pixelText(this, VIEW_W / 2 - 50, 12, "THE CURATED SELF", 9, "#d86a6a");
    this.stateText = pixelText(this, VIEW_W / 2 - 30, 24, "composed", 8, "#8ec8e8");

    this.bossSprite = this.add.container(VIEW_W / 2, 80);
    this.redrawBoss();

    drawDialogBox(this, 8, 130, VIEW_W - 16, 100);
    pixelText(this, 18, 138, "Choose a verb.", 8, "#8ec8e8");
    const cmds: { label: string; cmd: Command }[] = [
      { label: "▣ OBSERVE",  cmd: "observe" },
      { label: "▶ ADDRESS",  cmd: "address" },
      { label: "◈ REMEMBER", cmd: "remember" },
      { label: "○ RELEASE",  cmd: "release" },
    ];
    cmds.forEach((c, i) => {
      const x = 22 + (i % 2) * 130;
      const y = 156 + Math.floor(i / 2) * 16;
      const t = pixelText(this, x, y, c.label, 9).setInteractive({ useHandCursor: true });
      t.setData("cmd", c.cmd);
      t.on("pointerdown", () => this.choose(i));
      this.cmdText.push(t);
    });
    this.refreshCursor();

    this.logText = pixelText(this, 18, 200, STATE_LINES.composed.taunt, 8, "#c8d4e8")
      .setWordWrapWidth(VIEW_W - 36);

    attachHUD(this, () => this.save.stats);

    this.input.keyboard?.on("keydown-LEFT",  () => this.move(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.move(1));
    this.input.keyboard?.on("keydown-UP",    () => this.move(-2));
    this.input.keyboard?.on("keydown-DOWN",  () => this.move(2));
    this.input.keyboard?.on("keydown-ENTER", () => this.choose(this.cursor));
    this.input.keyboard?.on("keydown-SPACE", () => this.choose(this.cursor));
    this.events.on("vinput-down", (dir: string) => {
      if (dir === "left") this.move(-1);
      if (dir === "right") this.move(1);
      if (dir === "up") this.move(-2);
      if (dir === "down") this.move(2);
    });
    this.events.on("vinput-action", () => this.choose(this.cursor));
  }

  private redrawBoss() {
    this.bossSprite.removeAll(true);
    const colors: Record<State, number> = {
      composed: PAL.pearl, flattering: PAL.moonCyan, fractured: PAL.silverLight,
      exposed: PAL.warn, released: PAL.moonBlue,
    };
    const ring = this.add.circle(0, 0, 32, colors[this.state], 0.18).setStrokeStyle(1, colors[this.state], 0.9);
    const body = this.add.rectangle(0, 8, 22, 28, colors[this.state], 0.85).setStrokeStyle(1, PAL.silverDark);
    const head = this.add.rectangle(0, -10, 16, 14, PAL.pearl).setStrokeStyle(1, PAL.silverDark);
    this.bossSprite.add([ring, body, head]);
    if (this.state === "fractured") {
      const crack = this.add.rectangle(2, 4, 1, 24, PAL.warn);
      this.bossSprite.add(crack);
    }
    this.tweens.add({ targets: ring, scale: 1.2, alpha: 0.4, duration: 1200, yoyo: true, repeat: -1 });
  }

  private move(d: number) {
    if (this.busy) return;
    this.cursor = (this.cursor + d + 4) % 4;
    this.refreshCursor();
  }
  private refreshCursor() {
    this.cmdText.forEach((t, i) => t.setColor(i === this.cursor ? "#f0e08c" : "#eef3ff"));
  }

  private choose(i: number) {
    if (this.busy) return;
    if (this.state === "released") return this.endGame();
    const cmd = this.cmdText[i].getData("cmd") as Command;
    const stage = STATE_LINES[this.state];
    this.busy = true;
    if (cmd === stage.weakness) {
      this.logText.setText(stage.success);
      this.cameras.main.flash(180, 200, 220, 255);
      this.time.delayedCall(900, () => {
        this.state = stage.next;
        this.stateText.setText(this.state);
        this.redrawBoss();
        if (this.state === "released") {
          this.logText.setText("Silence. Then warmth. The verb-loop is yours now.");
          this.time.delayedCall(1200, () => this.endGame());
        } else {
          this.logText.setText(STATE_LINES[this.state].taunt);
          this.busy = false;
        }
      });
    } else {
      this.logText.setText("It tilts its head. Try a different verb.");
      this.cameras.main.shake(150, 0.003);
      this.busy = false;
    }
  }

  private endGame() {
    this.busy = true;
    this.save.scene = "Epilogue";
    this.save.flags.act0_complete = true;
    writeSave(this.save);
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Epilogue", { save: this.save }));
  }
}

export class EpilogueScene extends Phaser.Scene {
  private save!: SaveSlot;
  constructor() { super("Epilogue"); }
  init(data: { save: SaveSlot }) { this.save = data.save; }
  create() {
    this.cameras.main.setBackgroundColor(0x05070d);
    this.add.image(VIEW_W / 2, VIEW_H / 2, "silver_threshold_effects")
      .setDisplaySize(VIEW_W, VIEW_H).setAlpha(0.4);

    pixelText(this, VIEW_W / 2 - 60, 30, "ACT 0 — COMPLETE", 11, "#8ec8e8");
    pixelText(this, 20, 60, "You have learned four small verbs:", 9);
    pixelText(this, 20, 78, "Observe.  Address.  Remember.  Release.", 9, "#f0e08c");

    const s = this.save.stats;
    pixelText(this, 20, 110, `Clarity ${s.clarity}    Compassion ${s.compassion}    Courage ${s.courage}`, 9);
    pixelText(this, 20, 130, "Six regions remain. The Sun. The Mercury Library.", 8, "#c8d4e8");
    pixelText(this, 20, 142, "The Venus Garden. Mars. Jupiter. Saturn.", 8, "#c8d4e8");
    pixelText(this, 20, 162, "Soryn waits at the next threshold.", 8, "#8ec8e8");

    drawDialogBox(this, 40, 190, VIEW_W - 80, 36);
    const again = pixelText(this, 60, 200, "✦  WALK AGAIN", 9).setInteractive({ useHandCursor: true });
    const wipe = pixelText(this, 60, 212, "✕  ERASE & RESTART", 8, "#d86a6a").setInteractive({ useHandCursor: true });
    again.on("pointerdown", () => this.scene.start("Title"));
    wipe.on("pointerdown", () => { clearSave(); this.scene.start("Title"); });
    this.input.keyboard?.on("keydown-ENTER", () => this.scene.start("Title"));
  }
}
