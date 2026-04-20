import * as Phaser from "phaser";
import { GBC_W, GBC_H, TILE, COLOR, GBCText, TILE_INDEX, spawnMotes, gbcWipe } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan, runDialog } from "./hud";
import { getAudio, SONG_SILVER } from "../audio";

const SORYN_OPENING = [
  { who: "?",     text: "Welcome, Rowan. Take a breath you no longer need." },
  { who: "Soryn", text: "I am Soryn. A friend of the Threshold." },
  { who: "Soryn", text: "Four old voices want to greet you first." },
  { who: "Soryn", text: "Walk to each circle. Stand. Listen." },
];

const ELEMENT_LINES: Record<string, { who: string; text: string }[]> = {
  air: [
    { who: "Air",   text: "Clarity is not certainty. It is willingness to see." },
    { who: "Air",   text: "What you avoid looking at writes the loudest stories." },
  ],
  fire: [
    { who: "Fire",  text: "Courage burns the part of you that hides." },
    { who: "Fire",  text: "It does not feel brave. That is how you know it works." },
  ],
  water: [
    { who: "Water", text: "Compassion holds what cannot yet be fixed." },
    { who: "Water", text: "Even your worst hour deserves a witness who stays." },
  ],
  earth: [
    { who: "Earth", text: "You are still here. The ground in you remembers." },
    { who: "Earth", text: "Slowness is not failure. It is how roots are made." },
  ],
};

const SORYN_AFTER = [
  { who: "Soryn", text: "Beyond the arch is the Moon - your mirrors wait." },
  { who: "Soryn", text: "There you will learn four small verbs:" },
  { who: "Soryn", text: "Observe. Address. Remember. Release." },
  { who: "Soryn", text: "Press A at the gate when you are ready." },
];

const SORYN_REPEAT = [
  { who: "Soryn", text: "The threshold likes wanderers. Take your time." },
  { who: "Soryn", text: "When you are ready, walk to each circle." },
];

const SORYN_REPEAT_AFTER = [
  { who: "Soryn", text: "The gate listens. Step into it when you can." },
  { who: "Soryn", text: "Whatever you bring, you will not bring alone." },
];

const STONE_LINES = [
  { who: "Stone", text: "An old marker. Carved with one word: BEGIN." },
  { who: "Stone", text: "You feel a small warmth in the chest. +1 COURAGE." },
];

// Map dimensions in tiles (160/16 x 144/16 = 10 x 9)
const MAP_W = 10, MAP_H = 9;

// 0=void, 1=floor, 2=path
function buildMap(): number[][] {
  const T = TILE_INDEX;
  const m: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      // void at top edge, void at bottom corners, path band in middle
      if (y < 2) row.push(T.SILVER_VOID);
      else if (y === 2) row.push(T.SILVER_EDGE_N);
      else if (y >= 3 && y <= 6) row.push(y === 4 || y === 5 ? T.SILVER_PATH : T.SILVER_FLOOR);
      else row.push(T.SILVER_VOID);
    }
    m.push(row);
  }
  return m;
}

type ElemKind = "air" | "fire" | "water" | "earth";

