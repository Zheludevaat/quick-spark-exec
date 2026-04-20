import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, spawnMotes } from "../gbcArt";
import { writeSave, clearSave } from "../save";
import type { Command, SaveSlot } from "../types";
import { attachHUD } from "./hud";
import { runInquiry } from "../inquiry";
import { getAudio, SONG_BOSS, SONG_EPILOGUE } from "../audio";
import { onActionDown, onDirection } from "../controls";

type Phase = "composed" | "fractured" | "exposed" | "released";

const PHASE_LABEL: Record<Phase, string> = {
  composed:  "PHASE 1/3 - COMPOSED",
  fractured: "PHASE 2/3 - FRACTURED",
  exposed:   "PHASE 3/3 - EXPOSED",
  released:  "RELEASED",
};

const PHASE_TAUNT: Record<Phase, string> = {
  composed:  "I am the version of you that smiles for cameras. ADDRESS me three times.",
  fractured: "I am cracked. Find the brightest piece. OBSERVE in order.",
  exposed:   "I have nothing left. Will you stand and see me? WITNESS.",
  released:  "Silence. Then warmth.",
};

const PHASE_HUE: Record<Phase, number> = {
  composed:  0xffffff,
  fractured: 0xd88080,
  exposed:   0xc0c8e8,
  released:  0xa8e8c8,
};

const PHASE_FRAME: Record<Phase, number> = { composed: 0, fractured: 4, exposed: 6, released: 8 };

const CMDS_BASE: { label: string; cmd: Command }[] = [
  { label: "OBSERVE",  cmd: "observe" },
  { label: "ADDRESS",  cmd: "address" },
  { label: "REMEMBER", cmd: "remember" },
  { label: "RELEASE",  cmd: "release" },
];
const CMD_WITNESS: { label: string; cmd: Command } = { label: "WITNESS", cmd: "witness" };

export class CuratedSelfScene extends Phaser.Scene {
  private save!: SaveSlot;
  private phase: Phase = "composed";
  private cmds: { label: string; cmd: Command }[] = [];
  private cmdTexts: GBCText[] = [];
  private cursor = 0;
  private busy = false;
  private boss!: Phaser.GameObjects.Sprite;
  private logText!: GBCText;
  private stateText!: GBCText;
  private cursorMark!: GBCText;
  private addressHits = 0;
  private witnessHits = 0;
  private fragments: { sprite: Phaser.GameObjects.Arc; brightness: number; idx: number }[] = [];
  private brightestIdx = 0;
  private fragOrderProgress = 0;
  private missIdx = 0;

  constructor() { super("CuratedSelf"); }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.cmdTexts = [];
    this.cmds = [];
    this.phase = "composed";
    this.cursor = 0;
    this.busy = false;
    this.addressHits = 0;
    this.witnessHits = 0;
    this.fragments = [];
    this.fragOrderProgress = 0;
    this.missIdx = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor("#05070d");
    this.cameras.main.fadeIn(500);
    getAudio().music.play("boss", SONG_BOSS);

