import * as Phaser from "phaser";
import { GBC_W, GBC_H, TILE, COLOR, GBCText, TILE_INDEX } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan, runDialog } from "./hud";

type Mirror = {
  x: number; y: number;
  kind: "reflection" | "echo" | "glitter" | "boss";
  cleared: boolean;
  sprite: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Arc;
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
  private input2!: InputState;
  private mirrors: Mirror[] = [];
  private dialogActive = false;
  private hint!: GBCText;

  constructor() { super("MoonHall"); }
  init(data: { save: SaveSlot }) { this.save = data.save; }

  create() {
    this.cameras.main.setBackgroundColor("#0a0f20");
    this.cameras.main.fadeIn(400);

    // Paint moon hall tilemap
    const map = buildMoonMap();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.add.image(x * TILE, y * TILE, "gbc_tiles", map[y][x]).setOrigin(0, 0);
      }
    }

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
      if (m.kind === "boss" && !cleared) {
        glow = this.add.circle(m.x, m.y, 12, 0xd86a6a, 0.3);
        this.tweens.add({ targets: glow, scale: 1.5, alpha: 0.15, duration: 900, yoyo: true, repeat: -1 });
      }
      this.mirrors.push({ x: m.x, y: m.y, kind: m.kind, cleared, sprite, glow });
    }

    // Player at top
    this.rowan = makeRowan(this, 24, 32);

    // Title strip (over the wall row)
    new GBCText(this, 4, 14, "HALL OF MIRRORS", { color: COLOR.textAccent, depth: 200 });
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

    const near = this.nearestMirror();
    if (near && this.dist(near) < 16 * 16) {
      if (near.cleared) this.hint.setText("THIS MIRROR IS QUIET.");
      else if (near.kind === "boss") {
        const ready = this.totalStats() >= 5 && this.mirrors.filter(m => m.kind !== "boss").every(m => m.cleared);
        this.hint.setText(ready ? "A: FACE CURATED SELF" : "CLEAR SMALL MIRRORS FIRST");
      } else {
        this.hint.setText(`A: ENTER ${near.kind.toUpperCase()}`);
      }
    } else {
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
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("CuratedSelf", { save: this.save }));
      return;
    }

    this.scene.launch("Encounter", {
      save: this.save,
      kind: m.kind,
      onDone: (won: boolean) => {
        this.scene.resume();
        if (won) {
          m.cleared = true;
          this.save.flags[`m_${m.kind}`] = true;
          writeSave(this.save);
          m.sprite.setFrame(TILE_INDEX.MIRROR_CLEARED);
          this.events.emit("stats-changed");
        }
      },
    });
    this.scene.pause();
  }
}
