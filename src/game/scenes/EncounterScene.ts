import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../gbcArt";
import { writeSave } from "../save";
import type { Command, SaveSlot, Stats } from "../types";

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
    name: "REFLECTION", kind: "reflection", weakness: "observe", hp: 3,
    taunt: "It mimes your every move with a smug little smile.",
    resolved: "Seen plainly, the mimicry collapses into a soft hum.",
    reward: { clarity: 1 },
  },
  echo: {
    name: "ECHO DOUBLE", kind: "echo", weakness: "address", hp: 3,
    taunt: "It repeats a thing you wish you had not said.",
    resolved: "You name what you meant. The echo answers, kindly.",
    reward: { compassion: 1 },
  },
  glitter: {
    name: "MEMORY GLITTER", kind: "glitter", weakness: "remember", hp: 3,
    taunt: "Bright shards of an unfinished afternoon swirl.",
    resolved: "You remember the whole afternoon, not just its corners.",
    reward: { courage: 1 },
  },
};

const ENEMY_FRAME_BASE: Record<EnemyKind, number> = {
  reflection: 0, echo: 2, glitter: 4,
};

const CMDS: { label: string; cmd: Command }[] = [
  { label: "OBSERVE",  cmd: "observe" },
  { label: "ADDRESS",  cmd: "address" },
  { label: "REMEMBER", cmd: "remember" },
  { label: "RELEASE",  cmd: "release" },
];

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
  private cursorMark!: GBCText;

  constructor() { super("Encounter"); }
  init(data: { save: SaveSlot; kind: EnemyKind; onDone: (won: boolean) => void }) {
    this.save = data.save;
    this.def = ENEMIES[data.kind];
    this.hp = this.def.hp;
    this.onDone = data.onDone;
    this.cmdTexts = [];
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0e1a");

    // Backdrop: striped night with horizon
    const g = this.add.graphics();
    g.fillStyle(0x0a0f20, 1); g.fillRect(0, 0, GBC_W, 70);
    g.fillStyle(0x1a2030, 1); g.fillRect(0, 70, GBC_W, 4);
    g.fillStyle(0x243058, 1); g.fillRect(0, 74, GBC_W, 16);
    // dot stars
    for (let i = 0; i < 30; i++) {
      g.fillStyle(0xdde6f5, Phaser.Math.FloatBetween(0.3, 1));
      g.fillRect(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(0, 60), 1, 1);
    }

    // Enemy platform (Pokemon-style rounded shadow)
    const px = GBC_W / 2;
    g.fillStyle(0x1a2238, 0.7); g.fillEllipse(px, 78, 60, 8);

    // Enemy sprite
    this.enemy = this.add.sprite(px, 50, "enemies", ENEMY_FRAME_BASE[this.def.kind]);
    this.enemy.play(`enemy_${this.def.kind}`);
    this.tweens.add({ targets: this.enemy, y: 48, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    // Name + HP plate
    drawGBCBox(this, 4, 4, 90, 14);
    new GBCText(this, 8, 8, this.def.name, { color: COLOR.textLight });
    this.hpBar = this.add.graphics().setDepth(101);
    this.drawHp();

    // Command panel (bottom 2x2)
    drawGBCBox(this, 0, 92, GBC_W, 52);
    CMDS.forEach((c, i) => {
      const x = 16 + (i % 2) * 70;
      const y = 102 + Math.floor(i / 2) * 16;
      const t = new GBCText(this, x, y, c.label, { color: COLOR.textLight, depth: 101 });
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerdown", () => this.choose(i));
      t.obj.setData("cmd", c.cmd);
      this.cmdTexts.push(t);
    });
    this.cursorMark = new GBCText(this, 8, 102, "▶", { color: COLOR.textGold, depth: 101 });
    this.refreshCursor();

    // Log text under commands area? actually the box has limited room; use a one-liner
    this.logText = new GBCText(this, 4, 132, this.def.taunt, {
      color: COLOR.textAccent, depth: 102, maxWidthPx: GBC_W - 8,
    });

    // Input
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
    const y = 102 + Math.floor(this.cursor / 2) * 16;
    this.cursorMark.setPosition(x, y);
  }

  private choose(i: number) {
    if (this.busy) return;
    const cmd = this.cmdTexts[i].obj.getData("cmd") as Command;
    this.busy = true;
    if (cmd === this.def.weakness) {
      this.hp = 0;
      this.drawHp();
      this.logText.setText(this.def.resolved);
      this.cameras.main.flash(180, 220, 230, 255);
      this.tweens.add({ targets: this.enemy, alpha: 0, duration: 800 });
      if (this.def.reward.clarity)    this.save.stats.clarity    += this.def.reward.clarity;
      if (this.def.reward.compassion) this.save.stats.compassion += this.def.reward.compassion;
      if (this.def.reward.courage)    this.save.stats.courage    += this.def.reward.courage;
      writeSave(this.save);
      this.time.delayedCall(1500, () => { this.onDone(true); this.scene.stop(); });
    } else if (cmd === "release") {
      this.logText.setText("You release without seeing. The shape lingers, gentler.");
      this.tweens.add({ targets: this.enemy, alpha: 0.3, duration: 700 });
      this.time.delayedCall(1300, () => { this.onDone(false); this.scene.stop(); });
    } else {
      this.hp = Math.max(0, this.hp - 1);
      this.drawHp();
      this.logText.setText("Not quite. The shape ripples but does not soften.");
      this.cameras.main.shake(120, 0.004);
      this.busy = false;
      if (this.hp <= 0) {
        this.logText.setText("It dissolves anyway - you wore it out by trying.");
        this.busy = true;
        this.tweens.add({ targets: this.enemy, alpha: 0, duration: 700 });
        this.time.delayedCall(1300, () => { this.onDone(true); this.scene.stop(); });
      }
    }
  }

  private drawHp() {
    this.hpBar.clear();
    // Plate at top: 50px wide bar
    const x = 60, y = 12, w = 30, h = 3;
    this.hpBar.fillStyle(0x2a3550, 1); this.hpBar.fillRect(x, y, w, h);
    const pct = this.hp / this.def.hp;
    const color = pct > 0.6 ? 0x6ab84a : pct > 0.3 ? 0xe0c060 : 0xd84a4a;
    this.hpBar.fillStyle(color, 1); this.hpBar.fillRect(x, y, Math.ceil(w * pct), h);
  }
}