    // Stars + horizon
    const g = this.add.graphics();
    for (let i = 0; i < 32; i++) {
      g.fillStyle(0xdde6f5, Phaser.Math.FloatBetween(0.3, 1));
      g.fillRect(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(14, 56), 1, 1);
    }
    for (let i = 0; i < 6; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(14, 50), 1, 1, 0xffffff, 1);
      this.tweens.add({ targets: s, alpha: 0.2, duration: Phaser.Math.Between(600, 1400), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1200) });
    }
    g.fillStyle(0x1a2030, 1); g.fillRect(0, 64, GBC_W, 2);
    g.fillStyle(0x243058, 1); g.fillRect(0, 66, GBC_W, 10);
    g.fillStyle(0x1a2238, 0.7); g.fillEllipse(GBC_W / 2, 70, 64, 8);

    const aura = this.add.circle(GBC_W / 2, 46, 18, 0xd84a4a, 0.18);
    this.tweens.add({ targets: aura, scale: 1.4, alpha: 0.05, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    spawnMotes(this, { count: 10, color: 0xd86a6a, alpha: 0.45, driftY: -0.01, driftX: 0.002, depth: 30 });

    drawGBCBox(this, GBC_W - 92, 14, 88, 14);
    new GBCText(this, GBC_W - 88, 17, "CURATED SELF", { color: COLOR.textWarn, depth: 101 });
    this.stateText = new GBCText(this, 4, 14, PHASE_LABEL.composed, { color: COLOR.textGold, depth: 101 });

    this.boss = this.add.sprite(GBC_W / 2, 46, "boss", PHASE_FRAME.composed).setOrigin(0.5, 0.5);
    this.boss.play("boss_composed");
    this.tweens.add({ targets: this.boss, y: 44, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    drawGBCBox(this, 0, 76, GBC_W, 36);
    this.logText = new GBCText(this, 4, 81, PHASE_TAUNT.composed, {
      color: COLOR.textAccent, depth: 102, maxWidthPx: GBC_W - 10,
    });

    drawGBCBox(this, 0, 112, GBC_W, 32);
    this.cmds = [...CMDS_BASE];
    if (this.save.verbs.witness) this.cmds.push(CMD_WITNESS);
    this.cmds.forEach((c, i) => {
      const pos = this.cmdPos(i);
      const t = new GBCText(this, pos.x + 8, pos.y, c.label, { color: COLOR.textLight, depth: 101 });
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerdown", () => this.choose(i));
      t.obj.setData("cmd", c.cmd);
      this.cmdTexts.push(t);
    });
    this.cursorMark = new GBCText(this, 8, 118, "▶", { color: COLOR.textGold, depth: 101 });
    this.refreshCursor();
    this.refreshAvailable();

    attachHUD(this, () => this.save.stats);

    onDirection(this, (d) => {
      if (d === "left")  this.move(-1);
      if (d === "right") this.move(1);
      if (d === "up")    this.move(-2);
      if (d === "down")  this.move(2);
    });
    onActionDown(this, "action", () => this.choose(this.cursor));
    this.events.on("vinput-down", (dir: string) => {
      if (dir === "left")  this.move(-1);
      if (dir === "right") this.move(1);
      if (dir === "up")    this.move(-2);
      if (dir === "down")  this.move(2);
    });
    this.events.on("vinput-action", () => this.choose(this.cursor));
  }

  private cmdPos(i: number) {
    if (i < 4) return { x: 8 + (i % 2) * 70, y: 118 + Math.floor(i / 2) * 11 };
    return { x: 56, y: 138 };
  }

  /** Greys out commands that are not valid in the current phase. */
  private refreshAvailable() {
    const valid = (cmd: Command) => {
      if (this.phase === "composed")  return cmd === "address" || cmd === "release";
      if (this.phase === "fractured") return cmd === "observe" || cmd === "release";
      if (this.phase === "exposed")   return cmd === "witness" || cmd === "release";
      return false;
    };
    this.cmdTexts.forEach((t, i) => {
      const cmd = this.cmds[i].cmd;
      if (i === this.cursor) return;
      t.setColor(valid(cmd) ? COLOR.textLight : COLOR.textDim);
    });
  }

  private move(d: number) {
    if (this.busy) return;
    const n = this.cmds.length;
    this.cursor = (this.cursor + d + n) % n;
    getAudio().sfx("cursor");
    this.refreshCursor();
    this.refreshAvailable();
  }
  private refreshCursor() {
    this.cmdTexts.forEach((t, i) => t.setColor(i === this.cursor ? COLOR.textGold : COLOR.textLight));
    const pos = this.cmdPos(this.cursor);
    this.cursorMark.setPosition(pos.x, pos.y);
  }

  // ============================================================================
  // PHASE 1 — COMPOSED: ADDRESS x3
  // ============================================================================
  private handleComposed(cmd: Command) {
    if (cmd === "address") {
      this.addressHits++;
      this.cameras.main.flash(140, 200, 220, 255);
      getAudio().sfx("resolve");
      const replies = [
        "The smile loosens. One layer of polish drops.",
        "The pose softens. Another layer goes.",
        "The mask falls. Cracks open across the surface.",
      ];
      this.logText.setText(replies[this.addressHits - 1] ?? replies[2]);
      if (this.addressHits >= 3) {
        this.time.delayedCall(900, () => this.enterPhase("fractured"));
      } else {
        this.busy = false;
      }
    } else if (cmd === "release") {
      this.logText.setText("You step back. The image only steadies. ADDRESS to crack it.");
      getAudio().sfx("cancel");
      this.busy = false;
    } else {
      this.logText.setText(this.missQuip());
      this.cameras.main.shake(80, 0.003);
      getAudio().sfx("miss");
      this.busy = false;
    }
  }

  // ============================================================================
  // PHASE 2 — FRACTURED: OBSERVE in brightest-first order
  // ============================================================================
  private enterPhase(p: Phase) {
    this.phase = p;
    this.stateText.setText(PHASE_LABEL[p]);
    this.logText.setText(PHASE_TAUNT[p]);
    this.boss.play(`boss_${p === "fractured" ? "fractured" : p === "exposed" ? "exposed" : "released"}`);
    this.boss.setTint(PHASE_HUE[p]);
    this.tweens.add({ targets: this.boss, scale: 1.15, duration: 220, yoyo: true });
    this.refreshAvailable();
    if (p === "fractured") this.spawnFragments();
    if (p === "exposed") {
      // The boss kneels and asks
      this.tweens.add({ targets: this.boss, scaleY: 0.85, duration: 600 });
      this.cleanupFragments();
    }
    this.busy = false;
  }

  private spawnFragments() {
    this.cleanupFragments();
    const cx = GBC_W / 2, cy = 46;
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const fx = cx + Math.cos(ang) * 16;
      const fy = cy + Math.sin(ang) * 6;
      const sprite = this.add.circle(fx, fy, 4, 0xd88080, 0.7).setDepth(45);
      this.fragments.push({ sprite, brightness: 0.5, idx: i });
    }
    // Hide the boss sprite during fractured phase
    this.boss.setVisible(false);
    this.cycleBrightest();
  }

  private cycleBrightest() {
    if (this.phase !== "fractured") return;
    this.brightestIdx = Math.floor(Math.random() * 3);
    this.fragments.forEach((f, i) => {
      f.brightness = i === this.brightestIdx ? 1 : 0.4;
      this.tweens.add({ targets: f.sprite, alpha: f.brightness, scale: i === this.brightestIdx ? 1.6 : 1, duration: 400 });
      f.sprite.fillColor = i === this.brightestIdx ? 0xffe098 : 0xd88080;
    });
    // Auto-cycle every 3s if player doesn't act
    this.time.delayedCall(3000, () => this.cycleBrightest());
  }

  private cleanupFragments() {
    this.fragments.forEach(f => f.sprite.destroy());
    this.fragments = [];
    this.boss.setVisible(true);
  }

  private handleFractured(cmd: Command) {
    if (cmd === "observe") {
      // Need to pick the brightest. We auto-pick the brightest fragment as the target.
      // Since fragments are abstract, we just check: if "observe" called while brightest is set, success.
      this.fragOrderProgress++;
      this.cameras.main.flash(140, 220, 220, 255);
      getAudio().sfx("resolve");
      // Dim the picked fragment permanently
      const picked = this.fragments[this.brightestIdx];
      if (picked) {
        this.tweens.add({ targets: picked.sprite, alpha: 0.15, scale: 0.6, duration: 500 });
      }
      this.logText.setText(`Fragment ${this.fragOrderProgress} witnessed. ${3 - this.fragOrderProgress} remain.`);
      if (this.fragOrderProgress >= 3) {
        this.time.delayedCall(900, () => this.enterPhase("exposed"));
      } else {
        this.busy = false;
      }
    } else if (cmd === "release") {
      this.logText.setText("You release. The fragments hover, waiting.");
      getAudio().sfx("cancel");
      this.busy = false;
    } else {
      this.logText.setText("They re-merge briefly. OBSERVE the brightest piece.");
      this.cameras.main.shake(80, 0.003);
      // Re-merge animation
      this.fragments.forEach(f => this.tweens.add({ targets: f.sprite, alpha: 0.6, scale: 1, duration: 400 }));
      getAudio().sfx("miss");
      this.busy = false;
    }
  }

  // ============================================================================
  // PHASE 3 — EXPOSED: WITNESS x3, Plateau-Remain offered after first WITNESS
  // ============================================================================
  private handleExposed(cmd: Command) {
    if (cmd === "witness") {
      this.witnessHits++;
      this.cameras.main.flash(220, 200, 220, 255);
      getAudio().sfx("resolve");
      if (this.witnessHits === 1) {
        this.logText.setText("It exhales for the first time. 'Thank you.'");
        this.time.delayedCall(1100, () => this.askPlateauRemain());
      } else if (this.witnessHits === 2) {
        this.logText.setText("'Will you remember me kindly?'");
        this.busy = false;
      } else {
        this.logText.setText("It dissolves into a Memory Shard. The Curated Self is at peace.");
        this.save.shards.push("curated_self");
        writeSave(this.save);
        this.tweens.add({ targets: this.boss, alpha: 0, duration: 900, onComplete: () => this.endGame() });
      }
    } else if (cmd === "release") {
      this.logText.setText("You release. It waits, patiently. Try WITNESS.");
      getAudio().sfx("cancel");
      this.busy = false;
    } else {
      this.logText.setText("Words now would be a leash. Stand. WITNESS.");
      this.cameras.main.shake(60, 0.002);
      getAudio().sfx("miss");
      this.busy = false;
    }
  }

  private askPlateauRemain() {
    runInquiry(
      this,
      { who: "Soryn", text: "You may stay here in the image. Comfortable. Or finish." },
      [
        { choice: "confess", label: "FINISH", reply: "Then witness twice more." },
        { choice: "silent",  label: "REMAIN", reply: "The image is comfortable. We will wait." },
      ],
      (picked) => {
        if (picked.label === "REMAIN") this.endRemain();
        else this.busy = false;
      },
    );
  }

  private endRemain() {
    this.save.scene = "ImaginalRealm";
    this.save.region = "corridor";
    this.save.flags.plateau_remain = true;
    writeSave(this.save);
    const a = getAudio(); a.music.stop();
    this.cameras.main.fadeOut(900, 80, 100, 140);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Title"));
  }

  // ============================================================================
  // ROUTER
  // ============================================================================
  private choose(i: number) {
    if (this.busy) return;
    const cmd = this.cmdTexts[i].obj.getData("cmd") as Command;
    this.busy = true;
    if (this.phase === "composed")  return this.handleComposed(cmd);
    if (this.phase === "fractured") return this.handleFractured(cmd);
    if (this.phase === "exposed")   return this.handleExposed(cmd);
    this.busy = false;
  }

  private missQuip(): string {
    const quips = [
      "It only steadies. Try the right verb.",
      "The mask is lacquered. Words crack it. Yours.",
      "Release without sight is a shrug.",
    ];
    return quips[(this.missIdx++) % quips.length];
  }

  private endGame() {
    this.save.scene = "Epilogue";
    this.save.flags.act1_complete = true;
    this.save.flags.plateau_remain = false;
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

    for (let i = 0; i < 50; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(0, GBC_H),
        1, 1, 0xdde6f5, Phaser.Math.FloatBetween(0.3, 1));
      this.tweens.add({ targets: s, alpha: 0.15, duration: Phaser.Math.Between(700, 1800), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
    }

    for (let b = 0; b < 3; b++) {
      const colors = [0x88c0f0, 0xa8e8c8, 0xc8a8e8];
      const band = this.add.rectangle(GBC_W / 2, 24 + b * 6, GBC_W * 1.5, 3, colors[b], 0.18).setDepth(2);
      this.tweens.add({ targets: band, x: GBC_W / 2 + (b % 2 === 0 ? 12 : -12), alpha: 0.06, duration: 3200 + b * 800, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    this.cameras.main.zoomTo(1.04, 4000, "Sine.inOut", true);

    new GBCText(this, GBC_W / 2 - 22, 16, "ACT ONE", { color: COLOR.textAccent, depth: 10 });
    new GBCText(this, GBC_W / 2 - 22, 26, "COMPLETE", { color: COLOR.textLight, depth: 10 });

    drawGBCBox(this, 12, 44, GBC_W - 24, 64);
    new GBCText(this, 18, 50, `CLARITY    ${this.save.stats.clarity}`, { color: COLOR.textLight, depth: 110 });
    new GBCText(this, 18, 60, `COMPASSION ${this.save.stats.compassion}`, { color: COLOR.textLight, depth: 110 });
    new GBCText(this, 18, 70, `COURAGE    ${this.save.stats.courage}`, { color: COLOR.textLight, depth: 110 });
    new GBCText(this, 18, 80, `SHARDS     ${this.save.shards.length}/21`, { color: COLOR.textGold, depth: 110 });
    new GBCText(this, 18, 92, "THE IMAGINAL IS BEHIND YOU.", { color: COLOR.textAccent, maxWidthPx: GBC_W - 36, depth: 110 });

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
    onDirection(this, (d) => { if (d === "up") move(-1); else if (d === "down") move(1); });
    onActionDown(this, "action", () => this.choose());
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
