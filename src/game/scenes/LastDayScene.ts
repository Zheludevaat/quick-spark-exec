import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan, runDialog } from "./hud";
import { getAudio, SONG_LASTDAY } from "../audio";

type Interactable = {
  x: number; y: number; w: number; h: number;
  seed: string;
  label: string;
  lines: { who: string; text: string }[];
  used: boolean;
  visual: Phaser.GameObjects.GameObject[];
  marker?: Phaser.GameObjects.Arc;
};

export class LastDayScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private input2!: InputState;
  private hint!: GBCText;
  private items: Interactable[] = [];
  private dialogActive = false;
  private exitOpen = false;

  constructor() { super("LastDay"); }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.items = [];
    this.dialogActive = false;
    this.exitOpen = false;
  }

  create() {
    this.cameras.main.setBackgroundColor("#10131c");
    this.cameras.main.fadeIn(500);
    getAudio().music.play("lastday", SONG_LASTDAY);

    const g = this.add.graphics();
    g.fillStyle(0x2a221a, 1); g.fillRect(0, 24, GBC_W, GBC_H - 24);
    for (let y = 32; y < GBC_H; y += 12) {
      g.fillStyle(0x3a2c20, 1); g.fillRect(0, y, GBC_W, 1);
    }
    g.fillStyle(0x1a1410, 1); g.fillRect(0, 12, GBC_W, 12);
    g.fillStyle(0x2a2018, 1); g.fillRect(0, 22, GBC_W, 2);

    const winX = 22, winY = 14;
    g.fillStyle(0x4a5878, 1); g.fillRect(winX, winY, 22, 16);
    g.fillStyle(0x88a8c8, 1); g.fillRect(winX + 1, winY + 1, 20, 14);
    g.fillStyle(0xc8d8e8, 0.7); g.fillRect(winX + 1, winY + 1, 20, 6);
    g.fillStyle(0x1a1410, 1); g.fillRect(winX + 10, winY, 2, 16);
    g.fillStyle(0x1a1410, 1); g.fillRect(winX, winY + 7, 22, 2);

    g.fillStyle(0x3a3028, 1); g.fillRect(110, 30, 50, 14);
    g.fillStyle(0x4a3a30, 1); g.fillRect(110, 30, 50, 2);
    const kettleX = 134, kettleY = 32;
    g.fillStyle(0x404858, 1); g.fillRect(kettleX, kettleY, 10, 10);
    g.fillStyle(0x586878, 1); g.fillRect(kettleX + 1, kettleY + 1, 8, 4);
    g.fillStyle(0x202830, 1); g.fillRect(kettleX + 4, kettleY - 2, 2, 2);
    const steam: Phaser.GameObjects.Arc[] = [];
    for (let s = 0; s < 3; s++) {
      const p = this.add.circle(kettleX + 2 + s * 2, kettleY - 4, 1, 0xdde6f5, 0.7).setDepth(10);
      this.tweens.add({ targets: p, y: kettleY - 14, alpha: 0, duration: 1600, repeat: -1, delay: s * 400 });
      steam.push(p);
    }

    const phX = 50, phY = 60;
    g.fillStyle(0x3a3028, 1); g.fillRect(phX - 6, phY, 16, 12);
    g.fillStyle(0x1a1818, 1); g.fillRect(phX - 3, phY - 6, 8, 10);
    g.fillStyle(0x88c0f0, 1); g.fillRect(phX - 2, phY - 5, 6, 8);
    const phoneRing = this.add.circle(phX + 1, phY - 1, 4, 0x88c0f0, 0.4).setDepth(10);
    this.tweens.add({ targets: phoneRing, scale: 2, alpha: 0, duration: 1400, yoyo: false, repeat: -1 });

    const coatX = 80, coatY = GBC_H - 36;
    g.fillStyle(0x1a1410, 1); g.fillRect(coatX - 8, coatY - 4, 24, 4);
    g.fillStyle(0x4a2820, 1); g.fillRect(coatX - 4, coatY, 8, 14);
    g.fillStyle(0x2a1810, 1); g.fillRect(coatX - 5, coatY + 6, 10, 2);
    g.fillStyle(0x683828, 1); g.fillRect(coatX - 3, coatY, 6, 4);

    // Hidden bathroom mirror — small tile, easy to miss, near the door
    const mirX = 110, mirY = 64;
    g.fillStyle(0x1a1818, 1); g.fillRect(mirX - 4, mirY - 5, 9, 10);
    g.fillStyle(0x88a0c8, 0.7); g.fillRect(mirX - 3, mirY - 4, 7, 8);
    g.fillStyle(0xc8d8e8, 0.5); g.fillRect(mirX - 3, mirY - 4, 7, 3);

    const doorX = 76, doorY = GBC_H - 12;
    const door = this.add.rectangle(doorX + 4, doorY + 4, 12, 16, 0x2a1810, 1).setDepth(2);
    this.add.rectangle(doorX + 4, doorY + 4, 12, 16, 0x584030, 0).setStrokeStyle(1, 0x584030).setDepth(2);
    void door;

    spawnMotes(this, { count: 14, color: 0xdde6f5, alpha: 0.35, driftY: 0.004, driftX: 0.006, depth: 25 });

    const mark = (x: number, y: number, color: number) => {
      const a = this.add.circle(x, y, 6, color, 0.18).setDepth(9);
      this.tweens.add({ targets: a, scale: 1.4, alpha: 0.05, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      return a;
    };

    this.items = [
      {
        x: phX + 1, y: phY, w: 14, h: 14, seed: "seed_call", label: "PHONE",
        lines: [
          { who: "?", text: "The phone glows. Caller ID reads MARA." },
          { who: "?", text: "You let it ring. You'll call back tomorrow." },
          { who: "?", text: "You always say tomorrow." },
        ],
        used: false, visual: [], marker: mark(phX + 1, phY, 0x88c0f0),
      },
      {
        x: winX + 11, y: winY + 8, w: 24, h: 18, seed: "seed_window", label: "WINDOW",
        lines: [
          { who: "?", text: "Across the street a child waves up at the glass." },
          { who: "?", text: "You almost wave back. You don't." },
          { who: "?", text: "The glass between you feels suddenly thin." },
        ],
        used: false, visual: steam, marker: mark(winX + 11, winY + 8, 0xc8d8e8),
      },
      {
        x: kettleX + 5, y: kettleY + 5, w: 14, h: 14, seed: "seed_kettle", label: "KETTLE",
        lines: [
          { who: "?", text: "The kettle has whistled itself thin." },
          { who: "?", text: "You pour two cups. You always pour two." },
          { who: "?", text: "You don't remember when that started." },
        ],
        used: false, visual: [], marker: mark(kettleX + 5, kettleY + 5, 0xdde6f5),
      },
      {
        x: coatX, y: coatY + 6, w: 14, h: 18, seed: "seed_coat", label: "COAT",
        lines: [
          { who: "?", text: "Your coat by the door. Pockets full of small unfinished things." },
          { who: "?", text: "Receipts. A folded letter. A key to a door that isn't this one." },
          { who: "?", text: "You've been meaning to do a lot of things." },
        ],
        used: false, visual: [], marker: mark(coatX, coatY + 6, 0xd89868),
      },
      {
        // Hidden 5th — mirror. Smaller marker, no halo by default.
        x: mirX, y: mirY, w: 10, h: 10, seed: "seed_mirror", label: "MIRROR",
        lines: [
          { who: "?", text: "You look tired." },
          { who: "?", text: "You look like someone who hasn't been seen in a while." },
          { who: "?", text: "You hold your own gaze longer than usual. Then you turn away." },
        ],
        used: false, visual: [], marker: mark(mirX, mirY, 0xa8c8e8),
      },
    ];

    for (const it of this.items) {
      if (this.save.seeds[it.seed]) {
        it.used = true;
        if (it.marker) it.marker.setVisible(false);
      }
    }

    this.rowanShadow = this.add.ellipse(80, 88, 10, 3, 0x000000, 0.4).setDepth(2);
    this.rowan = makeRowan(this, 80, 82);

    attachHUD(this, () => this.save.stats);
    this.input2 = new InputState(this);

    this.add.rectangle(0, 13, GBC_W, 9, 0x0a0e1a, 0.85).setOrigin(0, 0).setDepth(199);
    new GBCText(this, 4, 14, "TUESDAY  8:14 AM", { color: COLOR.textAccent, depth: 200 });

    this.add.rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85).setOrigin(0, 0).setScrollFactor(0).setDepth(199);
    this.hint = new GBCText(this, 4, GBC_H - 9, "WALK. PRESS A NEAR THINGS.", { color: COLOR.textDim, depth: 200, scrollFactor: 0 });

    this.events.on("vinput-action", () => this.tryInteract());
    this.input.keyboard?.on("keydown-SPACE", () => this.tryInteract());
    this.input.keyboard?.on("keydown-ENTER", () => this.tryInteract());

    // Door is open immediately if 3+ seeds were already set in a prior visit.
    const usedAtLoad = this.items.filter(t => t.used).length;
    if (usedAtLoad >= 3) this.exitOpen = true;

    if (!this.save.flags.lastday_intro) {
      this.save.flags.lastday_intro = true;
      writeSave(this.save);
      this.dialogActive = true;
      this.time.delayedCall(700, () => runDialog(this, [
        { who: "?", text: "An ordinary morning. The light is doing its small work." },
        { who: "?", text: "Touch what calls you. There is no rush. There is no later." },
      ], () => { this.dialogActive = false; }));
    }
  }

  update(_t: number, dt: number) {
    if (this.dialogActive) return;
    const speed = 0.04 * dt;
    const i = this.input2.poll();
    let dx = 0, dy = 0;
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

    const near = this.nearest();
    const used = this.items.filter(t => t.used).length;
    if (this.exitOpen) {
      const dxg = this.rowan.x - 80, dyg = this.rowan.y - (GBC_H - 8);
      if (dxg * dxg + dyg * dyg < 14 * 14) this.hint.setText("A: STEP THROUGH THE DOOR");
      else this.hint.setText("THE DOOR IS OPEN. (SOUTH)");
    } else if (near && !near.used) {
      this.hint.setText(`A: ${near.label}`);
    } else {
      this.hint.setText(`TOUCH WHAT CALLS YOU  ${used}/4`);
    }

    if (!this.exitOpen && used >= 3) {
      this.exitOpen = true;
      this.tweens.add({ targets: this.cameras.main, duration: 600, alpha: 1 });
    }
  }

  private nearest(): Interactable | null {
    let best: Interactable | null = null; let bd = Infinity;
    for (const it of this.items) {
      const dx = this.rowan.x - it.x, dy = this.rowan.y - it.y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = it; }
    }
    return bd < 14 * 14 ? best : null;
  }

  private tryInteract() {
    if (this.dialogActive) return;
    if (this.exitOpen) {
      const dxg = this.rowan.x - 80, dyg = this.rowan.y - (GBC_H - 8);
      if (dxg * dxg + dyg * dyg < 14 * 14) {
        this.save.scene = "Crossing";
        writeSave(this.save);
        const a = getAudio(); a.sfx("wipe"); a.music.stop();
        this.cameras.main.fadeOut(700, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Crossing", { save: this.save }));
        return;
      }
    }
    const it = this.nearest();
    if (!it || it.used) return;
    it.used = true;
    this.save.seeds[it.seed] = true;
    writeSave(this.save);
    if (it.marker) it.marker.setVisible(false);
    this.dialogActive = true;
    getAudio().sfx("dialog");
    runDialog(this, it.lines, () => { this.dialogActive = false; });
  }
}
