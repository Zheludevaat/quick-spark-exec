import * as Phaser from "phaser";
import { GBC_W, GBC_H, TILE, COLOR, GBCText, TILE_INDEX, gbcWipe, spawnMotes } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan, runDialog } from "./hud";
import { getAudio, SONG_MOON } from "../audio";

type Mirror = {
  x: number; y: number;
  kind: "reflection" | "echo" | "glitter" | "boss";
  cleared: boolean;
  sprite: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Arc;
};

const MIRROR_TAGLINE: Record<Mirror["kind"], string> = {
  reflection: "A SHAPE THAT MIMICS YOU.",
  echo:       "A WORD YOU REGRET.",
  glitter:    "A FRAGMENT OF AN AFTERNOON.",
  boss:       "THE FACE YOU OFFERED.",
};

const SORYN_AFTER_CLEAR: Record<Mirror["kind"], { who: string; text: string }[]> = {
  reflection: [
    { who: "Soryn", text: "Seeing it plainly is the first kindness." },
    { who: "Soryn", text: "Most knots are smaller once they are watched." },
  ],
  echo: [
    { who: "Soryn", text: "Naming what you meant is half of mending." },
    { who: "Soryn", text: "The other half is letting the echo answer back." },
  ],
  glitter: [
    { who: "Soryn", text: "Memory in pieces is still memory." },
    { who: "Soryn", text: "Hold the whole afternoon. Even the dull parts." },
  ],
  boss: [
    { who: "Soryn", text: "The Curated Self is not your enemy." },
    { who: "Soryn", text: "It is a story you outgrew. Thank it. Then go." },
  ],
};

const MAP_W = 10, MAP_H = 9;

function buildMoonMap(): number[][] {
  const T = TILE_INDEX;
  const m: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      if (y === 0 || y === MAP_H - 1) row.push(T.MOON_WALL);
      else if (x === 0 || x === MAP_W - 1) row.push(T.MOON_WALL);
      else if ((y === 2 && (x === 2 || x === 7)) || (y === 5 && (x === 2 || x === 7))) row.push(T.MOON_PILLAR);
      else if ((x + y) % 2 === 0) row.push(T.MOON_FLOOR);
      else row.push(T.MOON_FLOOR_REFLECT);
    }
    m.push(row);
  }
  return m;
}

