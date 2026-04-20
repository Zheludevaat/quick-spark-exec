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

/** Build an animated Rowan sprite using the rowan_walk sheet. */
export function makeRowan(scene: Phaser.Scene, x: number, y: number) {
  const c = scene.add.container(x, y);
  const glow = scene.add.circle(0, 2, 11, PAL.moonCyan, 0.18);
  scene.tweens.add({ targets: glow, alpha: 0.32, scale: 1.15, duration: 1200, yoyo: true, repeat: -1 });
  const sprite = scene.add.sprite(0, 0, "rowan_walk", 0);
  sprite.play("rowan_down_idle");
  c.add([glow, sprite]);
  c.setSize(16, 24);
  c.setData("sprite", sprite);
  c.setData("dir", "down");
  return c;
}

/** Update Rowan's facing/animation based on movement input. */
export function animateRowan(c: Phaser.GameObjects.Container, dx: number, dy: number) {
  const sprite = c.getData("sprite") as Phaser.GameObjects.Sprite | undefined;
  if (!sprite) return;
  let dir = c.getData("dir") as string;
  const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
  if (moving) {
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
    else dir = dy > 0 ? "down" : "up";
    c.setData("dir", dir);
    const key = `rowan_${dir}`;
    if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
  } else {
    const key = `rowan_${dir}_idle`;
    if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
  }
}
