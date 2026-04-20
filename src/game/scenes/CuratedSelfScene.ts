import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, spawnMotes } from "../gbcArt";
import { writeSave, clearSave } from "../save";
import type { Command, SaveSlot } from "../types";
import { attachHUD } from "./hud";
import { getAudio, SONG_BOSS, SONG_EPILOGUE } from "../audio";

type State = "composed" | "flattering" | "fractured" | "exposed" | "released";

const STATE_LINES: Record<State, { taunt: string; weakness: Command; next: State; success: string; misses: string[]; phaseLabel: string }> = {
  composed:   { phaseLabel: "PHASE 1/4 - SEE",
                taunt: "I am the version of you that smiles for cameras.",
                weakness: "observe",  next: "flattering",
                success: "You see the careful posture. The smile loosens.",
                misses: [
                  "The mask only steadies. Look closer.",
                  "Words slide off the lacquer. Try seeing first.",
                  "Release without sight is a shrug. Watch.",
                ] },
  flattering: { phaseLabel: "PHASE 2/4 - SPEAK",
                taunt: "Tell me what you actually wanted them to see.",
                weakness: "address",  next: "fractured",
                success: "You speak the unrehearsed line. The polish cracks.",
                misses: [
                  "It loves being looked at. Speak instead.",
                  "Memory is a lullaby to it. Name what is true.",
                  "It will not be released until it is addressed.",
                ] },
  fractured:  { phaseLabel: "PHASE 3/4 - RECALL",
                taunt: "Remember the day you started becoming this?",
                weakness: "remember", next: "exposed",
                success: "You remember. Not as a wound. As a stubborn child.",
                misses: [
                  "Cracks deepen but do not open. Reach back.",
                  "Words are too late here. Where did this begin?",
                  "Seeing alone won't mend it. Remember.",
                ] },
  exposed:    { phaseLabel: "PHASE 4/4 - LET GO",
                taunt: "And now? Will you keep me, or let me go?",
                weakness: "release",  next: "released",
                success: "You release. The figure exhales for the first time.",
                misses: [
                  "It has nothing left to hide. Let it go.",
                  "More looking only stretches the moment. Release.",
                  "Speech now would be a leash. Open your hand.",
                ] },
  released:   { phaseLabel: "RELEASED", taunt: "", weakness: "release", next: "released", success: "", misses: [] },
};

