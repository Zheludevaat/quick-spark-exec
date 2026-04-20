import Phaser from "phaser";
import { PAL, pixelText, VIEW_W, VIEW_H, drawDialogBox } from "../shared";
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
    name: "A Reflection",
    kind: "reflection",
    weakness: "observe",
    hp: 3,
    taunt: "It mimes your every move with a smug little smile.",
    resolved: "Seen plainly, the mimicry collapses into a soft hum.",
    reward: { clarity: 1 },
  },
  echo: {
    name: "An Echo Double",
    kind: "echo",
    weakness: "address",
    hp: 3,
    taunt: "It repeats a thing you wish you had not said.",
    resolved: "You name what you meant. The echo finally answers, kindly.",
    reward: { compassion: 1 },
  },
  glitter: {
    name: "Memory Glitter",
    kind: "glitter",
    weakness: "remember",
    hp: 3,
    taunt: "Bright shards of an unfinished afternoon swirl around you.",
    resolved: "You remember the whole afternoon, not just its sharpest corner.",
    reward: { courage: 1 },
  },
};

export class EncounterScene extends Phaser.Scene {
  private save!: SaveSlot;
  private def!: EnemyDef;
  private hp = 3;
  private onDone!: (won: boolean) => void;
  private cmdText: Phaser.GameObjects.Text[] = [];
  private logText!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Graphics;
  private cursor = 0;
  private busy = false;

  constructor() { super("Encounter"); }
  init(data: { save: SaveSlot; kind: EnemyKind; onDone: (won: boolean) => void }) {
    this.save = data.save;
    this.def = ENEMIES[data.kind];
    this.hp = this.def.hp;
    this.onDone = data.onDone;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x06090f);

    // backdrop
    this.add.image(VIEW_W / 2, 70, "moon_overlays_sigils").setDisplaySize(VIEW_W, 130).setAlpha(0.35);

    // enemy "portrait"
    const ec = this.add.container(VIEW_W / 2, 70);
    const ring = this.add.circle(0, 0, 30, this.colorFor(), 0.18).setStrokeStyle(1, this.colorFor(), 0.8);
    const body = this.add.rectangle(0, 6, 18, 22, this.colorFor(), 0.85).setStrokeStyle(1, PAL.silverLight);
    const head = this.add.rectangle(0, -8, 14, 12, PAL.pearl).setStrokeStyle(1, PAL.silverDark);
    ec.add([ring, body, head]);
    this.tweens.add({ targets: ring, scale: 1.2, alpha: 0.35, duration: 1200, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: ec, y: 66, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    // name + HP
    pixelText(this, VIEW_W / 2 - 40, 14, this.def.name, 9, "#eef3ff");
    this.hpBar = this.add.graphics();
    this.drawHp();

    // command panel
    drawDialogBox(this, 8, 130, VIEW_W - 16, 100);
    pixelText(this, 18, 138, "What do you do?", 8, "#8ec8e8");

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

    this.logText = pixelText(this, 18, 200, this.def.taunt, 8, "#c8d4e8").setWordWrapWidth(VIEW_W - 36);

    // input
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

  private colorFor() {
    return this.def.kind === "reflection" ? PAL.silverLight
         : this.def.kind === "echo"       ? PAL.moonBlue
         : PAL.sigil;
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
    const cmd = this.cmdText[i].getData("cmd") as Command;
    this.busy = true;
    if (cmd === this.def.weakness) {
      this.hp = 0;
      this.drawHp();
      this.logText.setText(this.def.resolved);
      // grant rewards
      if (this.def.reward.clarity) this.save.stats.clarity += this.def.reward.clarity;
      if (this.def.reward.compassion) this.save.stats.compassion += this.def.reward.compassion;
      if (this.def.reward.courage) this.save.stats.courage += this.def.reward.courage;
      writeSave(this.save);
      this.time.delayedCall(1400, () => {
        this.onDone(true);
        this.scene.stop();
      });
    } else if (cmd === "release") {
      this.logText.setText("You release without seeing. The shape lingers, gentler.");
      this.time.delayedCall(1100, () => {
        this.onDone(false);
        this.scene.stop();
      });
    } else {
      this.hp = Math.max(0, this.hp - 1);
      this.drawHp();
      this.logText.setText("Not quite. The shape ripples but does not soften.");
      this.busy = false;
      if (this.hp <= 0) {
        this.logText.setText("It dissolves anyway — you wore it out by trying.");
        this.busy = true;
        this.time.delayedCall(1200, () => { this.onDone(true); this.scene.stop(); });
      }
    }
  }

  private drawHp() {
    this.hpBar.clear();
    this.hpBar.fillStyle(PAL.silverDark, 1);
    this.hpBar.fillRect(VIEW_W - 60, 16, 50, 4);
    this.hpBar.fillStyle(this.colorFor(), 1);
    this.hpBar.fillRect(VIEW_W - 60, 16, 50 * (this.hp / this.def.hp), 4);
  }
}
