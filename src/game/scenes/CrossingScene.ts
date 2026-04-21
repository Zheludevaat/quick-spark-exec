import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import {
  attachHUD,
  InputState,
  makeRowan,
  animateRowan,
  runDialog,
  setRowanTransition,
} from "./hud";
import { getAudio, SONG_CROSSING } from "../audio";
import { unlockLore, showLoreToast } from "./lore";
import { onActionDown } from "../controls";

type Whisper = {
  text: string;
  x: number; // current world x
  y: number; // spawn y (fixed)
  vx: number;
  obj: GBCText;
  alive: boolean;
  witnessed: boolean;
};

type RefusalDoor = {
  id: "kitchen" | "phone" | "window";
  x: number;
  y: number;
  rect: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Arc;
  used: boolean;
  loreId: string;
  lines: { who: string; text: string }[];
};

/**
 * The Crossing — corridor of detachment.
 *
 * Adds:
 *   - Whisper Gauntlet: intrusive thoughts drift across; B to WITNESS each (passes
 *     them through without harm; ignored = +clarity drip; collided = brief slow).
 *   - Three Refusal Doors: optional side-doors that show vignettes of returning
 *     to life. Reading all three sets flag refusals_witnessed.
 *   - Second Wanderer: silhouette walking the other way; one-line cameo.
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

  // Whisper gauntlet
  private whispers: Whisper[] = [];
  private whisperPool: string[] = [];
  private nextWhisperAt = 0;
  private slowUntil = 0;
  private witnessedCount = 0;
  private hint!: GBCText;
  private witnessHint!: GBCText;

  // Doors
  private doors: RefusalDoor[] = [];

  // Wanderer
  private wanderer?: Phaser.GameObjects.Container;
  private wandererSpoken = false;

  // Embodiment FX
  private rowanAura?: Phaser.GameObjects.Arc;
  private rowanShadow?: Phaser.GameObjects.Ellipse;

  constructor() {
    super("Crossing");
  }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.dim = 0;
    this.dialogActive = false;
    this.done = false;
    this.milestones = [false, false, false];
    this.whispers = [];
    this.witnessedCount = 0;
    this.slowUntil = 0;
    this.doors = [];
    this.wandererSpoken = false;
  }

  create() {
    this.cameras.main.setBackgroundColor("#080a12");
    this.cameras.main.fadeIn(700);
    getAudio().music.play("crossing", SONG_CROSSING);

    const g = this.add.graphics();
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const inset = Phaser.Math.Linear(0, 60, t);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x2a3550),
        Phaser.Display.Color.ValueToColor(0x080a12),
        8,
        i,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(inset, 14 + inset * 0.6, GBC_W - inset * 2, GBC_H - 28 - inset * 1.2);
    }
    for (let y = 30; y < GBC_H; y += 10) {
      const a = (1 - y / GBC_H) * 0.4 + 0.1;
      g.fillStyle(0x3a4868, a);
      g.fillRect(20, y, GBC_W - 40, 1);
    }
    spawnMotes(this, {
      count: 10,
      color: 0xdde6f5,
      alpha: 0.4,
      driftY: -0.006,
      driftX: 0.002,
      depth: 25,
    });

    this.rowanShadow = this.add.ellipse(GBC_W / 2, 30, 10, 3, 0x000000, 0.22).setDepth(2);
    this.rowan = makeRowan(this, GBC_W / 2, 24, "living");
    setRowanTransition(this.rowan, 0);

    this.rowanAura = this.add
      .circle(this.rowan.x, this.rowan.y - 4, 6, 0xdde6f5, 0.04)
      .setDepth(48);
    this.tweens.add({
      targets: this.rowanAura,
      scale: 1.8,
      alpha: 0.01,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.overlay = this.add
      .rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(190);

    attachHUD(this, () => this.save.stats);
    this.input2 = new InputState(this);

    // Refusal doors — side-recessed in the wall, at three depths.
    const doorDefs: {
      id: RefusalDoor["id"];
      y: number;
      side: "left" | "right";
      loreId: string;
      lines: { who: string; text: string }[];
    }[] = [
      {
        id: "kitchen",
        y: 50,
        side: "left",
        loreId: "refusal_kitchen",
        lines: [
          { who: "DOOR I", text: "Through the door: your kitchen. The kettle still whistling." },
          { who: "DOOR I", text: "Two cups on the counter. Your hand is on one of them." },
          { who: "DOOR I", text: "You can't remember which one is yours. It feels important." },
        ],
      },
      {
        id: "phone",
        y: 80,
        side: "right",
        loreId: "refusal_phone",
        lines: [
          { who: "DOOR II", text: "Through the door: a voicemail playing on a loop." },
          { who: "DOOR II", text: "Mara is saying your name like a question." },
          { who: "DOOR II", text: "You stand still and listen. Then again. Then again." },
        ],
      },
      {
        id: "window",
        y: 110,
        side: "left",
        loreId: "refusal_window",
        lines: [
          { who: "DOOR III", text: "Through the door: the window. The child has grown." },
          { who: "DOOR III", text: "Still waving. At no one now. Or at everyone." },
          { who: "DOOR III", text: "You can't tell from this side." },
        ],
      },
    ];
    for (const d of doorDefs) {
      const x = d.side === "left" ? 12 : GBC_W - 12;
      const rect = this.add.rectangle(x, d.y, 8, 14, 0x2a1810, 1).setDepth(3);
      this.add.rectangle(x, d.y, 9, 15, 0x584030, 0).setStrokeStyle(1, 0x584030).setDepth(3);
      const glow = this.add.circle(x, d.y, 5, 0xd89868, 0.25).setDepth(2);
      this.tweens.add({
        targets: glow,
        scale: 1.5,
        alpha: 0.05,
        duration: 1400,
        yoyo: true,
        repeat: -1,
      });
      const used = !!this.save.lore.includes(d.loreId);
      if (used) glow.setVisible(false);
      this.doors.push({ id: d.id, x, y: d.y, rect, glow, used, loreId: d.loreId, lines: d.lines });
    }

    // Wanderer — silhouette walking back toward life, appears around mid-corridor.
    const wanderer = this.add.container(GBC_W / 2 + 30, 130);
    const w = this.add.rectangle(0, 0, 6, 12, 0x000000, 0.85);
    const wh = this.add.circle(0, -7, 3, 0x000000, 0.85);
    wanderer.add([w, wh]);
    wanderer.setDepth(50);
    wanderer.setVisible(false);
    this.wanderer = wanderer;

    // Whisper pool — intrusive thoughts. Some genuinely funny.
    this.whisperPool = [
      "GO BACK",
      "THEY NEED YOU",
      "YOU'RE IMAGINING THIS",
      "YOU LEFT THE STOVE ON",
      "MARA WILL FORGET YOU",
      "THIS ISN'T REAL",
      "YOU SHOULD HAVE SAID IT",
      "TURN AROUND",
    ];
    this.nextWhisperAt = 1500;

    // Hints
    this.add
      .rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(199);
    this.hint = new GBCText(this, 4, GBC_H - 9, "WALK SOUTH", {
      color: COLOR.textDim,
      depth: 200,
      scrollFactor: 0,
    });
    this.witnessHint = new GBCText(this, 4, 14, "B/Q: WITNESS WHISPERS", {
      color: COLOR.textDim,
      depth: 200,
      scrollFactor: 0,
    });

    // Bind interact + witness
    this.events.on("vinput-action", () => this.tryDoor());
    onActionDown(this, "action", () => this.tryDoor());
    const witness = () => this.witnessNearestWhisper();
    this.events.on("vinput-cancel", witness);
    onActionDown(this, "cancel", witness);
  }

  update(t: number, dt: number) {
    if (this.dialogActive || this.done) return;
    const slowed = t < this.slowUntil;
    const baseSpeed = 0.035 * dt * (slowed ? 0.4 : 1);
    const i = this.input2.poll();
    let dx = 0,
      dy = 0;
    if (i.left) dx -= baseSpeed * 0.5;
    if (i.right) dx += baseSpeed * 0.5;
    if (i.up) dy -= baseSpeed * 0.4;
    if (i.down) dy += baseSpeed;
    this.rowan.x += dx;
    this.rowan.y += dy;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 32, GBC_W - 32);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, 24, GBC_H - 12);
    animateRowan(this.rowan, dx, dy);

    const progress = (this.rowan.y - 24) / (GBC_H - 36);
    this.dim = Phaser.Math.Linear(this.dim, progress * 0.6, 0.05);
    this.overlay.fillAlpha = this.dim;

    // Progressive embodiment shift — Rowan dissolves toward soul-form.
    const transition = Phaser.Math.Clamp(progress * 0.88, 0, 0.88);
    setRowanTransition(this.rowan, transition);

    if (this.rowanAura) {
      this.rowanAura.setPosition(this.rowan.x, this.rowan.y - 4);
      this.rowanAura.setAlpha(0.02 + progress * 0.12);
      this.rowanAura.setScale(1 + progress * 0.9);
    }
    if (this.rowanShadow) {
      this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);
      this.rowanShadow.setAlpha(0.22 - progress * 0.14);
      this.rowanShadow.setScale(1 - progress * 0.18, 1 - progress * 0.12);
    }

    // Milestone voices
    if (!this.milestones[0] && progress > 0.25)
      this.speak(0, [{ who: "?", text: "Do not be afraid. This is not punishment." }]);
    else if (!this.milestones[1] && progress > 0.55)
      this.speak(1, [{ who: "?", text: "It is only a doorway you have always walked toward." }]);
    else if (!this.milestones[2] && progress > 0.85)
      this.speak(2, [{ who: "?", text: "I will meet you on the other side. Keep walking." }]);

    // Whispers — spawn over time, drift sideways, collide with player.
    if (t > this.nextWhisperAt && this.whispers.length < 3 && progress < 0.95) {
      const text = Phaser.Utils.Array.GetRandom(this.whisperPool);
      const fromLeft = Math.random() < 0.5;
      const y = 36 + Math.random() * (GBC_H - 60);
      const obj = new GBCText(this, fromLeft ? -40 : GBC_W + 8, y, text, {
        color: COLOR.textLight,
        depth: 60,
      });
      obj.obj.setAlpha(0.85);
      const vx = (fromLeft ? 1 : -1) * (0.007 + Math.random() * 0.005);
      this.whispers.push({
        text,
        x: fromLeft ? -40 : GBC_W + 8,
        y,
        vx,
        obj,
        alive: true,
        witnessed: false,
      });
      this.nextWhisperAt = t + 1400 + Math.random() * 1400;
    }
    for (const w of this.whispers) {
      if (!w.alive) continue;
      w.x += w.vx * dt;
      w.obj.setPosition(w.x, w.y);
      const px = this.rowan.x,
        py = this.rowan.y;
      const dxw = w.x + 16 - px,
        dyw = w.y + 4 - py;
      if (!w.witnessed && dxw * dxw + dyw * dyw < 10 * 10) {
        // Collided — small slow penalty, brief cam shake
        w.alive = false;
        this.tweens.add({
          targets: w.obj.obj,
          alpha: 0,
          duration: 250,
          onComplete: () => w.obj.destroy(),
        });
        this.cameras.main.shake(120, 0.0025);
        getAudio().sfx("hit");
        this.slowUntil = t + 600;
      } else if (w.x > GBC_W + 40 || w.x < -60) {
        w.alive = false;
        // Off-screen without collision — passive +clarity drip
        if (!w.witnessed) {
          this.save.stats.clarity = Math.min(99, this.save.stats.clarity + 1);
          writeSave(this.save);
          this.events.emit("stats-changed");
        }
        w.obj.destroy();
      }
    }

    // Highlight nearest witnessable whisper for readability.
    let highlight: Whisper | null = null;
    let hd = Infinity;
    for (const w of this.whispers) {
      if (!w.alive || w.witnessed) continue;
      const dxh = w.x + 16 - this.rowan.x;
      const dyh = w.y + 4 - this.rowan.y;
      const d = dxh * dxh + dyh * dyh;
      if (d < hd) {
        hd = d;
        highlight = w;
      }
    }
    for (const w of this.whispers) {
      if (!w.alive || w.witnessed) continue;
      const on = w === highlight && hd <= 60 * 60;
      w.obj.setColor(on ? COLOR.textGold : COLOR.textLight);
      w.obj.obj.setAlpha(on ? 1 : 0.85);
    }

    this.whispers = this.whispers.filter((w) => w.alive);

    // Wanderer — appear around 50% progress, walk past Rowan, then disappear.
    if (this.wanderer && !this.wandererSpoken && progress > 0.5) {
      this.wanderer.setVisible(true);
      this.wanderer.y -= 0.04 * dt;
      const dyw = this.wanderer.y - this.rowan.y;
      const dxw = this.wanderer.x - this.rowan.x;
      if (Math.abs(dyw) < 8 && Math.abs(dxw) < 30) {
        this.wandererSpoken = true;
        this.dialogActive = true;
        runDialog(
          this,
          [
            { who: "WANDERER", text: "You're the second one today." },
            { who: "WANDERER", text: "(They do not clarify the first.)" },
          ],
          () => {
            this.dialogActive = false;
            if (unlockLore(this.save, "wanderer_brief")) showLoreToast(this, "wanderer_brief");
            this.tweens.add({
              targets: this.wanderer,
              alpha: 0,
              duration: 1200,
              onComplete: () => this.wanderer?.destroy(),
            });
          },
        );
      }
    }

    // Update hint (door proximity overrides whisper status)
    const nearDoor = this.nearestDoor();
    if (nearDoor && !nearDoor.used) {
      this.hint.setText(`A: ${nearDoor.id.toUpperCase()} DOOR`);
    } else {
      const lore = this.doorsRead();
      this.hint.setText(`WALK SOUTH  WHISPERS WITNESSED ${this.witnessedCount}  DOORS ${lore}/3`);
    }

    if (progress >= 0.99 && !this.done) {
      this.done = true;
      // If all 3 doors read, set the carry-through flag.
      if (this.doorsRead() === 3) {
        this.save.flags.refusals_witnessed = true;
      }
      this.save.scene = "SilverThreshold";
      writeSave(this.save);
      const a = getAudio();
      a.music.stop();
      a.sfx("open");
      this.cameras.main.fadeOut(900, 220, 230, 245);
      this.cameras.main.once("camerafadeoutcomplete", () =>
        this.scene.start("SilverThreshold", { save: this.save }),
      );
    }
  }

  private witnessNearestWhisper() {
    if (this.dialogActive) return;
    let best: Whisper | null = null;
    let bd = Infinity;
    for (const w of this.whispers) {
      if (!w.alive || w.witnessed) continue;
      const dx = w.x + 16 - this.rowan.x,
        dy = w.y + 4 - this.rowan.y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = w;
      }
    }
    if (!best || bd > 60 * 60) {
      getAudio().sfx("miss");
      return;
    }
    best.witnessed = true;
    best.alive = false;
    this.witnessedCount++;
    this.save.stats.clarity = Math.min(99, this.save.stats.clarity + 1);
    writeSave(this.save);
    this.events.emit("stats-changed");
    getAudio().sfx("confirm");
    // Visual: flash + drift up + fade
    this.tweens.add({
      targets: best.obj.obj,
      alpha: 0,
      y: best.y - 12,
      duration: 700,
      onComplete: () => {
        best!.obj.destroy();
      },
    });
  }

  private nearestDoor(): RefusalDoor | null {
    let best: RefusalDoor | null = null;
    let bd = Infinity;
    for (const d of this.doors) {
      const dx = d.x - this.rowan.x,
        dy = d.y - this.rowan.y;
      const dist = dx * dx + dy * dy;
      if (dist < bd) {
        bd = dist;
        best = d;
      }
    }
    return bd < 12 * 12 ? best : null;
  }

  private doorsRead(): number {
    return this.doors.filter((d) => d.used || this.save.lore.includes(d.loreId)).length;
  }

  private tryDoor() {
    if (this.dialogActive) return;
    const d = this.nearestDoor();
    if (!d || d.used) return;
    d.used = true;
    d.glow.setVisible(false);
    this.dialogActive = true;
    if (unlockLore(this.save, d.loreId)) showLoreToast(this, d.loreId);
    runDialog(this, d.lines, () => {
      this.dialogActive = false;
    });
  }

  private speak(idx: number, lines: { who: string; text: string }[]) {
    this.milestones[idx] = true;
    this.dialogActive = true;
    runDialog(this, lines, () => {
      this.dialogActive = false;
    });
  }
}