const STATE_HUE: Record<State, number> = {
  composed:   0xffffff,
  flattering: 0xf0d090,
  fractured:  0xd88080,
  exposed:    0xc0c8e8,
  released:   0xa8e8c8,
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
    getAudio().music.play("boss", SONG_BOSS);

    // Stars + horizon, constrained to arena (12..76)
    const g = this.add.graphics();
    for (let i = 0; i < 32; i++) {
      g.fillStyle(0xdde6f5, Phaser.Math.FloatBetween(0.3, 1));
      g.fillRect(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(14, 56), 1, 1);
    }
    // A few twinkling stars on top of the static field
    for (let i = 0; i < 6; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(14, 50), 1, 1, 0xffffff, 1);
      this.tweens.add({ targets: s, alpha: 0.2, duration: Phaser.Math.Between(600, 1400), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1200) });
    }
    g.fillStyle(0x1a2030, 1); g.fillRect(0, 64, GBC_W, 2);
    g.fillStyle(0x243058, 1); g.fillRect(0, 66, GBC_W, 10);
    g.fillStyle(0x1a2238, 0.7); g.fillEllipse(GBC_W / 2, 70, 64, 8);

    // Boss aura — pulsing red ring behind the figure
    const aura = this.add.circle(GBC_W / 2, 46, 18, 0xd84a4a, 0.18);
    this.tweens.add({ targets: aura, scale: 1.4, alpha: 0.05, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    // Drifting embers
    spawnMotes(this, { count: 10, color: 0xd86a6a, alpha: 0.45, driftY: -0.01, driftX: 0.002, depth: 30 });

    // Title plate (top-right under HUD)
    drawGBCBox(this, GBC_W - 92, 14, 88, 14);
    new GBCText(this, GBC_W - 88, 17, "CURATED SELF", { color: COLOR.textWarn, depth: 101 });
    this.stateText = new GBCText(this, 4, 14, STATE_LINES.composed.phaseLabel, { color: COLOR.textGold, depth: 101 });

    // Boss sprite + subtle hover bob
    this.boss = this.add.sprite(GBC_W / 2, 46, "boss", STATE_FRAME.composed).setOrigin(0.5, 0.5);
    this.boss.play("boss_composed");
    this.tweens.add({ targets: this.boss, y: 44, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.inOut" });

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
    getAudio().sfx("cursor");
    this.refreshCursor();
  }
  private refreshCursor() {
    this.cmdTexts.forEach((t, i) => t.setColor(i === this.cursor ? COLOR.textGold : COLOR.textLight));
    const x = 8 + (this.cursor % 2) * 70;
    const y = 118 + Math.floor(this.cursor / 2) * 11;
    this.cursorMark.setPosition(x, y);
  }

  private missIdx = 0;

  private choose(i: number) {
    if (this.busy) return;
    if (this.state === "released") return this.endGame();
    const cmd = this.cmdTexts[i].obj.getData("cmd") as Command;
    const stage = STATE_LINES[this.state];
    this.busy = true;
    const audio = getAudio();
    if (cmd === stage.weakness) {
      this.logText.setText(stage.success);
      this.cameras.main.flash(180, 200, 220, 255);
      audio.sfx("resolve");
      this.missIdx = 0;
      this.time.delayedCall(800, () => {
        this.state = stage.next;
        this.stateText.setText(STATE_LINES[this.state].phaseLabel);
        this.boss.play(`boss_${this.state}`);
        this.boss.setTint(STATE_HUE[this.state]);
        this.tweens.add({ targets: this.boss, scale: 1.15, duration: 220, yoyo: true });
        if (this.state === "released") {
          this.tweens.add({ targets: this.boss, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
          this.logText.setText("Silence. Then warmth. The verb-loop is yours.");
          audio.sfx("open");
          this.time.delayedCall(1400, () => this.endGame());
        } else {
          this.busy = false;
        }
      });
    } else {
      const quip = stage.misses[this.missIdx % stage.misses.length] ?? "It only steadies.";
      this.missIdx++;
      this.logText.setText(quip);
      this.cameras.main.shake(100, 0.003);
      this.boss.setTintFill(0xd84a4a);
      this.time.delayedCall(120, () => this.boss.clearTint());
      audio.sfx("miss");
      this.busy = false;
    }
  }

  private endGame() {
    this.save.scene = "Epilogue";
    this.save.flags.act0_complete = true;
    writeSave(this.save);
    const a = getAudio(); a.music.stop();
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Epilogue", { save: this.save }));
  }
}

export class EpilogueScene extends Phaser.Scene {
  private save!: SaveSlot;
  private cursor = 0;
  private optionTexts: GBCText[] = [];
  private cursorMark!: GBCText;

  constructor() { super("Epilogue"); }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.cursor = 0;
    this.optionTexts = [];
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0e1a");
    this.cameras.main.fadeIn(700);
    getAudio().music.play("epilogue", SONG_EPILOGUE);

    // Twinkling starfield
    for (let i = 0; i < 50; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(0, GBC_H),
        1, 1, 0xdde6f5, Phaser.Math.FloatBetween(0.3, 1));
      this.tweens.add({ targets: s, alpha: 0.15, duration: Phaser.Math.Between(700, 1800), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
    }

    // Aurora bands gently sliding across the upper area
    for (let b = 0; b < 3; b++) {
      const colors = [0x88c0f0, 0xa8e8c8, 0xc8a8e8];
      const band = this.add.rectangle(GBC_W / 2, 24 + b * 6, GBC_W * 1.5, 3, colors[b], 0.18).setDepth(2);
      this.tweens.add({ targets: band, x: GBC_W / 2 + (b % 2 === 0 ? 12 : -12), alpha: 0.06, duration: 3200 + b * 800, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    // Slow camera breath
    this.cameras.main.zoomTo(1.04, 4000, "Sine.inOut", true);

    new GBCText(this, GBC_W / 2 - 22, 16, "ACT ZERO", { color: COLOR.textAccent, depth: 10 });
    new GBCText(this, GBC_W / 2 - 22, 26, "COMPLETE", { color: COLOR.textLight, depth: 10 });

    drawGBCBox(this, 12, 44, GBC_W - 24, 58);
    new GBCText(this, 18, 50, `CLARITY    ${this.save.stats.clarity}`, { color: COLOR.textLight, depth: 110 });
    new GBCText(this, 18, 60, `COMPASSION ${this.save.stats.compassion}`, { color: COLOR.textLight, depth: 110 });
    new GBCText(this, 18, 70, `COURAGE    ${this.save.stats.courage}`, { color: COLOR.textLight, depth: 110 });
    new GBCText(this, 18, 84, "THE VERB-LOOP IS YOURS.", { color: COLOR.textAccent, maxWidthPx: GBC_W - 36, depth: 110 });

    this.add.rectangle(0, GBC_H - 28, GBC_W, 28, 0x05070d, 0.92).setOrigin(0, 0).setDepth(199);
    this.optionTexts = [
      new GBCText(this, 18, GBC_H - 24, "WALK AGAIN", { color: COLOR.textGold, depth: 200 }),
      new GBCText(this, 18, GBC_H - 14, "ERASE RESTART", { color: COLOR.textDim, depth: 200 }),
    ];
    this.cursorMark = new GBCText(this, 8, GBC_H - 24, "▶", { color: COLOR.textGold, depth: 200 });
    this.optionTexts.forEach((t, i) => {
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerdown", () => {
        this.cursor = i;
        this.refreshCursor();
        this.choose();
      });
    });
    this.refreshCursor();

    attachHUD(this, () => this.save.stats);

    const move = (d: number) => {
      this.cursor = (this.cursor + d + 2) % 2;
      getAudio().sfx("cursor");
      this.refreshCursor();
    };
    this.input.keyboard?.on("keydown-UP", () => move(-1));
    this.input.keyboard?.on("keydown-DOWN", () => move(1));
    this.input.keyboard?.on("keydown-W", () => move(-1));
    this.input.keyboard?.on("keydown-S", () => move(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.choose());
    this.input.keyboard?.on("keydown-SPACE", () => this.choose());
    this.events.on("vinput-down", (dir: string) => {
      if (dir === "up") move(-1);
      if (dir === "down") move(1);
    });
    this.events.on("vinput-action", () => this.choose());
  }

  private refreshCursor() {
    this.optionTexts.forEach((t, i) => t.setColor(i === this.cursor ? COLOR.textGold : COLOR.textDim));
    this.cursorMark.setPosition(8, this.cursor === 0 ? GBC_H - 24 : GBC_H - 14);
  }

  private choose() {
    const a = getAudio();
    a.sfx("confirm");
    a.music.stop();
    if (this.cursor === 0) {
      this.scene.start("Title");
      return;
    }
    clearSave();
    this.scene.start("Title");
  }
}
