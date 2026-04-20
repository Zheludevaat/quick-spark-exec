import * as Phaser from "phaser";
import { PAL, pixelText, VIEW_W, VIEW_H, drawDialogBox } from "../shared";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan } from "./hud";

type Dialog = { who: string; text: string };

const SORYN_OPENING: Dialog[] = [
  { who: "?", text: "Welcome, Rowan. Take a breath you no longer need." },
  { who: "Soryn", text: "I am Soryn. A friend of the Threshold." },
  { who: "Soryn", text: "Four old voices want to greet you first." },
  { who: "Soryn", text: "Walk to each circle. Stand. Listen." },
];

const ELEMENT_LINES: Record<string, Dialog[]> = {
  air: [
    { who: "Air", text: "Clarity is not certainty. It is willingness to see." },
  ],
  fire: [
    { who: "Fire", text: "Courage burns the part of you that hides." },
  ],
  water: [
    { who: "Water", text: "Compassion holds what cannot yet be fixed." },
  ],
  earth: [
    { who: "Earth", text: "You are still here. The ground in you remembers." },
  ],
};

const SORYN_AFTER: Dialog[] = [
  { who: "Soryn", text: "Good. Beyond the arch is the Moon — your mirrors wait." },
  { who: "Soryn", text: "There you will learn four small verbs:" },
  { who: "Soryn", text: "Observe. Address. Remember. Release." },
  { who: "Soryn", text: "Press A at the gate when you are ready." },
];

