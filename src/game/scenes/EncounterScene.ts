import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, spawnMotes } from "../gbcArt";
import { writeSave } from "../save";
import type { Command, SaveSlot, Stats, ImaginalRegion } from "../types";
import { getAudio, SONG_BATTLE } from "../audio";
import { onActionDown, onDirection } from "../controls";

type EnemyKind = "reflection" | "echo" | "glitter";

type EnemyDef = {
  name: string;
  kind: EnemyKind;
  weakness: Command;
  hp: number;
  taunt: string;
  resolved: string;
  reward: Partial<Stats>;
};

const ENEMIES: Record<EnemyKind, EnemyDef> = {
  reflection: {
    name: "REFLECTION",
    kind: "reflection",
    weakness: "observe",
    hp: 3,
    taunt: "It mimes your every move with a smug little smile.",
    resolved: "Seen plainly, the mimicry collapses into a soft hum.",
    reward: { clarity: 1 },
  },
  echo: {
    name: "ECHO DOUBLE",
    kind: "echo",
    weakness: "address",
    hp: 3,
    taunt: "It repeats a thing you wish you had not said.",
    resolved: "You name what you meant. The echo answers, kindly.",
    reward: { compassion: 1 },
  },
  glitter: {
    name: "MEMORY GLITTER",
    kind: "glitter",
    weakness: "remember",
    hp: 3,
    taunt: "Bright shards of an unfinished afternoon swirl.",
    resolved: "You remember the whole afternoon, not just its corners.",
    reward: { courage: 1 },
  },
};

const ENEMY_FRAME_BASE: Record<EnemyKind, number> = {
  reflection: 0,
  echo: 2,
  glitter: 4,
};

const CMDS: { label: string; cmd: Command }[] = [
  { label: "OBSERVE", cmd: "observe" },
  { label: "ADDRESS", cmd: "address" },
  { label: "REMEMBER", cmd: "remember" },
  { label: "RELEASE", cmd: "release" },
];

const VERB_HINT: Record<Command, string> = {
  observe: "Look at it plainly. No story.",
  address: "Speak the unsaid thing.",
  remember: "Recall the whole afternoon.",
  release: "Let it go - you learn less.",
  witness: "Stand. See without flinching.",
  transmute: "Change the matter of it.",
};

const KIND_GOAL: Record<EnemyKind, string> = {
  reflection: "A mimic. Try OBSERVE.",
  echo: "A regretted word. Try ADDRESS.",
  glitter: "A scattered memory. Try REMEMBER.",
};

export class EncounterScene extends Phaser.Scene {
  private save!: SaveSlot;
  private def!: EnemyDef;
  private hp = 3;
  private onDone!: (won: boolean) => void;
  private cmdTexts: GBCText[] = [];
  private logText!: GBCText;
  private hpBar!: Phaser.GameObjects.Graphics;
  private cursor = 0;
  private busy = false;
  private enemy!: Phaser.GameObjects.Sprite;
  private enemyBob?: Phaser.Tweens.Tween;
  private enemyAura!: Phaser.GameObjects.Arc;
  private cursorMark!: GBCText;
  private misses = 0;
  private verbHintText!: GBCText;
  private goalText!: GBCText;

  constructor() {
    super("Encounter");
  }
  private region: ImaginalRegion = "pools";
  init(data: { save: SaveSlot; kind: EnemyKind; region?: ImaginalRegion; onDone: (won: boolean) => void }) {
    this.save = data.save;
    this.region = data.region ?? "pools";
    this.def = ENEMIES[data.kind];
    this.hp = this.def.hp;
    this.onDone = data.onDone;
    this.cmdTexts = [];
    this.misses = 0;
    this.cursor = 0;
    this.busy = false;
  }

