import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../gbcArt";
import { writeSave, clearSave } from "../save";
import type { Command, SaveSlot } from "../types";
import { attachHUD } from "./hud";

type State = "composed" | "flattering" | "fractured" | "exposed" | "released";

const STATE_LINES: Record<State, { taunt: string; weakness: Command; next: State; success: string }> = {
  composed:   { taunt: "I am the version of you that smiles for cameras.",
                weakness: "observe",  next: "flattering",
                success: "You see the careful posture. The smile loosens." },
  flattering: { taunt: "Tell me what you actually wanted them to see.",
                weakness: "address",  next: "fractured",
                success: "You speak the unrehearsed line. The polish cracks." },
  fractured:  { taunt: "Remember the day you started becoming this?",
                weakness: "remember", next: "exposed",
                success: "You remember. Not as a wound. As a stubborn child." },
  exposed:    { taunt: "And now? Will you keep me, or let me go?",
                weakness: "release",  next: "released",
                success: "You release. The figure exhales for the first time." },
  released:   { taunt: "", weakness: "release", next: "released", success: "" },
};

const CMDS: { label: string; cmd: Command }[] = [
  { label: "OBSERVE",  cmd: "observe" },
  { label: "ADDRESS",  cmd: "address" },
  { label: "REMEMBER", cmd: "remember" },
  { label: "RELEASE",  cmd: "release" },
];

const STATE_FRAME: Record<State, number> = {
  composed: 0, flattering: 2, fractured: 4, exposed: 6, released: 8,
};

export class CuratedSelfScene extends Phaser.Scene {
  private save!: SaveSlot;
  private state: State = "composed";
  private cmdTexts: GBCText[] = [];
  private cursor = 0;
  private busy = false;
  private boss!: Phaser.GameObjects.Sprite;
  private logText!: GBCText;
  private stateText!: GBCText;
  private cursorMark!: GBCText;