export class SilverThresholdScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private input2!: InputState;
  private dialogActive = false;
  private circles: { kind: ElemKind; sprite: Phaser.GameObjects.Sprite; x: number; y: number; visited: boolean }[] = [];
  private gate!: Phaser.GameObjects.Container;
  private soryn!: Phaser.GameObjects.Sprite;
  private hint!: GBCText;
  private stone!: Phaser.GameObjects.Rectangle;

  constructor() { super("SilverThreshold"); }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.circles = [];
    this.dialogActive = false;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.void);
    this.cameras.main.fadeIn(400);
    const audio = getAudio();
    audio.music.play("silver", SONG_SILVER);

    // Paint tilemap
    const map = buildMap();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.add.image(x * TILE, y * TILE, "gbc_tiles", map[y][x]).setOrigin(0, 0);
      }
    }

    // Ambient silver dust drifting upward
    spawnMotes(this, { count: 22, color: 0xdde6f5, alpha: 0.55, driftY: -0.012, driftX: 0.003, depth: 30 });
    spawnMotes(this, { count: 8, color: 0xa8c8e8, alpha: 0.35, driftY: -0.006, driftX: -0.004, depth: 30 });

    // Element circles along the path
    const placements: { kind: ElemKind; x: number; y: number }[] = [
      { kind: "air",   x: 28,  y: 76 },
      { kind: "fire",  x: 60,  y: 76 },
      { kind: "water", x: 92,  y: 76 },
      { kind: "earth", x: 124, y: 76 },
    ];
    for (const p of placements) {
      const visited = !!this.save.flags[`elem_${p.kind}`];
      const s = this.add.sprite(p.x, p.y, "elements", p.kind === "air" ? 0 : p.kind === "fire" ? 2 : p.kind === "water" ? 4 : 6);
      s.play(`elem_${p.kind}`);
      if (visited) s.setAlpha(0.35);
      this.circles.push({ kind: p.kind, sprite: s, x: p.x, y: p.y, visited });
    }

    // Soryn at far right of path
    this.soryn = this.add.sprite(146, 70, "soryn", 0);
    this.soryn.play("soryn_flicker");
    new GBCText(this, 138, 56, "SORYN", { color: COLOR.textAccent });

    // Gate at south
    this.gate = this.add.container(GBC_W / 2, GBC_H - 18);
    const gateImg = this.add.image(0, 0, "gbc_tiles", TILE_INDEX.GATE).setOrigin(0.5);
    gateImg.setAlpha(this.save.flags.elements_done ? 1 : 0.4);
    this.gate.add([gateImg]);
    this.gate.setData("img", gateImg);

    // Hidden lore stone tucked at the far end of the path — rewards exploration
    const stoneFound = !!this.save.flags.stone_found;
    this.stone = this.add.rectangle(14, 58, 6, 4, stoneFound ? 0x3a4868 : 0x7889a8, 1);
    this.add.rectangle(14, 60, 6, 1, 0x1a2030, 1);
    if (!stoneFound) {
      this.tweens.add({ targets: this.stone, alpha: 0.5, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    // Player + soft shadow
    this.rowanShadow = this.add.ellipse(16, 76, 10, 3, 0x000000, 0.35).setDepth(2);
    this.rowan = makeRowan(this, 16, 70);

    // HUD + input
    attachHUD(this, () => this.save.stats);
    this.input2 = new InputState(this);
    this.events.on("vinput-action", () => this.tryInteract());
    this.input.keyboard?.on("keydown-SPACE", () => this.tryInteract());
    this.input.keyboard?.on("keydown-ENTER", () => this.tryInteract());

    this.add.rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85).setOrigin(0, 0).setScrollFactor(0).setDepth(199);
    this.hint = new GBCText(this, 4, GBC_H - 9, "TOUCH THE 4 CIRCLES", { color: COLOR.textDim, depth: 200, scrollFactor: 0 });

    // First-time arrival → trigger Soryn opening dialog
    if (!this.save.flags.intro_done) {
      this.dialogActive = true;
      this.time.delayedCall(500, () => {
        runDialog(this, SORYN_OPENING, () => {
          this.save.flags.intro_done = true;
          writeSave(this.save);
          this.dialogActive = false;
        });
      });
    }
  }

  update(_t: number, dt: number) {
    if (this.dialogActive) return;
    const speed = 0.04 * dt;
    const i = this.input2.poll();
    let dx = 0, dy = 0;
    if (i.left)  dx -= speed;
    if (i.right) dx += speed;
    if (i.up)    dy -= speed;
    if (i.down)  dy += speed;
    this.rowan.x += dx;
    this.rowan.y += dy;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 8, GBC_W - 8);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, 50, GBC_H - 14);
    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);

    // Contextual hint based on proximity & progress
    const visited = this.circles.filter(c => c.visited).length;
    const sdx = this.rowan.x - this.soryn.x, sdy = this.rowan.y - this.soryn.y;
    const gdx = this.rowan.x - this.gate.x, gdy = this.rowan.y - this.gate.y;
    const stx = this.rowan.x - this.stone.x, sty = this.rowan.y - this.stone.y;
    if (sdx * sdx + sdy * sdy < 14 * 14) this.hint.setText("A: TALK TO SORYN");
    else if (gdx * gdx + gdy * gdy < 16 * 16) this.hint.setText(this.save.flags.elements_done ? "A: ENTER THE GATE" : `GATE SEALED  ${visited}/4 CIRCLES`);
    else if (stx * stx + sty * sty < 12 * 12 && !this.save.flags.stone_found) this.hint.setText("A: INSPECT STONE");
    else this.hint.setText(this.save.flags.elements_done ? "WALK TO THE GATE (SOUTH)" : `TOUCH THE CIRCLES  ${visited}/4`);

    // Auto-trigger element circles on touch
    for (const c of this.circles) {
      if (c.visited) continue;
      const ddx = this.rowan.x - c.x, ddy = this.rowan.y - c.y;
      if (ddx * ddx + ddy * ddy < 10 * 10) {
        c.visited = true;
        this.save.flags[`elem_${c.kind}`] = true;
        c.sprite.setAlpha(0.35);
        getAudio().sfx("resolve");
        // Burst ring + sparkle on activation
        const burstColor = c.kind === "air" ? 0xdde6f5 : c.kind === "fire" ? 0xf08868 : c.kind === "water" ? 0x88c0f0 : 0xa8c890;
        const ring = this.add.circle(c.x, c.y, 4, burstColor, 0.6).setDepth(40);
        this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 600, ease: "Sine.out", onComplete: () => ring.destroy() });
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2;
          const sp = this.add.rectangle(c.x, c.y, 1, 1, burstColor, 1).setDepth(41);
          this.tweens.add({ targets: sp, x: c.x + Math.cos(ang) * 14, y: c.y + Math.sin(ang) * 14, alpha: 0, duration: 500, onComplete: () => sp.destroy() });
        }
        this.cameras.main.flash(120, 240, 240, 255);
        if (c.kind === "air")   this.save.stats.clarity++;
        if (c.kind === "fire")  this.save.stats.courage++;
        if (c.kind === "water") this.save.stats.compassion++;
        if (c.kind === "earth") this.save.stats.clarity++;
        this.events.emit("stats-changed");
        writeSave(this.save);
        this.dialogActive = true;
        runDialog(this, ELEMENT_LINES[c.kind], () => {
          this.dialogActive = false;
          this.checkAllElements();
        });
        return;
      }
    }
  }

  private checkAllElements() {
    const all = this.circles.every(c => c.visited);
    if (all && !this.save.flags.elements_done) {
      this.save.flags.elements_done = true;
      writeSave(this.save);
      (this.gate.getData("img") as Phaser.GameObjects.Image).setAlpha(1);
      this.tweens.add({ targets: this.gate, scale: 1.1, duration: 600, yoyo: true, repeat: -1 });
      getAudio().sfx("open");
      this.dialogActive = true;
      runDialog(this, SORYN_AFTER, () => { this.dialogActive = false; });
    }
  }

  private tryInteract() {
    if (this.dialogActive) return;
    // Stone inspect (small radius)
    const stx = this.rowan.x - this.stone.x, sty = this.rowan.y - this.stone.y;
    if (stx * stx + sty * sty < 12 * 12 && !this.save.flags.stone_found) {
      this.dialogActive = true;
      this.save.flags.stone_found = true;
      this.save.stats.courage++;
      this.events.emit("stats-changed");
      writeSave(this.save);
      this.stone.setFillStyle(0x3a4868);
      getAudio().sfx("resolve");
      runDialog(this, STONE_LINES, () => { this.dialogActive = false; });
      return;
    }
    // Soryn talk
    const sdx = this.rowan.x - this.soryn.x, sdy = this.rowan.y - this.soryn.y;
    if (sdx * sdx + sdy * sdy < 14 * 14) {
      this.dialogActive = true;
      getAudio().sfx("confirm");
      const firstTime = !this.save.flags.soryn_talked;
      this.save.flags.soryn_talked = true;
      writeSave(this.save);
      const lines = this.save.flags.elements_done
        ? (firstTime ? SORYN_AFTER : SORYN_REPEAT_AFTER)
        : (firstTime ? SORYN_OPENING : SORYN_REPEAT);
      runDialog(this, lines, () => { this.dialogActive = false; });
      return;
    }
    // Gate enter
    const gx = this.rowan.x - this.gate.x, gy = this.rowan.y - this.gate.y;
    if (gx * gx + gy * gy < 16 * 16 && this.save.flags.elements_done) {
      this.save.scene = "ImaginalRealm";
      writeSave(this.save);
      const a = getAudio(); a.sfx("wipe"); a.music.stop();
      gbcWipe(this, () => this.scene.start("ImaginalRealm", { save: this.save }));
    }
  }
}
