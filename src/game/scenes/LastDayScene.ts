import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot, Calling } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan, runDialog } from "./hud";
import { runInquiry } from "../inquiry";
import { getAudio, SONG_LASTDAY } from "../audio";
import { runRhythmTap } from "./minigames/rhythmTap";
import { unlockLore, showLoreToast } from "./lore";
import { onActionDown, onDirection } from "../controls";
import { activateQuest, completeQuest, questStatus } from "../sideQuests";

type ItemKind = "phone" | "window" | "kettle" | "coat" | "mirror" | "postcard" | "book" | "breath";

const MAIN_SEEDS_REQUIRED = 3;

type Interactable = {
  kind: ItemKind;
  x: number;
  y: number;
  seed: string | null; // null = lore-only or non-seed item
  label: string;
  used: boolean;
  marker?: Phaser.GameObjects.Arc;
  visual?: Phaser.GameObjects.GameObject[];
};

export class LastDayScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private input2!: InputState;
  private hint!: GBCText;
  private items: Interactable[] = [];
  private dialogActive = false;
  private miniActive = false;
  private exitOpen = false;
  private deathBeatActive = false;

  // Hidden breath seed: track time spent stationary
  private stillMs = 0;
  private breathPulse?: Phaser.GameObjects.Arc;

  constructor() {
    super("LastDay");
  }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.items = [];
    this.dialogActive = false;
    this.miniActive = false;
    this.exitOpen = false;
    this.deathBeatActive = false;
    this.stillMs = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor("#10131c");
    this.cameras.main.fadeIn(500);
    getAudio().music.play("lastday", SONG_LASTDAY);

    const g = this.add.graphics();
    g.fillStyle(0x2a221a, 1);
    g.fillRect(0, 24, GBC_W, GBC_H - 24);
    for (let y = 32; y < GBC_H; y += 12) {
      g.fillStyle(0x3a2c20, 1);
      g.fillRect(0, y, GBC_W, 1);
    }
    g.fillStyle(0x1a1410, 1);
    g.fillRect(0, 12, GBC_W, 12);
    g.fillStyle(0x2a2018, 1);
    g.fillRect(0, 22, GBC_W, 2);

    // Window
    const winX = 22,
      winY = 14;
    g.fillStyle(0x4a5878, 1);
    g.fillRect(winX, winY, 22, 16);
    g.fillStyle(0x88a8c8, 1);
    g.fillRect(winX + 1, winY + 1, 20, 14);
    g.fillStyle(0xc8d8e8, 0.7);
    g.fillRect(winX + 1, winY + 1, 20, 6);
    g.fillStyle(0x1a1410, 1);
    g.fillRect(winX + 10, winY, 2, 16);
    g.fillStyle(0x1a1410, 1);
    g.fillRect(winX, winY + 7, 22, 2);

    // Counter + kettle
    g.fillStyle(0x3a3028, 1);
    g.fillRect(110, 30, 50, 14);
    g.fillStyle(0x4a3a30, 1);
    g.fillRect(110, 30, 50, 2);
    const kettleX = 134,
      kettleY = 32;
    g.fillStyle(0x404858, 1);
    g.fillRect(kettleX, kettleY, 10, 10);
    g.fillStyle(0x586878, 1);
    g.fillRect(kettleX + 1, kettleY + 1, 8, 4);
    g.fillStyle(0x202830, 1);
    g.fillRect(kettleX + 4, kettleY - 2, 2, 2);
    const steam: Phaser.GameObjects.Arc[] = [];
    for (let s = 0; s < 3; s++) {
      const p = this.add.circle(kettleX + 2 + s * 2, kettleY - 4, 1, 0xdde6f5, 0.7).setDepth(10);
      this.tweens.add({
        targets: p,
        y: kettleY - 14,
        alpha: 0,
        duration: 1600,
        repeat: -1,
        delay: s * 400,
      });
      steam.push(p);
    }

    // Phone
    const phX = 50,
      phY = 60;
    g.fillStyle(0x3a3028, 1);
    g.fillRect(phX - 6, phY, 16, 12);
    g.fillStyle(0x1a1818, 1);
    g.fillRect(phX - 3, phY - 6, 8, 10);
    g.fillStyle(0x88c0f0, 1);
    g.fillRect(phX - 2, phY - 5, 6, 8);
    const phoneRing = this.add.circle(phX + 1, phY - 1, 4, 0x88c0f0, 0.4).setDepth(10);
    this.tweens.add({
      targets: phoneRing,
      scale: 2,
      alpha: 0,
      duration: 1400,
      yoyo: false,
      repeat: -1,
    });

    // Coat
    const coatX = 80,
      coatY = GBC_H - 36;
    g.fillStyle(0x1a1410, 1);
    g.fillRect(coatX - 8, coatY - 4, 24, 4);
    g.fillStyle(0x4a2820, 1);
    g.fillRect(coatX - 4, coatY, 8, 14);
    g.fillStyle(0x2a1810, 1);
    g.fillRect(coatX - 5, coatY + 6, 10, 2);
    g.fillStyle(0x683828, 1);
    g.fillRect(coatX - 3, coatY, 6, 4);

    // Mirror — small, near door
    const mirX = 110,
      mirY = 64;
    g.fillStyle(0x1a1818, 1);
    g.fillRect(mirX - 4, mirY - 5, 9, 10);
    g.fillStyle(0x88a0c8, 0.7);
    g.fillRect(mirX - 3, mirY - 4, 7, 8);
    g.fillStyle(0xc8d8e8, 0.5);
    g.fillRect(mirX - 3, mirY - 4, 7, 3);

    // Postcard on the desk (small, easy to miss)
    const pcX = 122,
      pcY = 42;
    g.fillStyle(0xe0d8c0, 1);
    g.fillRect(pcX - 3, pcY - 2, 7, 4);
    g.fillStyle(0x88a0c8, 1);
    g.fillRect(pcX - 2, pcY - 1, 3, 2);

    // Book on the floor by the coat
    const bkX = 96,
      bkY = GBC_H - 22;
    g.fillStyle(0x4a2820, 1);
    g.fillRect(bkX - 3, bkY - 1, 7, 3);
    g.fillStyle(0xe0d8c0, 1);
    g.fillRect(bkX - 3, bkY + 1, 7, 1);

    // Door
    const doorX = 76,
      doorY = GBC_H - 12;
    const door = this.add.rectangle(doorX + 4, doorY + 4, 12, 16, 0x2a1810, 1).setDepth(2);
    this.add
      .rectangle(doorX + 4, doorY + 4, 12, 16, 0x584030, 0)
      .setStrokeStyle(1, 0x584030)
      .setDepth(2);
    void door;

    spawnMotes(this, {
      count: 14,
      color: 0xdde6f5,
      alpha: 0.35,
      driftY: 0.004,
      driftX: 0.006,
      depth: 25,
    });

    const mark = (x: number, y: number, color: number, radius = 6, alpha = 0.18) => {
      const a = this.add.circle(x, y, radius, color, alpha).setDepth(9);
      this.tweens.add({
        targets: a,
        scale: 1.4,
        alpha: alpha * 0.3,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      return a;
    };

    this.items = [
      {
        kind: "phone",
        x: phX + 1,
        y: phY,
        seed: "seed_call",
        label: "PHONE",
        used: false,
        marker: mark(phX + 1, phY, 0x88c0f0),
        visual: [phoneRing],
      },
      {
        kind: "window",
        x: winX + 11,
        y: winY + 8,
        seed: "seed_window",
        label: "WINDOW",
        used: false,
        marker: mark(winX + 11, winY + 8, 0xc8d8e8),
        visual: steam,
      },
      {
        kind: "kettle",
        x: kettleX + 5,
        y: kettleY + 5,
        seed: "seed_kettle",
        label: "KETTLE",
        used: false,
        marker: mark(kettleX + 5, kettleY + 5, 0xdde6f5),
      },
      {
        kind: "coat",
        x: coatX,
        y: coatY + 6,
        seed: "seed_coat",
        label: "COAT",
        used: false,
        marker: mark(coatX, coatY + 6, 0xd89868),
      },
      {
        kind: "mirror",
        x: mirX,
        y: mirY,
        seed: "seed_mirror",
        label: "MIRROR",
        used: false,
        marker: mark(mirX, mirY, 0xa8c8e8, 4, 0.12),
      },
      // Lore-only items (no main-seed gate)
      {
        kind: "postcard",
        x: pcX,
        y: pcY,
        seed: null,
        label: "POSTCARD",
        used: false,
        marker: mark(pcX, pcY, 0xe0d8c0, 3, 0.1),
      },
      {
        kind: "book",
        x: bkX,
        y: bkY,
        seed: null,
        label: "BOOK",
        used: false,
        marker: mark(bkX, bkY, 0xe0d8c0, 3, 0.1),
      },
    ];

    for (const it of this.items) {
      if (it.seed && this.save.seeds[it.seed]) {
        it.used = true;
        if (it.marker) it.marker.setVisible(false);
      }
      if (it.kind === "postcard" && this.save.lore.includes("postcard_seaside")) {
        it.used = true;
        if (it.marker) it.marker.setVisible(false);
      }
      if (it.kind === "book" && this.save.lore.includes("margin_plotinus")) {
        it.used = true;
        if (it.marker) it.marker.setVisible(false);
      }
    }

    this.rowanShadow = this.add.ellipse(80, 88, 10, 3, 0x000000, 0.4).setDepth(2);
    this.rowan = makeRowan(this, 80, 82, "living");

    attachHUD(this, () => this.save.stats);
    this.input2 = new InputState(this);

    this.add.rectangle(0, 13, GBC_W, 9, 0x0a0e1a, 0.85).setOrigin(0, 0).setDepth(199);
    new GBCText(this, 4, 14, "TUESDAY  8:14 AM", { color: COLOR.textAccent, depth: 200 });

    this.add
      .rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(199);
    this.hint = new GBCText(this, 4, GBC_H - 9, "WALK. PRESS A NEAR THINGS.", {
      color: COLOR.textDim,
      depth: 200,
      scrollFactor: 0,
    });

    this.events.on("vinput-action", () => this.tryInteract());
    onActionDown(this, "action", () => this.tryInteract());

    const usedAtLoad = this.items.filter(
      (t) => t.seed && t.seed !== "seed_mirror" && t.used,
    ).length;
    if (usedAtLoad >= MAIN_SEEDS_REQUIRED) this.exitOpen = true;

    if (!this.save.flags.lastday_intro) {
      this.save.flags.lastday_intro = true;
      writeSave(this.save);
      this.dialogActive = true;
      this.time.delayedCall(700, () =>
        runDialog(
          this,
          [
            { who: "?", text: "Tuesday. The light is doing its small work." },
            { who: "?", text: "You have things to do today. You always have things to do." },
            { who: "?", text: "Touch what calls you. There is no rush. There will be no later." },
            { who: "?", text: "(Press L any time to open your Lore Log.)" },
          ],
          () => {
            // METAXY: Calling chooser. Asked once; persists on save.calling.
            if (this.save.calling) {
              this.dialogActive = false;
              return;
            }
            runInquiry(
              this,
              {
                who: "?",
                text: "Before today began, what called you most? (Choose how Rowan walked through her life.)",
              },
              [
                {
                  choice: "ask",
                  label: "To know things deeply.",
                  reply: "A scholar's pull. Quiet rooms, long sentences.",
                },
                {
                  choice: "ask",
                  label: "To care for someone.",
                  reply: "A caregiver's pull. Tea kept warm for a hand that may not come.",
                },
                {
                  choice: "ask",
                  label: "To change what was wrong.",
                  reply: "A reformer's pull. The shape of the world refused to settle.",
                },
              ],
              (picked) => {
                const map: Record<string, Calling> = {
                  "To know things deeply.": "scholar",
                  "To care for someone.": "caregiver",
                  "To change what was wrong.": "reformer",
                };
                this.save.calling = map[picked.label] ?? "scholar";
                writeSave(this.save);
                this.dialogActive = false;
              },
            );
          },
        ),
      );
    }
  }

  update(_t: number, dt: number) {
    if (this.dialogActive || this.miniActive) return;
    const speed = 0.04 * dt;
    const i = this.input2.poll();
    let dx = 0,
      dy = 0;
    if (i.left) dx -= speed;
    if (i.right) dx += speed;
    if (i.up) dy -= speed;
    if (i.down) dy += speed;
    this.rowan.x += dx;
    this.rowan.y += dy;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 8, GBC_W - 8);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, 32, GBC_H - 12);
    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);

    // Hidden seed_breath: stand still 4s anywhere → faint pulse + auto-grant
    if (!this.save.seeds.seed_breath) {
      const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
      if (moving) {
        this.stillMs = 0;
        if (this.breathPulse) {
          this.breathPulse.destroy();
          this.breathPulse = undefined;
        }
      } else {
        this.stillMs += dt;
        if (this.stillMs > 1500 && !this.breathPulse) {
          this.breathPulse = this.add
            .circle(this.rowan.x, this.rowan.y - 4, 4, 0xa8c8e8, 0.3)
            .setDepth(40);
          this.tweens.add({
            targets: this.breathPulse,
            scale: 2.5,
            alpha: 0.05,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });
        }
        if (this.breathPulse) {
          this.breathPulse.x = this.rowan.x;
          this.breathPulse.y = this.rowan.y - 4;
        }
        if (this.stillMs > 4000) {
          this.save.seeds.seed_breath = true;
          writeSave(this.save);
          getAudio().sfx("confirm");
          if (this.breathPulse) {
            this.tweens.add({
              targets: this.breathPulse,
              scale: 5,
              alpha: 0,
              duration: 700,
              onComplete: () => {
                this.breathPulse?.destroy();
                this.breathPulse = undefined;
              },
            });
          }
          const t = new GBCText(this, this.rowan.x - 18, this.rowan.y - 18, "+ BREATH", {
            color: COLOR.textGold,
            depth: 220,
          });
          this.tweens.add({
            targets: t.obj,
            alpha: 0,
            y: this.rowan.y - 32,
            duration: 1600,
            onComplete: () => t.destroy(),
          });
        }
      }
    }

    const near = this.nearest();
    const usedMain = this.items.filter((t) => t.seed && t.seed !== "seed_mirror" && t.used).length;
    if (this.exitOpen) {
      const dxg = this.rowan.x - 80,
        dyg = this.rowan.y - (GBC_H - 8);
      if (dxg * dxg + dyg * dyg < 14 * 14) this.hint.setText("A: STEP THROUGH THE DOOR");
      else this.hint.setText("THE DOOR IS OPEN. (SOUTH)");
    } else if (near && !near.used) {
      this.hint.setText(`A: ${near.label}`);
    } else {
      this.hint.setText(
        `TOUCH WHAT CALLS YOU  ${Math.min(usedMain, MAIN_SEEDS_REQUIRED)}/${MAIN_SEEDS_REQUIRED} NEEDED`,
      );
    }

    if (!this.exitOpen && usedMain >= MAIN_SEEDS_REQUIRED) {
      this.exitOpen = true;
      this.beginDeathBeat();
    }
  }

  private beginDeathBeat() {
    if (this.deathBeatActive) return;
    this.deathBeatActive = true;
    this.dialogActive = true;

    this.playChestPain();
    this.time.delayedCall(350, () => this.playChestPain());
    this.time.delayedCall(760, () => this.playChestPain());

    const veil = this.add
      .rectangle(0, 0, GBC_W, GBC_H, 0x10131c, 0)
      .setOrigin(0, 0)
      .setDepth(194);
    this.tweens.add({
      targets: veil,
      alpha: 0.26,
      duration: 220,
      yoyo: true,
      repeat: 2,
    });

    this.hint.setText("SOMETHING IS WRONG.");

    this.time.delayedCall(950, () => {
      runDialog(
        this,
        [
          { who: "?", text: "There it is again." },
          { who: "?", text: "As if the room has stepped one inch away from you." },
          { who: "?", text: "The door is open." },
        ],
        () => {
          this.hint.setText("THE DOOR IS OPEN. (SOUTH)");
          this.dialogActive = false;
          this.deathBeatActive = false;
          veil.destroy();
        },
      );
    });
  }

  private playChestPain() {
    const pulse = this.add.circle(this.rowan.x, this.rowan.y - 4, 4, 0xd84a4a, 0.45).setDepth(40);
    this.tweens.add({
      targets: pulse,
      scale: 4,
      alpha: 0,
      duration: 1200,
      ease: "Sine.out",
      onComplete: () => pulse.destroy(),
    });
    this.cameras.main.shake(180, 0.0035);
    getAudio().sfx("boss");
    const vig = this.add.rectangle(0, 0, GBC_W, GBC_H, 0x501818, 0.0).setOrigin(0, 0).setDepth(195);
    this.tweens.add({
      targets: vig,
      alpha: 0.35,
      duration: 300,
      yoyo: true,
      onComplete: () => vig.destroy(),
    });
  }

  private nearest(): Interactable | null {
    let best: Interactable | null = null;
    let bd = Infinity;
    for (const it of this.items) {
      if (it.used) continue;
      const dx = this.rowan.x - it.x,
        dy = this.rowan.y - it.y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return bd < 14 * 14 ? best : null;
  }

  private tryInteract() {
    if (this.dialogActive || this.miniActive) return;
    if (this.exitOpen) {
      const dxg = this.rowan.x - 80,
        dyg = this.rowan.y - (GBC_H - 8);
      if (dxg * dxg + dyg * dyg < 14 * 14) {
        this.save.scene = "Crossing";
        writeSave(this.save);
        const a = getAudio();
        a.sfx("wipe");
        a.music.stop();
        this.cameras.main.fadeOut(700, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () =>
          this.scene.start("Crossing", { save: this.save }),
        );
        return;
      }
    }
    const it = this.nearest();
    if (!it || it.used) return;
    this.runItem(it);
  }

  // ============================================================================
  // Per-item interactions
  // ============================================================================
  private commitSeed(it: Interactable) {
    it.used = true;
    if (it.seed) this.save.seeds[it.seed] = true;
    writeSave(this.save);
    if (it.marker) it.marker.setVisible(false);
    // Side quest: find every visible seed in the flat
    if (questStatus(this.save, "all_seeds_lastday") !== "done") {
      activateQuest(this, this.save, "all_seeds_lastday");
      const required = ["seed_call", "seed_window", "seed_kettle", "seed_coat", "seed_mirror"];
      if (required.every((s) => this.save.seeds[s])) {
        completeQuest(this, this.save, "all_seeds_lastday");
      }
    }
  }

  private runItem(it: Interactable) {
    switch (it.kind) {
      case "phone":
        return this.itemPhone(it);
      case "window":
        return this.itemWindow(it);
      case "kettle":
        return this.itemKettle(it);
      case "coat":
        return this.itemCoat(it);
      case "mirror":
        return this.itemMirror(it);
      case "postcard":
        return this.itemPostcard(it);
      case "book":
        return this.itemBook(it);
      case "breath":
        return; // handled passively
    }
  }

  private itemPhone(it: Interactable) {
    this.miniActive = true;
    runDialog(
      this,
      [
        { who: "?", text: "The phone glows. Caller ID reads MARA." },
        { who: "?", text: "Tap A on each ring. Or don't." },
      ],
      () => {
        runRhythmTap(this, { title: "PICK UP?", beats: [600, 1300, 2000] }, (r) => {
          const lines: { who: string; text: string }[] = [];
          if (r.judgment === "great") {
            lines.push({ who: "?", text: "You answer on the third ring. Mara sounds relieved." });
            lines.push({ who: "?", text: "She says she dreamt of you. You almost tell her." });
            this.save.flags.phone_answered = true;
          } else if (r.judgment === "ok") {
            lines.push({ who: "?", text: "You fumble for the receiver. By the time you lift it," });
            lines.push({ who: "?", text: "the call has gone to silence. You set it down." });
          } else {
            lines.push({ who: "?", text: "You let it ring. You'll call back tomorrow." });
            lines.push({ who: "?", text: "You always say tomorrow." });
            this.save.flags.phone_ignored = true;
          }
          this.commitSeed(it);
          runDialog(this, lines, () => {
            this.miniActive = false;
          });
        });
      },
    );
  }

  private itemWindow(it: Interactable) {
    this.miniActive = true;
    // Hold UP to wave. Sample input over ~2s and grade.
    const prompt = new GBCText(this, GBC_W / 2 - 36, 38, "HOLD UP TO WAVE", {
      color: COLOR.textAccent,
      depth: 220,
      scrollFactor: 0,
    });
    const bar = this.add
      .rectangle(GBC_W / 2 - 24, 50, 48, 3, 0x3a4868, 1)
      .setOrigin(0, 0.5)
      .setDepth(220)
      .setScrollFactor(0);
    const fill = this.add
      .rectangle(GBC_W / 2 - 24, 50, 0, 3, 0xc8d8e8, 1)
      .setOrigin(0, 0.5)
      .setDepth(221)
      .setScrollFactor(0);
    let held = 0;
    const total = 2000;
    const timer = this.time.addEvent({
      delay: 50,
      repeat: total / 50,
      callback: () => {
        const i = this.input2.poll();
        if (i.up) held += 50;
        fill.width = (held / total) * 48;
      },
    });
    this.time.delayedCall(total + 100, () => {
      timer.remove(false);
      prompt.destroy();
      bar.destroy();
      fill.destroy();
      const ratio = held / total;
      const lines: { who: string; text: string }[] = [];
      if (ratio > 0.7) {
        lines.push({ who: "?", text: "You wave back. The child's face splits open with a grin." });
        lines.push({ who: "?", text: "You feel ridiculous. Then warm. Then ridiculous again." });
        this.save.flags.window_waved = true;
      } else if (ratio > 0.2) {
        lines.push({ who: "?", text: "You half-lift a hand. The child has already turned away." });
      } else {
        lines.push({ who: "?", text: "You almost wave back. You don't." });
        lines.push({ who: "?", text: "The glass between you feels suddenly thin." });
      }
      this.commitSeed(it);
      runDialog(this, lines, () => {
        this.miniActive = false;
      });
    });
  }

  private itemKettle(it: Interactable) {
    this.miniActive = true;
    // Pour rhythm: 3 quick beats to "fill cup one", a beat of pause, 3 beats for cup two.
    runDialog(
      this,
      [
        { who: "?", text: "The kettle has whistled itself thin." },
        { who: "?", text: "Pour cleanly. (A on each beat.)" },
      ],
      () => {
        runRhythmTap(this, { title: "POUR", beats: [400, 900, 1400, 2200, 2700, 3200] }, (r) => {
          const lines: { who: string; text: string }[] = [];
          if (r.hits === r.total) {
            lines.push({ who: "?", text: "Two cups. Even pours. You always pour two." });
            lines.push({ who: "?", text: "You don't remember when that started." });
          } else if (r.judgment === "ok") {
            lines.push({ who: "?", text: "One cup overfills. You wipe the counter." });
            lines.push({ who: "?", text: "Two cups. Always two." });
          } else {
            lines.push({ who: "?", text: "You scald your wrist. Curse softly." });
            lines.push({ who: "?", text: "You pour one cup this time. Just one." });
            this.save.flags.kettle_one_cup = true;
          }
          this.commitSeed(it);
          runDialog(this, lines, () => {
            this.miniActive = false;
          });
        });
      },
    );
  }

  private itemCoat(it: Interactable) {
    this.miniActive = true;
    runDialog(
      this,
      [
        { who: "?", text: "Your coat by the door. Pockets full of small unfinished things." },
        { who: "?", text: "Fold it: ↓ ← ↓" },
      ],
      () => {
        const seq = ["down", "left", "down"];
        let step = 0;
        let finished = false;
        const promptT = new GBCText(this, GBC_W / 2 - 28, 38, `STEP 1: ↓`, {
          color: COLOR.textAccent,
          depth: 220,
          scrollFactor: 0,
        });
        const symbol = (s: string) =>
          s === "down" ? "↓" : s === "left" ? "←" : s === "right" ? "→" : "↑";

        let unbindDir: (() => void) | null = null;
        const cleanup = () => {
          this.events.off("vinput-down", onDir);
          unbindDir?.();
        };

        const advance = () => {
          step++;
          if (step >= seq.length) {
            finished = true;
            cleanup();
            promptT.destroy();
            this.commitSeed(it);
            runDialog(
              this,
              [
                {
                  who: "?",
                  text: "Receipts. A folded letter. A key to a door that isn't this one.",
                },
                { who: "?", text: "You hang it. It looks like it belongs to someone else." },
              ],
              () => {
                this.miniActive = false;
              },
            );
            return;
          }
          promptT.setText(`STEP ${step + 1}: ${symbol(seq[step])}`);
          getAudio().sfx("confirm");
        };
        const onDir = (d: string) => {
          if (finished) return;
          if (d === seq[step]) advance();
          else getAudio().sfx("miss");
        };
        this.events.on("vinput-down", onDir);
        unbindDir = onDirection(this, onDir);

        this.time.delayedCall(15000, () => {
          if (finished) return;
          finished = true;
          cleanup();
          promptT.destroy();
          this.commitSeed(it);
          runDialog(this, [{ who: "?", text: "You give up folding. You let it slump." }], () => {
            this.miniActive = false;
          });
        });
      },
    );
  }

  private itemMirror(it: Interactable) {
    this.miniActive = true;
    this.commitSeed(it);
    runDialog(
      this,
      [
        { who: "?", text: "You look tired." },
        { who: "?", text: "You look like someone who hasn't been seen in a while." },
        { who: "?", text: "You hold your own gaze longer than usual. Then you turn away." },
      ],
      () => {
        this.miniActive = false;
      },
    );
  }

  private itemPostcard(it: Interactable) {
    this.miniActive = true;
    it.used = true;
    if (it.marker) it.marker.setVisible(false);
    if (unlockLore(this.save, "postcard_seaside")) showLoreToast(this, "postcard_seaside");
    runDialog(
      this,
      [
        { who: "POSTCARD", text: "WISH YOU WERE HERE." },
        {
          who: "POSTCARD",
          text: "ACTUALLY I DON'T. THE GULLS ARE LOUD AND I'VE STARTED TALKING TO THEM. — D.",
        },
      ],
      () => {
        this.miniActive = false;
      },
    );
  }

  private itemBook(it: Interactable) {
    this.miniActive = true;
    it.used = true;
    if (it.marker) it.marker.setVisible(false);
    if (unlockLore(this.save, "margin_plotinus")) showLoreToast(this, "margin_plotinus");
    runDialog(
      this,
      [
        { who: "BOOK", text: '"WITHDRAW INTO YOURSELF AND LOOK."' },
        { who: "MARGIN", text: 'Someone has circled it in pencil and written: "OK BUT WHEN."' },
      ],
      () => {
        this.miniActive = false;
      },
    );
  }
}