export class SilverThresholdScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private input2!: InputState;
  private dialogActive = false;
  private circles: { kind: string; sprite: Phaser.GameObjects.Container; visited: boolean }[] = [];
  private gate!: Phaser.GameObjects.Container;

  constructor() { super("SilverThreshold"); }
  init(data: { save: SaveSlot }) { this.save = data.save; }

  create() {
    this.cameras.main.setBackgroundColor(PAL.void);

    // Painted backdrop (the silver path)
    this.add.image(VIEW_W / 2, VIEW_H / 2, "silver_threshold_base")
      .setDisplaySize(VIEW_W + 40, VIEW_H + 40)
      .setAlpha(0.55);
    this.add.image(VIEW_W / 2, VIEW_H / 2, "silver_threshold_effects")
      .setDisplaySize(VIEW_W, VIEW_H)
      .setAlpha(0.25)
      .setBlendMode(Phaser.BlendModes.SCREEN);

    // The walking path band
    const path = this.add.graphics();
    path.fillStyle(PAL.silverDark, 0.55);
    path.fillRoundedRect(20, 80, VIEW_W - 40, 80, 10);
    path.lineStyle(1, PAL.silverLight, 0.6);
    path.strokeRoundedRect(20, 80, VIEW_W - 40, 80, 10);

    // Reception circles (4 elements) along the band
    const positions: [string, number, number, number][] = [
      ["air", 60, 120, PAL.air],
      ["fire", 120, 120, PAL.fire],
      ["water", 180, 120, PAL.water],
      ["earth", 240, 120, PAL.earth],
    ];
    positions.forEach(([kind, x, y, color]) => {
      const c = this.add.container(x, y);
      const ring = this.add.circle(0, 0, 12, color, 0.25).setStrokeStyle(1, color, 0.9);
      const inner = this.add.circle(0, 0, 5, color, 0.7);
      c.add([ring, inner]);
      this.tweens.add({ targets: ring, scale: 1.25, alpha: 0.45, duration: 1400, yoyo: true, repeat: -1 });
      this.circles.push({ kind, sprite: c, visited: this.save.flags[`elem_${kind}`] === true });
      if (this.circles[this.circles.length - 1].visited) {
        ring.setAlpha(0.1); inner.setAlpha(0.25);
      }
    });

    // Soryn at far right
    const soryn = this.add.container(285, 120);
    const sBody = this.add.rectangle(0, 2, 8, 12, 0x2a3550).setStrokeStyle(1, PAL.moonCyan);
    const sHead = this.add.rectangle(0, -7, 7, 7, PAL.pearl).setStrokeStyle(1, PAL.silverDark);
    const sHair = this.add.rectangle(0, -10, 7, 2, PAL.moonCyan);
    const sGlow = this.add.circle(0, 0, 14, PAL.moonCyan, 0.15);
    this.tweens.add({ targets: sGlow, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
    soryn.add([sGlow, sBody, sHead, sHair]);
    pixelText(this, 277, 100, "Soryn", 7, "#8ec8e8");

    // Moon gate (south, becomes active after all 4 circles visited)
    this.gate = this.add.container(VIEW_W / 2, VIEW_H - 28);
    const gateImg = this.add.image(0, 0, "moon_gate_threshold").setDisplaySize(60, 60).setAlpha(0.6);
    const gateLabel = pixelText(this, -22, -32, "MOON GATE", 7, "#6a7a9c");
    this.gate.add([gateImg, gateLabel]);
    (this.gate as any).label = gateLabel;
    (this.gate as any).img = gateImg;

    // Player
    this.rowan = makeRowan(this, 30, 120);

    // HUD + input
    attachHUD(this, () => this.save.stats);
    this.input2 = new InputState(this);
    this.events.on("vinput-action", () => this.tryInteract());
    this.input.keyboard?.on("keydown-SPACE", () => this.tryInteract());
    this.input.keyboard?.on("keydown-ENTER", () => this.tryInteract());

    // First-time arrival → trigger Soryn opening dialog after a beat
    if (!this.save.flags.intro_done) {
      this.time.delayedCall(600, () => this.runDialog(SORYN_OPENING, () => {
        this.save.flags.intro_done = true;
        writeSave(this.save);
      }));
    }
  }

  update(_t: number, dt: number) {
    if (this.dialogActive) return;
    const speed = 0.06 * dt;
    const i = this.input2.poll();
    let dx = 0, dy = 0;
    if (i.left)  dx -= speed;
    if (i.right) dx += speed;
    if (i.up)    dy -= speed;
    if (i.down)  dy += speed;
    this.rowan.x += dx;
    this.rowan.y += dy;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 24, VIEW_W - 24);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, 90, VIEW_H - 20);
    animateRowan(this.rowan, dx, dy);

    // Auto-trigger element circles on touch
    for (const c of this.circles) {
      if (c.visited) continue;
      const dx = this.rowan.x - c.sprite.x;
      const dy = this.rowan.y - c.sprite.y;
      if (dx * dx + dy * dy < 14 * 14) {
        c.visited = true;
        this.save.flags[`elem_${c.kind}`] = true;
        // grant a stat
        if (c.kind === "air")   this.save.stats.clarity++;
        if (c.kind === "fire")  this.save.stats.courage++;
        if (c.kind === "water") this.save.stats.compassion++;
        if (c.kind === "earth") this.save.stats.clarity++;
        this.events.emit("stats-changed");
        writeSave(this.save);
        // visual fade
        c.sprite.list.forEach((o: any) => o.setAlpha?.(0.15));
        this.runDialog(ELEMENT_LINES[c.kind], () => this.checkAllElements());
        break;
      }
    }
  }

  private checkAllElements() {
    const all = this.circles.every(c => c.visited);
    if (all && !this.save.flags.elements_done) {
      this.save.flags.elements_done = true;
      writeSave(this.save);
      // Activate gate
      (this.gate as any).img.setAlpha(1);
      (this.gate as any).label.setColor("#eef3ff").setText("MOON GATE  ▼");
      this.tweens.add({ targets: this.gate, scale: 1.05, duration: 700, yoyo: true, repeat: -1 });
      this.runDialog(SORYN_AFTER);
    }
  }

  private tryInteract() {
    if (this.dialogActive) return;
    // Soryn talk
    const dx = this.rowan.x - 285, dy = this.rowan.y - 120;
    if (dx * dx + dy * dy < 18 * 18) {
      const lines = this.save.flags.elements_done ? SORYN_AFTER : SORYN_OPENING;
      this.runDialog(lines);
      return;
    }
    // Gate enter
    const gx = this.rowan.x - this.gate.x, gy = this.rowan.y - this.gate.y;
    if (gx * gx + gy * gy < 24 * 24 && this.save.flags.elements_done) {
      this.save.scene = "MoonHall";
      writeSave(this.save);
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("MoonHall", { save: this.save }));
    }
  }

  private runDialog(lines: Dialog[], onDone?: () => void) {
    this.dialogActive = true;
    const box = drawDialogBox(this, 12, 168, VIEW_W - 24, 60);
    const who = pixelText(this, 22, 174, "", 8, "#8ec8e8").setDepth(101);
    const text = pixelText(this, 22, 188, "", 9).setDepth(101);
    text.setWordWrapWidth(VIEW_W - 48);
    const hint = pixelText(this, VIEW_W - 60, 216, "▼ A / ↵", 7, "#8ec8e8").setDepth(101);
    let i = 0;
    const next = () => {
      if (i >= lines.length) {
        box.destroy(); who.destroy(); text.destroy(); hint.destroy();
        this.dialogActive = false;
        this.input.keyboard?.off("keydown-SPACE", next);
        this.input.keyboard?.off("keydown-ENTER", next);
        this.events.off("vinput-action", next);
        this.input.off("pointerdown", next);
        onDone?.();
        return;
      }
      who.setText(lines[i].who);
      text.setText(lines[i].text);
      i++;
    };
    next();
    this.input.keyboard?.on("keydown-SPACE", next);
    this.input.keyboard?.on("keydown-ENTER", next);
    this.events.on("vinput-action", next);
    this.input.on("pointerdown", next);
  }
}
