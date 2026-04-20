import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, toggleLcd, reapplyLcd } from "../gbcArt";
import type { Stats } from "../types";
import { getAudio } from "../audio";

/**
 * Reusable on-screen HUD: stats top bar + virtual D-pad + A/B for touch.
 * Emits scene events: "vinput-down" / "vinput-up" with a dir string,
 * and "vinput-action" / "vinput-cancel".
 */
export function attachHUD(scene: Phaser.Scene, getStats: () => Stats) {
  const cam = scene.cameras.main;
  cam.setRoundPixels(true);

  // Re-apply LCD overlay if it was toggled on in a previous scene
  reapplyLcd(scene);

  // Global LCD toggle: backslash key
  scene.input.keyboard?.on("keydown-BACKSLASH", () => toggleLcd(scene));
  // Global mute toggle: M key
  scene.input.keyboard?.on("keydown-M", () => {
    const a = getAudio();
    a.setMuted(!a.muted);
  });

  // Top stats bar (compact for 160-wide screen)
  const barBg = scene.add.rectangle(0, 0, GBC_W, 11, 0x0a0e1a, 0.92).setOrigin(0, 0).setScrollFactor(0).setDepth(200);
  scene.add.rectangle(0, 11, GBC_W, 1, 0x7889a8, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(200);
  void barBg;

  const text = new GBCText(scene, 3, 2, "", { color: COLOR.textLight, depth: 201, scrollFactor: 0 });
  const refresh = () => {
    const s = getStats();
    text.setText(`CL${s.clarity} CM${s.compassion} CO${s.courage}`);
  };
  refresh();
  scene.events.on("stats-changed", refresh);

  // Touch controls
  const isTouch = scene.sys.game.device.input.touch;
  if (isTouch) {
    const dpadCx = 22;
    const dpadCy = GBC_H - 22;

    const mkBtn = (x: number, y: number, w: number, h: number, dir: string, label?: string) => {
      const z = scene.add.zone(x, y, w, h).setScrollFactor(0).setOrigin(0.5).setDepth(202).setInteractive();
      const vis = scene.add.rectangle(x, y, w - 1, h - 1, 0x3a4868, 0.85).setScrollFactor(0).setDepth(201);
      scene.add.rectangle(x, y, w + 1, h + 1, 0xdde6f5, 0.5).setScrollFactor(0).setDepth(200);
      if (label) new GBCText(scene, x - 2, y - 3, label, { color: COLOR.textLight, depth: 203, scrollFactor: 0 });
      z.on("pointerdown", () => { vis.setFillStyle(0x7898c0); scene.events.emit("vinput-down", dir); });
      z.on("pointerup",   () => { vis.setFillStyle(0x3a4868); scene.events.emit("vinput-up",   dir); });
      z.on("pointerout",  () => { vis.setFillStyle(0x3a4868); scene.events.emit("vinput-up",   dir); });
    };
    mkBtn(dpadCx,      dpadCy - 11, 11, 9, "up");
    mkBtn(dpadCx,      dpadCy + 11, 11, 9, "down");
    mkBtn(dpadCx - 11, dpadCy,      9, 11, "left");
    mkBtn(dpadCx + 11, dpadCy,      9, 11, "right");

    // A and B (Game Boy color scheme: A red, B yellow-ish)
    const aZ = scene.add.zone(GBC_W - 18, GBC_H - 22, 18, 18).setScrollFactor(0).setDepth(202).setInteractive();
    const aVis = scene.add.circle(GBC_W - 18, GBC_H - 22, 8, 0xd84a4a, 1).setScrollFactor(0).setDepth(201);
    new GBCText(scene, GBC_W - 21, GBC_H - 26, "A", { color: COLOR.textLight, depth: 203, scrollFactor: 0 });
    aZ.on("pointerdown", () => { aVis.setScale(0.9); scene.events.emit("vinput-action"); });
    aZ.on("pointerup",   () => aVis.setScale(1));
    aZ.on("pointerout",  () => aVis.setScale(1));

    const bZ = scene.add.zone(GBC_W - 36, GBC_H - 14, 14, 14).setScrollFactor(0).setDepth(202).setInteractive();
    const bVis = scene.add.circle(GBC_W - 36, GBC_H - 14, 6, 0xe0c060, 1).setScrollFactor(0).setDepth(201);
    new GBCText(scene, GBC_W - 39, GBC_H - 18, "B", { color: COLOR.textLight, depth: 203, scrollFactor: 0 });
    bZ.on("pointerdown", () => { bVis.setScale(0.9); scene.events.emit("vinput-cancel"); });
    bZ.on("pointerup",   () => bVis.setScale(1));
    bZ.on("pointerout",  () => bVis.setScale(1));
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
    scene.events.on("vinput-up",   (dir: string) => { (this as any)[dir] = false; });
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

/** Build an animated Rowan sprite using the rowan walk sheet. */
export function makeRowan(scene: Phaser.Scene, x: number, y: number) {
  const c = scene.add.container(x, y);
  const sprite = scene.add.sprite(0, 0, "rowan", 0).setOrigin(0.5, 0.7);
  if (scene.anims.exists("rowan_down_idle")) sprite.play("rowan_down_idle");
  c.add([sprite]);
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
  const anims = sprite.scene.anims;
  if (moving) {
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
    else                              dir = dy > 0 ? "down"  : "up";
    c.setData("dir", dir);
    const key = `rowan_${dir}`;
    if (anims.exists(key) && sprite.anims.currentAnim?.key !== key) sprite.play(key);
  } else {
    const key = `rowan_${dir}_idle`;
    if (anims.exists(key) && sprite.anims.currentAnim?.key !== key) sprite.play(key);
  }
}

/**
 * Render a multi-line dialog with bitmap font. Returns control object.
 * Lines come in [{who, text}], advance with A/Space/Enter/click.
 */
export function runDialog(
  scene: Phaser.Scene,
  lines: { who: string; text: string }[],
  onDone?: () => void,
) {
  const boxX = 4, boxY = GBC_H - 56, boxW = GBC_W - 8, boxH = 52;
  const box = drawGBCBox(scene, boxX, boxY, boxW, boxH, 250);
  const who = new GBCText(scene, boxX + 6, boxY + 4, "", { color: COLOR.textAccent, depth: 251, scrollFactor: 0 });
  const text = new GBCText(scene, boxX + 6, boxY + 14, "", {
    color: COLOR.textLight, depth: 251, scrollFactor: 0, maxWidthPx: boxW - 16,
  });
  const hint = new GBCText(scene, boxX + boxW - 10, boxY + boxH - 8, "▼", {
    color: COLOR.textAccent, depth: 251, scrollFactor: 0,
  });
  scene.tweens.add({ targets: hint.obj, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });

  let i = 0;
  let active = true;
  let typing = false;
  let fullText = "";
  let typeTimer: Phaser.Time.TimerEvent | null = null;

  const finishTyping = () => {
    if (typeTimer) { typeTimer.remove(false); typeTimer = null; }
    text.setText(fullText);
    typing = false;
    hint.setVisible(true);
  };

  const startTyping = (s: string) => {
    fullText = s;
    typing = true;
    hint.setVisible(false);
    let n = 0;
    text.setText("");
    if (typeTimer) typeTimer.remove(false);
    typeTimer = scene.time.addEvent({
      delay: 28,
      repeat: s.length - 1,
      callback: () => {
        n++;
        text.setText(s.slice(0, n));
        // Tick a soft blip every other glyph (skip spaces) so it doesn't get noisy
        const ch = s[n - 1];
        if (n % 2 === 0 && ch && ch !== " ") getAudio().sfx("dialog");
        if (n >= s.length) { typing = false; hint.setVisible(true); typeTimer = null; }
      },
    });
  };

  const next = () => {
    if (!active) return;
    if (typing) { finishTyping(); return; }
    if (i >= lines.length) {
      active = false;
      if (typeTimer) typeTimer.remove(false);
      box.destroy(); who.destroy(); text.destroy(); hint.destroy();
      scene.input.keyboard?.off("keydown-SPACE", next);
      scene.input.keyboard?.off("keydown-ENTER", next);
      scene.events.off("vinput-action", next);
      scene.input.off("pointerdown", next);
      onDone?.();
      return;
    }
    who.setText(lines[i].who.toUpperCase());
    startTyping(lines[i].text.toUpperCase());
    i++;
  };
  next();
  scene.input.keyboard?.on("keydown-SPACE", next);
  scene.input.keyboard?.on("keydown-ENTER", next);
  scene.events.on("vinput-action", next);
  // Defer pointerdown registration so the click/tap that opened the dialog
  // does not immediately advance it.
  scene.time.delayedCall(120, () => {
    if (active) scene.input.on("pointerdown", next);
  });

  return { dismiss: () => next() };
}