  constructor() { super("CuratedSelf"); }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.cmdTexts = [];
    this.state = "composed";
    this.cursor = 0;
    this.busy = false;
  }

  create() {
    this.cameras.main.setBackgroundColor("#05070d");
    this.cameras.main.fadeIn(500);

    // Stars + horizon, constrained to arena (12..76)
    const g = this.add.graphics();
    for (let i = 0; i < 32; i++) {
      g.fillStyle(0xdde6f5, Phaser.Math.FloatBetween(0.3, 1));
      g.fillRect(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(14, 56), 1, 1);
    }
    g.fillStyle(0x1a2030, 1); g.fillRect(0, 64, GBC_W, 2);
    g.fillStyle(0x243058, 1); g.fillRect(0, 66, GBC_W, 10);
    g.fillStyle(0x1a2238, 0.7); g.fillEllipse(GBC_W / 2, 70, 64, 8);

    // Title plate (top-right under HUD)
    drawGBCBox(this, GBC_W - 92, 14, 88, 14);
    new GBCText(this, GBC_W - 88, 17, "CURATED SELF", { color: COLOR.textWarn, depth: 101 });
    this.stateText = new GBCText(this, 4, 14, "COMPOSED", { color: COLOR.textAccent, depth: 101 });

    // Boss sprite
    this.boss = this.add.sprite(GBC_W / 2, 46, "boss", STATE_FRAME.composed).setOrigin(0.5, 0.5);
    this.boss.play("boss_composed");

    // Log box — y 76..112 (36px)
    drawGBCBox(this, 0, 76, GBC_W, 36);
    this.logText = new GBCText(this, 4, 81, STATE_LINES.composed.taunt, {
      color: COLOR.textAccent, depth: 102, maxWidthPx: GBC_W - 10,
    });

    // Command panel — y 112..144
    drawGBCBox(this, 0, 112, GBC_W, 32);
    CMDS.forEach((c, i) => {
      const x = 16 + (i % 2) * 70;
      const y = 118 + Math.floor(i / 2) * 11;
      const t = new GBCText(this, x, y, c.label, { color: COLOR.textLight, depth: 101 });
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerdown", () => this.choose(i));
      t.obj.setData("cmd", c.cmd);
      this.cmdTexts.push(t);
    });
    this.cursorMark = new GBCText(this, 8, 118, "▶", { color: COLOR.textGold, depth: 101 });
    this.refreshCursor();

    attachHUD(this, () => this.save.stats);

    const kb = this.input.keyboard!;
    kb.on("keydown-LEFT",  () => this.move(-1));
    kb.on("keydown-RIGHT", () => this.move(1));
    kb.on("keydown-UP",    () => this.move(-2));
    kb.on("keydown-DOWN",  () => this.move(2));
    kb.on("keydown-ENTER", () => this.choose(this.cursor));
    kb.on("keydown-SPACE", () => this.choose(this.cursor));
    this.events.on("vinput-down", (dir: string) => {
      if (dir === "left")  this.move(-1);
      if (dir === "right") this.move(1);
      if (dir === "up")    this.move(-2);
      if (dir === "down")  this.move(2);
    });
    this.events.on("vinput-action", () => this.choose(this.cursor));
  }

  private move(d: number) {
    if (this.busy) return;
    this.cursor = (this.cursor + d + 4) % 4;
    this.refreshCursor();
  }
  private refreshCursor() {
    this.cmdTexts.forEach((t, i) => t.setColor(i === this.cursor ? COLOR.textGold : COLOR.textLight));
    const x = 8 + (this.cursor % 2) * 70;
    const y = 118 + Math.floor(this.cursor / 2) * 11;
    this.cursorMark.setPosition(x, y);
  }

  private choose(i: number) {
    if (this.busy) return;
    if (this.state === "released") return this.endGame();
    const cmd = this.cmdTexts[i].obj.getData("cmd") as Command;
    const stage = STATE_LINES[this.state];
    this.busy = true;
    if (cmd === stage.weakness) {
      this.logText.setText(stage.success);
      this.cameras.main.flash(180, 200, 220, 255);
      this.time.delayedCall(800, () => {
        this.state = stage.next;
        this.stateText.setText(this.state.toUpperCase());
        this.boss.play(`boss_${this.state}`);
        if (this.state === "released") {
          this.tweens.add({ targets: this.boss, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
          this.logText.setText("Silence. Then warmth. The verb-loop is yours.");
          this.time.delayedCall(1400, () => this.endGame());
        } else {
          this.busy = false;
        }
      });
    } else {
      this.logText.setText("The mask only steadies. Try another verb.");
      this.cameras.main.shake(100, 0.003);
      this.busy = false;
    }
  }

  private endGame() {
    this.save.scene = "Epilogue";
    this.save.flags.act0_complete = true;
    writeSave(this.save);
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Epilogue", { save: this.save }));
  }
}

export class EpilogueScene extends Phaser.Scene {
  private save!: SaveSlot;
  constructor() { super("Epilogue"); }
  init(data: { save: SaveSlot }) { this.save = data.save; }

  create() {
    this.cameras.main.setBackgroundColor("#0a0e1a");
    this.cameras.main.fadeIn(700);

    // Quiet starfield
    for (let i = 0; i < 40; i++) {
      this.add.rectangle(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(0, GBC_H),
        1, 1, 0xdde6f5, Phaser.Math.FloatBetween(0.3, 1));
    }

    new GBCText(this, GBC_W / 2 - 22, 16, "ACT ZERO", { color: COLOR.textAccent, depth: 10 });
    new GBCText(this, GBC_W / 2 - 22, 26, "COMPLETE", { color: COLOR.textLight, depth: 10 });

    drawGBCBox(this, 12, 44, GBC_W - 24, 58);
    new GBCText(this, 18, 50, `CLARITY    ${this.save.stats.clarity}`, { color: COLOR.textLight, depth: 110 });
    new GBCText(this, 18, 60, `COMPASSION ${this.save.stats.compassion}`, { color: COLOR.textLight, depth: 110 });
    new GBCText(this, 18, 70, `COURAGE    ${this.save.stats.courage}`, { color: COLOR.textLight, depth: 110 });
    new GBCText(this, 18, 84, "THE VERB-LOOP IS YOURS.", { color: COLOR.textAccent, maxWidthPx: GBC_W - 36, depth: 110 });

    // Action prompts with backing strip for legibility
    this.add.rectangle(0, GBC_H - 26, GBC_W, 26, 0x05070d, 0.92).setOrigin(0, 0).setDepth(199);
    new GBCText(this, 6, GBC_H - 22, "A: WALK AGAIN",      { color: COLOR.textGold, depth: 200 });
    new GBCText(this, 6, GBC_H - 12, "B: ERASE  RESTART",  { color: COLOR.textDim,  depth: 200 });

    // Attach HUD so touch users get virtual A/B buttons
    attachHUD(this, () => this.save.stats);

    const walk  = () => this.scene.start("Title");
    const erase = () => { clearSave(); this.scene.start("Title"); };

    this.input.keyboard?.on("keydown-ENTER",     walk);
    this.input.keyboard?.on("keydown-SPACE",     walk);
    this.input.keyboard?.on("keydown-A",         walk);
    this.input.keyboard?.on("keydown-B",         erase);
    this.input.keyboard?.on("keydown-BACKSPACE", erase);
    this.events.on("vinput-action", walk);
    this.events.on("vinput-cancel", erase);
    // Tap-to-walk-again as a safety net (deferred so the click that opened
    // this scene doesn't immediately advance it)
    this.time.delayedCall(200, () => this.input.on("pointerdown", walk));
  }
}
