import * as Phaser from "phaser";
import { PAL, pixelText, VIEW_W, VIEW_H } from "../shared";
import type { Stats } from "../types";

/**
 * Reusable on-screen HUD: stats top bar + virtual D-pad + A/B for touch.
 * Emits "vinput" events on the scene's events emitter:
 *   "vinput-down" / "vinput-up" with { dir: "up"|"down"|"left"|"right" }
 *   "vinput-action" / "vinput-cancel"
 */
export function attachHUD(scene: Phaser.Scene, getStats: () => Stats) {
  const cam = scene.cameras.main;
  cam.setRoundPixels(true);

  // Top stats bar
  const bar = scene.add.graphics().setScrollFactor(0).setDepth(200);
  bar.fillStyle(PAL.void, 0.85);
  bar.fillRect(0, 0, VIEW_W, 14);
  bar.lineStyle(1, PAL.silverDark, 1);
  bar.strokeRect(0, 0, VIEW_W, 14);

  const text = pixelText(scene, 4, 3, "", 8).setDepth(201);
  const refresh = () => {
    const s = getStats();
    text.setText(`◯ Clarity ${s.clarity}   ❤ Compassion ${s.compassion}   ✦ Courage ${s.courage}`);
  };
  refresh();
  scene.events.on("stats-changed", refresh);

  // Touch controls — only show when touch is present
  const isTouch = scene.sys.game.device.input.touch;
  if (isTouch) {
    const dpadCx = 38;
    const dpadCy = VIEW_H - 38;
    const r = 14;
    const padBg = scene.add.graphics().setScrollFactor(0).setDepth(200);
    padBg.fillStyle(0x1a2238, 0.7);
    padBg.fillCircle(dpadCx, dpadCy, r + 10);
    padBg.fillStyle(PAL.silverDark, 0.9);

    const mkBtn = (x: number, y: number, w: number, h: number, dir: string) => {
      const z = scene.add.zone(x, y, w, h).setScrollFactor(0).setOrigin(0.5).setDepth(201)
        .setInteractive();
      const vis = scene.add.rectangle(x, y, w - 2, h - 2, PAL.silverMid, 0.85)
        .setScrollFactor(0).setDepth(200);
      z.on("pointerdown", () => { vis.setFillStyle(PAL.moonCyan); scene.events.emit("vinput-down", dir); });
      z.on("pointerup", () => { vis.setFillStyle(PAL.silverMid); scene.events.emit("vinput-up", dir); });
      z.on("pointerout", () => { vis.setFillStyle(PAL.silverMid); scene.events.emit("vinput-up", dir); });
    };
    mkBtn(dpadCx, dpadCy - 14, 18, 14, "up");
    mkBtn(dpadCx, dpadCy + 14, 18, 14, "down");
    mkBtn(dpadCx - 14, dpadCy, 14, 18, "left");
    mkBtn(dpadCx + 14, dpadCy, 14, 18, "right");

    // A and B
    const a = scene.add.circle(VIEW_W - 26, VIEW_H - 30, 12, 0xd84a4a).setScrollFactor(0).setDepth(201).setInteractive();
    pixelText(scene, VIEW_W - 30, VIEW_H - 34, "A", 10).setDepth(202);
    a.on("pointerdown", () => scene.events.emit("vinput-action"));

    const b = scene.add.circle(VIEW_W - 50, VIEW_H - 16, 10, 0x4ab84a).setScrollFactor(0).setDepth(201).setInteractive();
    pixelText(scene, VIEW_W - 53, VIEW_H - 20, "B", 9).setDepth(202);
    b.on("pointerdown", () => scene.events.emit("vinput-cancel"));
  }
}

/** Track held directions from both keyboard and virtual pad. */
export class InputState {
  up = false; down = false; left = false; right = false;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = {
      up: kb.addKey("UP"), down: kb.addKey("DOWN"), left: kb.addKey("LEFT"), right: kb.addKey("RIGHT"),
      w: kb.addKey("W"), s: kb.addKey("S"), a: kb.addKey("A"), d: kb.addKey("D"),
    };
    scene.events.on("vinput-down", (dir: string) => { (this as any)[dir] = true; });
    scene.events.on("vinput-up", (dir: string) => { (this as any)[dir] = false; });
  }
  poll() {
    const k = this.keys;
    return {
      up: this.up || k.up.isDown || k.w.isDown,
      down: this.down || k.down.isDown || k.s.isDown,
      left: this.left || k.left.isDown || k.a.isDown,
      right: this.right || k.right.isDown || k.d.isDown,
    };
  }
}

/** Build a small Rowan sprite (placeholder body since the sheet isn't grid-aligned). */
export function makeRowan(scene: Phaser.Scene, x: number, y: number) {
  const c = scene.add.container(x, y);
  // robe
  const body = scene.add.rectangle(0, 2, 8, 12, PAL.silverDark).setStrokeStyle(1, PAL.silverLight);
  // head
  const head = scene.add.rectangle(0, -7, 7, 7, PAL.pearl).setStrokeStyle(1, PAL.silverDark);
  // hair tuft
  const hair = scene.add.rectangle(0, -10, 7, 2, PAL.silverLight);
  // soul glow
  const glow = scene.add.circle(0, 0, 11, PAL.moonCyan, 0.18);
  scene.tweens.add({ targets: glow, alpha: 0.32, scale: 1.15, duration: 1200, yoyo: true, repeat: -1 });
  c.add([glow, body, head, hair]);
  c.setSize(10, 18);
  return c;
}