export class MoonHallScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private input2!: InputState;
  private mirrors: Mirror[] = [];
  private dialogActive = false;
  private hint!: GBCText;
  private focusGlow!: Phaser.GameObjects.Arc;

  constructor() { super("MoonHall"); }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.mirrors = [];
    this.dialogActive = false;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0f20");
    this.cameras.main.fadeIn(400);
    getAudio().music.play("moon", SONG_MOON);

    // Paint moon hall tilemap
    const map = buildMoonMap();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.add.image(x * TILE, y * TILE, "gbc_tiles", map[y][x]).setOrigin(0, 0);
      }
    }

    // Ambient cyan motes drifting across the hall
    spawnMotes(this, { count: 14, color: 0x5a78b8, alpha: 0.5, driftY: 0.006, driftX: 0.004, depth: 30 });
    spawnMotes(this, { count: 6, color: 0xa8c8e8, alpha: 0.7, driftY: -0.004, driftX: -0.003, depth: 30 });

    // Three minor mirrors + boss mirror
    const layout: { x: number; y: number; kind: Mirror["kind"] }[] = [
      { x: 40,  y: 56, kind: "reflection" },
      { x: 80,  y: 56, kind: "echo" },
      { x: 120, y: 56, kind: "glitter" },
      { x: 80,  y: 104, kind: "boss" },
    ];
    for (const m of layout) {
      const cleared = !!this.save.flags[`m_${m.kind}`];
      const sprite = this.add.image(m.x, m.y, "gbc_tiles", cleared ? TILE_INDEX.MIRROR_CLEARED : TILE_INDEX.MIRROR_FRAME);
      let glow: Phaser.GameObjects.Arc | undefined;
      if (!cleared) {
        // All uncleared mirrors get a soft shimmer; boss gets a warmer red one
        const c = m.kind === "boss" ? 0xd86a6a : 0xa8c8e8;
        glow = this.add.circle(m.x, m.y, m.kind === "boss" ? 12 : 9, c, 0.25);
        this.tweens.add({
          targets: glow,
          scale: m.kind === "boss" ? 1.5 : 1.3,
          alpha: 0.1,
          duration: m.kind === "boss" ? 900 : 1200,
          yoyo: true, repeat: -1,
        });
        // Subtle vertical sprite bob for living feel
        this.tweens.add({ targets: sprite, y: m.y - 1, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      }
      this.mirrors.push({ x: m.x, y: m.y, kind: m.kind, cleared, sprite, glow });
    }

    // Player at top
    this.rowan = makeRowan(this, 24, 32);
    // Soft shadow under Rowan (moves with her)
    this.rowanShadow = this.add.ellipse(24, 38, 10, 3, 0x000000, 0.35).setDepth(2);
    // Focus glow that follows the nearest mirror
    this.focusGlow = this.add.circle(0, 0, 11, 0xffffff, 0).setDepth(15);

    // Title + hint backings so text stays readable over tilemap walls
    this.add.rectangle(0, 13, GBC_W, 9, 0x0a0e1a, 0.85).setOrigin(0, 0).setDepth(199);
    new GBCText(this, 4, 14, "HALL OF MIRRORS", { color: COLOR.textAccent, depth: 200 });
    this.add.rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85).setOrigin(0, 0).setScrollFactor(0).setDepth(199);
    this.hint = new GBCText(this, 4, GBC_H - 9, "WALK TO A MIRROR", { color: COLOR.textDim, depth: 200, scrollFactor: 0 });

    attachHUD(this, () => this.save.stats);
    this.input2 = new InputState(this);
    this.events.on("vinput-action", () => this.tryInteract());
    this.input.keyboard?.on("keydown-SPACE", () => this.tryInteract());
    this.input.keyboard?.on("keydown-ENTER", () => this.tryInteract());

    if (!this.save.flags.moonhall_intro) {
      this.save.flags.moonhall_intro = true;
      writeSave(this.save);
      this.dialogActive = true;
      this.time.delayedCall(400, () => runDialog(this, [
        { who: "Soryn", text: "Three small mirrors. Each holds a knot you carry." },
        { who: "Soryn", text: "Try OBSERVE on first, ADDRESS on second, REMEMBER on third." },
        { who: "Soryn", text: "RELEASE works on anything - but teaches less." },
      ], () => { this.dialogActive = false; }));
    }
  }

  update(_t: number, dt: number) {
    if (this.dialogActive) return;
    if (this.scene.isActive("Encounter")) return;
    const speed = 0.04 * dt;
    const i = this.input2.poll();
    let dx = 0, dy = 0;
    if (i.left)  dx -= speed;
    if (i.right) dx += speed;
    if (i.up)    dy -= speed;
    if (i.down)  dy += speed;
    this.rowan.x += dx;
    this.rowan.y += dy;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 12, GBC_W - 12);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, 22, GBC_H - 18);
    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);

    const near = this.nearestMirror();
    if (near && this.dist(near) < 16 * 16) {
      // Pull a soft halo onto the focused mirror
      this.focusGlow.setPosition(near.x, near.y);
      this.focusGlow.fillColor = near.cleared ? 0xa8e8c8 : (near.kind === "boss" ? 0xd86a6a : 0xa8c8e8);
      this.focusGlow.fillAlpha = 0.25;
      if (near.cleared) this.hint.setText("THIS MIRROR IS QUIET.");
      else if (near.kind === "boss") {
        const ready = this.totalStats() >= 5 && this.mirrors.filter(m => m.kind !== "boss").every(m => m.cleared);
        this.hint.setText(ready ? "A: FACE CURATED SELF" : MIRROR_TAGLINE.boss);
      } else {
        this.hint.setText(`A: ${MIRROR_TAGLINE[near.kind]}`);
      }
    } else {
      this.focusGlow.fillAlpha = 0;
      this.hint.setText("WALK TO A MIRROR.");
    }
  }

  private totalStats() {
    return this.save.stats.clarity + this.save.stats.compassion + this.save.stats.courage;
  }
  private dist(m: Mirror) {
    const dx = this.rowan.x - m.x, dy = this.rowan.y - m.y;
    return dx * dx + dy * dy;
  }
  private nearestMirror(): Mirror | null {
    let best: Mirror | null = null; let bd = Infinity;
    for (const m of this.mirrors) { const d = this.dist(m); if (d < bd) { bd = d; best = m; } }
    return best;
  }

  private tryInteract() {
    if (this.dialogActive) return;
    const m = this.nearestMirror();
    if (!m || this.dist(m) > 16 * 16) return;
    if (m.cleared) return;

    if (m.kind === "boss") {
      const ready = this.totalStats() >= 5 && this.mirrors.filter(x => x.kind !== "boss").every(x => x.cleared);
      if (!ready) return;
      this.save.scene = "CuratedSelf";
      writeSave(this.save);
      const a = getAudio(); a.sfx("boss"); a.music.stop();
      gbcWipe(this, () => this.scene.start("CuratedSelf", { save: this.save }));
      return;
    }

    const launchEncounter = () => {
      getAudio().sfx("confirm");
      this.scene.launch("Encounter", {
        save: this.save,
        kind: m.kind,
        onDone: (won: boolean) => {
          this.scene.resume();
          getAudio().music.play("moon", SONG_MOON);
          if (won) {
            m.cleared = true;
            this.save.flags[`m_${m.kind}`] = true;
            writeSave(this.save);
            m.sprite.setFrame(TILE_INDEX.MIRROR_CLEARED);
            this.events.emit("stats-changed");
            const flag = `soryn_after_${m.kind}`;
            if (!this.save.flags[flag]) {
              this.save.flags[flag] = true;
              writeSave(this.save);
              this.dialogActive = true;
              this.time.delayedCall(400, () => runDialog(this, SORYN_AFTER_CLEAR[m.kind], () => { this.dialogActive = false; }));
            }
          }
        },
      });
      this.scene.pause();
    };

    // First-time mirror tutorial — explains the verb-loop in plain terms
    if (!this.save.flags.tutorial_mirror) {
      this.save.flags.tutorial_mirror = true;
      writeSave(this.save);
      this.dialogActive = true;
      runDialog(this, [
        { who: "Soryn", text: "A mirror holds a knot. Each fears one verb." },
        { who: "Soryn", text: "OBSERVE a mimic. ADDRESS an echo. REMEMBER a fragment." },
        { who: "Soryn", text: "Guess wrong and it ripples but won't break. Try again." },
        { who: "Soryn", text: "First-try wins teach most. RELEASE always works - but teaches less." },
      ], () => { this.dialogActive = false; launchEncounter(); });
    } else {
      launchEncounter();
    }
  }
}