  create() {
    getAudio().music.play("battle", SONG_BATTLE);

    // Contextual Backdrop based on current region
    const g = this.add.graphics();
    if (this.region === "pools") {
      this.cameras.main.setBackgroundColor("#0a1428");
      g.fillStyle(0x0a1020, 1).fillRect(0, 12, GBC_W, 52);
      g.fillStyle(0x1a2438, 1).fillRect(0, 64, GBC_W, 12);
      g.fillStyle(0x2a3458, 0.4).fillEllipse(GBC_W / 2, 70, 70, 8);
    } else if (this.region === "field") {
      this.cameras.main.setBackgroundColor("#1a1830");
      g.fillStyle(0x1a1a24, 1).fillRect(0, 12, GBC_W, 52);
      g.fillStyle(0x242438, 1).fillRect(0, 64, GBC_W, 12);
      for (let i = 0; i < 15; i++) {
        g.fillStyle(0xffe098, Phaser.Math.FloatBetween(0.2, 0.6));
        g.fillRect(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(14, 76), 1, 1);
      }
    } else {
      this.cameras.main.setBackgroundColor("#080a14");
      g.fillStyle(0x080c14, 1).fillRect(0, 12, GBC_W, 52);
      g.fillStyle(0x141824, 1).fillRect(0, 64, GBC_W, 12);
      g.fillStyle(0x1a2238, 0.4).fillRect(8, 12, 6, 64).fillRect(GBC_W - 14, 12, 6, 64);
    }

    const px = GBC_W / 2;
    const auraColor: Record<EnemyKind, number> = { reflection: 0xa8c8e8, echo: 0xc8a8e8, glitter: 0xe8d8a8 };
    this.enemyAura = this.add.circle(px, 46, 14, auraColor[this.def.kind], 0.18);
    this.tweens.add({
      targets: this.enemyAura, scale: 1.16, alpha: 0.1, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.inOut"
    });
    spawnMotes(this, { count: 8, color: auraColor[this.def.kind], alpha: 0.45, driftY: -0.008, driftX: 0.003, depth: 30 });

    this.enemy = this.add.sprite(px, 44, "enemies", ENEMY_FRAME_BASE[this.def.kind]);
    this.enemy.play(`enemy_${this.def.kind}`);
    this.enemyBob = this.tweens.add({
      targets: this.enemy,
      y: 42,
      scaleX: 1.02,
      scaleY: 0.98,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // Enemy name + HP plate (top-right under HUD)
    drawGBCBox(this, GBC_W - 84, 14, 80, 14);
    new GBCText(this, GBC_W - 80, 17, this.def.name, { color: COLOR.textLight, depth: 101 });
    this.hpBar = this.add.graphics().setDepth(102);
    this.drawHp();

    // Persistent goal banner (top-left, constrained so it doesn't fight the HP plate)
    this.goalText = new GBCText(this, 4, 14, KIND_GOAL[this.def.kind], {
      color: COLOR.textAccent,
      depth: 110,
      maxWidthPx: GBC_W - 92,
    });

    // Log box — y 76..112 (transient action feedback only)
    drawGBCBox(this, 0, 76, GBC_W, 36);
    this.logText = new GBCText(this, 4, 81, this.def.taunt, {
      color: COLOR.textAccent,
      depth: 102,
      maxWidthPx: GBC_W - 10,
    });

    // Persistent verb hint line near the bottom of the log box
    this.verbHintText = new GBCText(this, 4, 102, `> ${VERB_HINT.observe}`, {
      color: COLOR.textDim,
      depth: 103,
      maxWidthPx: GBC_W - 8,
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


    this.updateGoalBanner();
    this.updateVerbHint();
    this.refreshCursor();

    // Input
    onDirection(this, (d) => {
      if (d === "left") this.move(-1);
      if (d === "right") this.move(1);
      if (d === "up") this.move(-2);
      if (d === "down") this.move(2);
    });
    onActionDown(this, "action", () => this.choose(this.cursor));
    this.events.on("vinput-down", (dir: string) => {
      if (dir === "left") this.move(-1);
      if (dir === "right") this.move(1);
      if (dir === "up") this.move(-2);
      if (dir === "down") this.move(2);
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
    this.cmdTexts.forEach((t, i) =>
      t.setColor(i === this.cursor ? COLOR.textGold : COLOR.textLight),
    );
    const x = 8 + (this.cursor % 2) * 70;
    const y = 118 + Math.floor(this.cursor / 2) * 11;
    this.cursorMark.setPosition(x, y);
    this.updateVerbHint();
  }

  private updateGoalBanner() {
    if (!this.goalText) return;
    if (this.misses === 0) {
      this.goalText.setText(KIND_GOAL[this.def.kind]);
      this.goalText.setColor(COLOR.textAccent);
      this.goalText.obj.setAlpha(1);
      return;
    }
    this.goalText.setText(`IT FEARS: ${this.def.weakness.toUpperCase()}`);
    this.goalText.setColor(COLOR.textGold);
    this.goalText.obj.setAlpha(1);
  }

  private updateVerbHint() {
    if (!this.verbHintText) return;
    const cmd = CMDS[this.cursor].cmd;
    this.verbHintText.setText(`> ${VERB_HINT[cmd]}`);
  }

  private choose(i: number) {
    if (this.busy) return;
    const cmd = this.cmdTexts[i].obj.getData("cmd") as Command;
    this.busy = true;
    const audio = getAudio();
    if (cmd === this.def.weakness) {
      this.hp = 0;

      // --- ART UPGRADE: Visceral Combat Impacts ---
      // 1. Hit-Stop (~80ms time freeze on the killing blow)
      const prevTimeScale = this.tweens.timeScale;
      this.tweens.timeScale = 0.05;
      this.time.delayedCall(80, () => {
        this.tweens.timeScale = prevTimeScale;
      });

      // 2. White-out silhouette flash
      this.enemy.setTintFill(0xffffff);

      // 3. Violent horizontal squish
      this.tweens.add({
        targets: this.enemy,
        scaleX: 1.6,
        scaleY: 0.5,
        duration: 100,
        yoyo: true,
        ease: "Expo.out",
      });

      // Glitch effect specifically for "Echo"
      if (this.def.kind === "echo") {
        this.enemy.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: this.enemy,
          x: this.enemy.x + 10,
          duration: 30,
          yoyo: true,
          repeat: 5,
          ease: "Stepped",
        });
      }
      // --- END ART UPGRADE ---

      this.drawHp();
      this.logText.setText(this.def.resolved);
      this.cameras.main.flash(180, 220, 230, 255);
      audio.sfx("resolve");
      this.tweens.add({ targets: this.enemy, alpha: 0, duration: 800 });
      this.tweens.add({ targets: this.enemyAura, scale: 2.4, alpha: 0, duration: 700 });
      // Sparkle burst
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const sp = this.add.rectangle(GBC_W / 2, 46, 1, 1, 0xffffff, 1).setDepth(120);
        this.tweens.add({
          targets: sp,
          x: GBC_W / 2 + Math.cos(ang) * 22,
          y: 46 + Math.sin(ang) * 22,
          alpha: 0,
          duration: 600,
          ease: "Sine.out",
        });
      }
      // Apply base reward
      if (this.def.reward.clarity) this.save.stats.clarity += this.def.reward.clarity;
      if (this.def.reward.compassion) this.save.stats.compassion += this.def.reward.compassion;
      if (this.def.reward.courage) this.save.stats.courage += this.def.reward.courage;
      // First-try bonus: +1 to the same stat, plus a celebratory flash
      if (this.misses === 0) {
        if (this.def.reward.clarity) this.save.stats.clarity += 1;
        if (this.def.reward.compassion) this.save.stats.compassion += 1;
        if (this.def.reward.courage) this.save.stats.courage += 1;
        this.time.delayedCall(400, () => {
          new GBCText(this, GBC_W / 2 - 28, 50, "FIRST-TRY +1!", {
            color: COLOR.textGold,
            depth: 300,
          });
          this.cameras.main.flash(120, 255, 224, 152);
          audio.sfx("confirm");
        });
      }
      writeSave(this.save);
      this.time.delayedCall(1700, () => {
        this.onDone(true);
        this.scene.stop();
      });
    } else if (cmd === "release") {
      this.logText.setText("You release without seeing. The shape lingers, gentler.");
      audio.sfx("cancel");
      this.tweens.add({ targets: this.enemy, alpha: 0.3, duration: 700 });
      this.time.delayedCall(1300, () => {
        this.onDone(false);
        this.scene.stop();
      });
    } else {
      this.misses++;
      this.logText.setText("Not quite. The shape ripples but does not soften.");
      this.cameras.main.shake(120, 0.004);
      this.enemy.setTintFill(0xd84a4a);
      this.time.delayedCall(110, () => this.enemy.clearTint());

      this.tweens.add({
        targets: this.enemy,
        x: this.enemy.x + (Math.random() > 0.5 ? 4 : -4),
        y: this.enemy.y - 2,
        duration: 60,
        yoyo: true,
        ease: "Power2",
      });

      audio.sfx("miss");

      if (this.misses === 1) {
        this.updateGoalBanner();
        this.tweens.add({
          targets: this.goalText.obj,
          alpha: 0.45,
          duration: 180,
          yoyo: true,
          repeat: 3,
        });
      }

      this.busy = false;
    }
  }

  private drawHp() {
    this.hpBar.clear();
    // Plate at top: 50px wide bar
    const x = GBC_W - 80,
      y = 24,
      w = 72,
      h = 2;
    this.hpBar.fillStyle(0x2a3550, 1);
    this.hpBar.fillRect(x, y, w, h);
    const pct = this.hp / this.def.hp;
    const color = pct > 0.6 ? 0x6ab84a : pct > 0.3 ? 0xe0c060 : 0xd84a4a;
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(x, y, Math.ceil(w * pct), h);
  }
}
