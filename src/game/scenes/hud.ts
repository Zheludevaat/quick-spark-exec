import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, toggleLcd, reapplyLcd } from "../gbcArt";
import type { SaveSlot, Stats } from "../types";
import { getAudio } from "../audio";
import { loadSave } from "../save";
import { openLoreLog } from "./lore";
import {
  getControls,
  subscribeControls,
  isActionDown,
  normalizeKeyEvent,
  buzz,
  type GameAction,
  type ButtonSize,
} from "../controls";
import { openSettings } from "./settings";

/**
 * Reusable on-screen HUD: stats top bar + virtual pad + A/B/menu for touch.
 * Emits scene events: "vinput-down" / "vinput-up" with a dir string,
 * and "vinput-action" / "vinput-cancel".
 */

type TouchPadHandle = {
  destroy(): void;
};

export function attachHUD(scene: Phaser.Scene, getStats: () => Stats) {
  const cam = scene.cameras.main;
  cam.setRoundPixels(true);

  reapplyLcd(scene);

  let loreOpen = false;
  let settingsOpen = false;

  const openSettingsGuarded = () => {
    if (settingsOpen) return;
    settingsOpen = true;
    scene.data.set("__settingsOpen", true);
    openSettings(scene, () => {
      settingsOpen = false;
      scene.data.set("__settingsOpen", false);
      rebuildPad();
    });
  };
  const openLoreGuarded = () => {
    if (loreOpen || settingsOpen) return;
    const s: SaveSlot | null = loadSave();
    if (!s) return;
    loreOpen = true;
    scene.data.set("__loreOpen", true);
    openLoreLog(scene, s, () => {
      loreOpen = false;
      scene.data.set("__loreOpen", false);
    });
  };
  // Expose for gear / lore touch buttons.
  scene.data.set("__openSettingsGuarded", openSettingsGuarded);
  scene.data.set("__openLoreGuarded", openLoreGuarded);

  // --- Global keyboard shortcuts via DOM (so rebinds apply live) ---
  const onDomKey = (e: KeyboardEvent) => {
    const name = normalizeKeyEvent(e);
    if (!name) return;
    const c = getControls();
    const matches = (a: GameAction) =>
      name === c.bindings[a].primary || name === c.bindings[a].secondary;

    if (matches("lcd")) toggleLcd(scene);
    else if (matches("mute")) {
      const a = getAudio();
      a.setMuted(!a.muted);
    } else if (matches("lore")) {
      openLoreGuarded();
    } else if (matches("settings")) {
      openSettingsGuarded();
    }
  };
  window.addEventListener("keydown", onDomKey);
  scene.events.once("shutdown", () => window.removeEventListener("keydown", onDomKey));
  scene.events.once("destroy", () => window.removeEventListener("keydown", onDomKey));

  // --- Top stats bar ---
  scene.add
    .rectangle(0, 0, GBC_W, 11, 0x0a0e1a, 0.92)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(200);
  scene.add
    .rectangle(0, 11, GBC_W, 1, 0x7889a8, 1)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(200);
  const text = new GBCText(scene, 3, 2, "", {
    color: COLOR.textLight,
    depth: 201,
    scrollFactor: 0,
  });
  const refresh = () => {
    const s = getStats();
    text.setText(`CL${s.clarity} CM${s.compassion} CO${s.courage}`);
  };
  refresh();
  scene.events.on("stats-changed", refresh);

  // --- "SAVED" indicator (top-right of stats bar) ---
  const savedText = new GBCText(scene, GBC_W - 28, 2, "", {
    color: COLOR.textGold,
    depth: 202,
    scrollFactor: 0,
  });
  let savedTween: Phaser.Tweens.Tween | null = null;
  let lastSavedAt = 0;
  const onSaved = () => {
    const now = Date.now();
    if (now - lastSavedAt < 800) return; // throttle bursts
    lastSavedAt = now;
    savedText.setText("SAVED");
    savedText.obj.setAlpha(1);
    savedTween?.stop();
    savedTween = scene.tweens.add({
      targets: savedText.obj,
      alpha: 0,
      duration: 1400,
      delay: 600,
    });
  };
  window.addEventListener("hermetic-saved", onSaved);
  scene.events.once("shutdown", () => window.removeEventListener("hermetic-saved", onSaved));
  scene.events.once("destroy", () => window.removeEventListener("hermetic-saved", onSaved));

  // --- Touch pad (always available; user can hide via settings) ---
  let pad: TouchPadHandle | null = null;
  const rebuildPad = () => {
    pad?.destroy();
    const c = getControls();
    if (c.touchLayout === "off" && !shouldForceTouch(scene)) return;
    pad = buildTouchPad(scene);
  };
  rebuildPad();

  // Live-rebuild when settings change.
  const unsub = subscribeControls(rebuildPad);
  scene.events.once("shutdown", () => {
    unsub();
    pad?.destroy();
  });
  scene.events.once("destroy", () => {
    unsub();
    pad?.destroy();
  });
}

function shouldForceTouch(scene: Phaser.Scene): boolean {
  // Always show pad on touch devices regardless of "off" — too easy to lock yourself out.
  return scene.sys.game.device.input.touch;
}

// ============================================================================
// VIRTUAL PAD
// ============================================================================
/**
 * The pad is drawn in Phaser game-space. All sizes are in game pixels, then
 * scaled by Phaser FIT to fill the canvas. On a typical iPhone the canvas
 * displays at ~3-4× scale, which makes 16-px buttons → ~50-66 CSS px.
 *
 * Layouts:
 *   - dpad   : classic 4-direction d-pad on the left, A/B on the right
 *   - swipe  : full-screen invisible "swipe-anywhere" left-half + A/B right
 *   - hybrid : both — d-pad visible AND swipe-anywhere works (default)
 *   - off    : nothing (forced on for touch devices anyway)
 */
function sizeFor(s: ButtonSize): { d: number; ab: number; menu: number } {
  switch (s) {
    case "s":
      return { d: 8, ab: 7, menu: 6 };
    case "m":
      return { d: 10, ab: 8, menu: 7 };
    case "l":
      return { d: 12, ab: 10, menu: 7 };
    case "xl":
      return { d: 14, ab: 12, menu: 8 };
  }
}

function buildTouchPad(scene: Phaser.Scene): TouchPadHandle {
  const c = getControls();
  const { d, ab, menu } = sizeFor(c.buttonSize);
  const padDepthBg = 195;
  const padDepth = 196;
  const padDepthHi = 197;
  const created: Phaser.GameObjects.GameObject[] = [];

  // D-pad anchor (lower-left by default; mirror to right if leftHanded)
  const padCx = c.leftHanded ? GBC_W - 22 : 22;
  const padCy = GBC_H - 22;

  // A/B anchor (opposite side)
  const abCx = c.leftHanded ? 22 : GBC_W - 18;
  const abCy = GBC_H - 22;

  // Settings gear top-right (sits just below the stats bar so its hit zone
  // never collides with the SAVED indicator or the stats text).
  const gearX = GBC_W - 8,
    gearY = 18;

  const showDpad =
    c.touchLayout === "dpad" ||
    c.touchLayout === "hybrid" ||
    (c.touchLayout === "off" && shouldForceTouch(scene));
  const useSwipe =
    c.touchLayout === "swipe" ||
    c.touchLayout === "hybrid" ||
    (c.touchLayout === "off" && shouldForceTouch(scene));

  // ----- D-pad visible buttons -----
  if (showDpad) {
    const pressVis = new Map<string, Phaser.GameObjects.Rectangle>();
    const mkBtn = (cx: number, cy: number, w: number, h: number, dir: string, label: string) => {
      // backdrop ring for visibility on dark and light bgs
      const ring = scene.add
        .rectangle(cx, cy, w + 2, h + 2, 0xdde6f5, 0.35)
        .setScrollFactor(0)
        .setDepth(padDepthBg);
      const vis = scene.add
        .rectangle(cx, cy, w, h, 0x222a3a, 0.8)
        .setScrollFactor(0)
        .setDepth(padDepth);
      vis.setStrokeStyle(1, 0x6a7a98, 0.9);
      const lbl = new GBCText(scene, cx - 2, cy - 3, label, {
        color: COLOR.textLight,
        depth: padDepthHi,
        scrollFactor: 0,
      });
      // Wider hit zone than visual for fat-finger forgiveness.
      const hit = scene.add
        .zone(cx, cy, w + 6, h + 6)
        .setScrollFactor(0)
        .setOrigin(0.5)
        .setDepth(padDepth + 5)
        .setInteractive();
      pressVis.set(dir, vis);
      const down = () => {
        vis.setFillStyle(0x6a90c8, 0.9);
        buzz(8);
        scene.events.emit("vinput-down", dir);
      };
      const up = () => {
        vis.setFillStyle(0x222a3a, 0.8);
        scene.events.emit("vinput-up", dir);
      };
      hit.on("pointerdown", down);
      hit.on("pointerup", up);
      hit.on("pointerout", up);
      hit.on("pointerupoutside", up);
      created.push(ring, vis, lbl.obj, hit);
    };
    mkBtn(padCx, padCy - (d + 2), d + 2, d, "up", "↑");
    mkBtn(padCx, padCy + (d + 2), d + 2, d, "down", "↓");
    mkBtn(padCx - (d + 2), padCy, d, d + 2, "left", "←");
    mkBtn(padCx + (d + 2), padCy, d, d + 2, "right", "→");
    void pressVis;
  }

  // ----- Swipe-anywhere on left half -----
  if (useSwipe) {
    // Defines an invisible zone that interprets drags as 4-directional held input.
    const swipeZone = scene.add
      .zone(0, 11, GBC_W / 2 - 4, GBC_H - 22)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(180)
      .setInteractive();
    const cur = { up: false, down: false, left: false, right: false };
    const release = () => {
      (["up", "down", "left", "right"] as const).forEach((k) => {
        if (cur[k]) {
          cur[k] = false;
          scene.events.emit("vinput-up", k);
        }
      });
    };
    let originX = 0,
      originY = 0;
    let active = false;
    const dead = 4; // game-space pixels
    swipeZone.on("pointerdown", (p: Phaser.Input.Pointer) => {
      active = true;
      // Convert to game-space — pointer.x is already in game-space because
      // the zone's container is at depth 180 in scene coords.
      originX = p.worldX || p.x;
      originY = p.worldY || p.y;
    });
    swipeZone.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!active || !p.isDown) return;
      const dx = (p.worldX || p.x) - originX;
      const dy = (p.worldY || p.y) - originY;
      const next = { up: dy < -dead, down: dy > dead, left: dx < -dead, right: dx > dead };
      // Disallow opposing simultaneously
      if (next.up && next.down) {
        next.up = false;
        next.down = false;
      }
      if (next.left && next.right) {
        next.left = false;
        next.right = false;
      }
      (["up", "down", "left", "right"] as const).forEach((k) => {
        if (next[k] && !cur[k]) {
          cur[k] = true;
          scene.events.emit("vinput-down", k);
        } else if (!next[k] && cur[k]) {
          cur[k] = false;
          scene.events.emit("vinput-up", k);
        }
      });
    });
    const stop = () => {
      active = false;
      release();
    };
    swipeZone.on("pointerup", stop);
    swipeZone.on("pointerupoutside", stop);
    swipeZone.on("pointerout", stop);
    created.push(swipeZone);
  }

  // ----- A button -----
  {
    const ring = scene.add
      .circle(abCx, abCy, ab + 2, 0xdde6f5, 0.35)
      .setScrollFactor(0)
      .setDepth(padDepthBg);
    const vis = scene.add.circle(abCx, abCy, ab, 0xd84a4a, 1).setScrollFactor(0).setDepth(padDepth);
    vis.setStrokeStyle(1, 0xffd8d8, 0.9);
    const lbl = new GBCText(scene, abCx - 3, abCy - 3, "A", {
      color: COLOR.textLight,
      depth: padDepthHi,
      scrollFactor: 0,
    });
    const hit = scene.add
      .zone(abCx, abCy, ab * 2 + 8, ab * 2 + 8)
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(padDepth + 5)
      .setInteractive();
    hit.on("pointerdown", () => {
      vis.setScale(0.85);
      buzz(10);
      scene.events.emit("vinput-action");
    });
    hit.on("pointerup", () => vis.setScale(1));
    hit.on("pointerout", () => vis.setScale(1));
    hit.on("pointerupoutside", () => vis.setScale(1));
    created.push(ring, vis, lbl.obj, hit);
  }

  // ----- B button -----
  {
    const bx = abCx - (ab * 2 + 4) * (c.leftHanded ? -1 : 1);
    const by = abCy + ab + 4;
    const ring = scene.add
      .circle(bx, by, ab - 1 + 2, 0xdde6f5, 0.35)
      .setScrollFactor(0)
      .setDepth(padDepthBg);
    const vis = scene.add
      .circle(bx, by, ab - 1, 0xe0c060, 1)
      .setScrollFactor(0)
      .setDepth(padDepth);
    vis.setStrokeStyle(1, 0xfff3c0, 0.9);
    const lbl = new GBCText(scene, bx - 3, by - 3, "B", {
      color: COLOR.textLight,
      depth: padDepthHi,
      scrollFactor: 0,
    });
    const hit = scene.add
      .zone(bx, by, (ab - 1) * 2 + 8, (ab - 1) * 2 + 8)
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(padDepth + 5)
      .setInteractive();
    hit.on("pointerdown", () => {
      vis.setScale(0.85);
      buzz(10);
      scene.events.emit("vinput-cancel");
    });
    hit.on("pointerup", () => vis.setScale(1));
    hit.on("pointerout", () => vis.setScale(1));
    hit.on("pointerupoutside", () => vis.setScale(1));
    created.push(ring, vis, lbl.obj, hit);
  }

  // ----- Settings gear (top-right) -----
  {
    const vis = scene.add
      .circle(gearX, gearY, menu, 0x2a3550, 0.9)
      .setScrollFactor(0)
      .setDepth(padDepth);
    vis.setStrokeStyle(1, 0xa8c8e8, 0.9);
    const lbl = new GBCText(scene, gearX - 2, gearY - 3, "≡", {
      color: COLOR.textLight,
      depth: padDepthHi,
      scrollFactor: 0,
    });
    const hit = scene.add
      .zone(gearX, gearY, menu * 2 + 6, menu * 2 + 6)
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(padDepth + 5)
      .setInteractive();
    let opening = false;
    hit.on("pointerdown", () => {
      if (opening) return;
      opening = true;
      buzz(15);
      const guarded = scene.data.get("__openSettingsGuarded") as (() => void) | undefined;
      if (guarded) guarded();
      else
        openSettings(scene, () => {
          opening = false;
        });
      // Reset opening flag shortly so the next tap works after settings closes.
      scene.time.delayedCall(400, () => {
        opening = false;
      });
    });
    created.push(vis, lbl.obj, hit);
  }

  // ----- Lore button (small, top-left of HUD strip) -----
  {
    // Lore button — sits just below the stats bar to keep the bar's text
    // (and the SAVED indicator) free of the touch hit zone.
    const lx = 4,
      ly = 18;
    const w = 14,
      h = 8;
    const vis = scene.add
      .rectangle(lx, ly, w, h, 0x2a3550, 0)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(padDepth);
    vis.setStrokeStyle(1, 0xa8c8e8, 0);
    const hit = scene.add
      .zone(lx + w / 2, ly, w + 4, h + 4)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(padDepth + 5)
      .setInteractive();
    hit.on("pointerdown", () => {
      buzz(8);
      const guarded = scene.data.get("__openLoreGuarded") as (() => void) | undefined;
      if (guarded) guarded();
      else {
        const s = loadSave();
        if (s) openLoreLog(scene, s);
      }
    });
    created.push(vis, hit);
  }

  return {
    destroy() {
      created.forEach((o) => {
        try {
          o.destroy();
        } catch {
          /* ignore */
        }
      });
    },
  };
}

// ============================================================================
// InputState — merges keyboard (with rebinds) + virtual pad
// ============================================================================
export class InputState {
  up = false;
  down = false;
  left = false;
  right = false;
  private scene: Phaser.Scene;
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.events.on("vinput-down", (dir: string) => {
      (this as Record<string, unknown>)[dir] = true;
    });
    scene.events.on("vinput-up", (dir: string) => {
      (this as Record<string, unknown>)[dir] = false;
    });
  }
  poll() {
    return {
      up: this.up || isActionDown(this.scene, "up"),
      down: this.down || isActionDown(this.scene, "down"),
      left: this.left || isActionDown(this.scene, "left"),
      right: this.right || isActionDown(this.scene, "right"),
    };
  }
}

// ============================================================================
// Rowan helpers (unchanged)
// ============================================================================
export type RowanSkin = "living" | "soul";

export function makeRowan(scene: Phaser.Scene, x: number, y: number, skin: RowanSkin = "living") {
  const c = scene.add.container(x, y);
  const sprite = scene.add.sprite(0, 0, "rowan", 0).setOrigin(0.5, 0.7);
  if (scene.anims.exists("rowan_down_idle")) sprite.play("rowan_down_idle");
  c.add([sprite]);
  c.setSize(16, 24);
  c.setData("sprite", sprite);
  c.setData("dir", "down");
  c.setData("skin", skin);

  const accessoryKeys: ("scarf" | "coat" | "boots" | "satchel")[] = [
    "scarf",
    "coat",
    "boots",
    "satchel",
  ];
  const accessories: Record<string, Phaser.GameObjects.Sprite> = {};
  accessoryKeys.forEach((k, i) => {
    const a = scene.add.sprite(0, 0, "rowan_acc", i).setOrigin(0.5, 0.7);
    a.setVisible(skin === "living");
    c.add(a);
    accessories[k] = a;
  });
  c.setData("accessories", accessories);

  if (skin === "soul") {
    sprite.setAlpha(0.85);
    sprite.setTint(0xeaf2ff);
  }
  return c;
}

export function shedAccessory(
  scene: Phaser.Scene,
  c: Phaser.GameObjects.Container,
  which: "scarf" | "coat" | "boots" | "satchel",
) {
  const accs = c.getData("accessories") as Record<string, Phaser.GameObjects.Sprite> | undefined;
  if (!accs || !accs[which] || !accs[which].visible) return;
  const a = accs[which];
  const wx = c.x,
    wy = c.y;
  c.remove(a);
  a.setPosition(wx, wy);
  scene.add.existing(a);
  a.setDepth(50);
  switch (which) {
    case "scarf":
      scene.tweens.add({
        targets: a,
        y: wy - 30,
        alpha: 0,
        duration: 1400,
        ease: "Sine.out",
        onComplete: () => a.destroy(),
      });
      break;
    case "coat":
      scene.tweens.add({
        targets: a,
        y: wy + 6,
        alpha: 0,
        duration: 900,
        ease: "Quad.in",
        onComplete: () => a.destroy(),
      });
      break;
    case "boots":
      scene.tweens.add({
        targets: a,
        alpha: 0,
        scaleY: 0.4,
        duration: 900,
        ease: "Sine.in",
        onComplete: () => a.destroy(),
      });
      break;
    case "satchel":
      scene.tweens.add({
        targets: a,
        y: wy + 4,
        alpha: 0,
        duration: 900,
        ease: "Quad.in",
        onComplete: () => a.destroy(),
      });
      break;
  }
  delete accs[which];
}

export function setRowanSkin(c: Phaser.GameObjects.Container, skin: RowanSkin) {
  const sprite = c.getData("sprite") as Phaser.GameObjects.Sprite | undefined;
  if (!sprite) return;
  c.setData("skin", skin);
  if (skin === "soul") {
    sprite.setAlpha(0.85);
    sprite.setTint(0xeaf2ff);
  } else {
    sprite.setAlpha(1);
    sprite.clearTint();
  }
  const accs = c.getData("accessories") as Record<string, Phaser.GameObjects.Sprite> | undefined;
  if (accs) Object.values(accs).forEach((a) => a.setVisible(skin === "living"));
}

export function animateRowan(c: Phaser.GameObjects.Container, dx: number, dy: number) {
  const sprite = c.getData("sprite") as Phaser.GameObjects.Sprite | undefined;
  if (!sprite) return;
  let dir = c.getData("dir") as string;
  const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
  const anims = sprite.scene.anims;
  if (moving) {
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
    else dir = dy > 0 ? "down" : "up";
    c.setData("dir", dir);
    const key = `rowan_${dir}`;
    if (anims.exists(key) && sprite.anims.currentAnim?.key !== key) sprite.play(key);
  } else {
    const key = `rowan_${dir}_idle`;
    if (anims.exists(key) && sprite.anims.currentAnim?.key !== key) sprite.play(key);
  }
  const accs = c.getData("accessories") as Record<string, Phaser.GameObjects.Sprite> | undefined;
  if (accs) {
    Object.values(accs).forEach((a) => a.setFrame(a.frame.name));
  }
}

// ============================================================================
// Dialog (now respects autoAdvance + skip key)
// ============================================================================
export function runDialog(
  scene: Phaser.Scene,
  lines: { who: string; text: string }[],
  onDone?: () => void,
) {
  const boxX = 4,
    boxH = 64,
    boxY = GBC_H - boxH - 2,
    boxW = GBC_W - 8;
  const box = drawGBCBox(scene, boxX, boxY, boxW, boxH, 250);
  const who = new GBCText(scene, boxX + 6, boxY + 4, "", {
    color: COLOR.textAccent,
    depth: 251,
    scrollFactor: 0,
  });
  const text = new GBCText(scene, boxX + 6, boxY + 14, "", {
    color: COLOR.textLight,
    depth: 251,
    scrollFactor: 0,
    maxWidthPx: boxW - 16,
  });
  const hint = new GBCText(scene, boxX + boxW - 10, boxY + boxH - 8, "▼", {
    color: COLOR.textAccent,
    depth: 251,
    scrollFactor: 0,
  });
  scene.tweens.add({ targets: hint.obj, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });

  let i = 0;
  let active = true;
  let typing = false;
  let fullText = "";
  let typeTimer: Phaser.Time.TimerEvent | null = null;
  let autoTimer: Phaser.Time.TimerEvent | null = null;

  const finishTyping = () => {
    if (typeTimer) {
      typeTimer.remove(false);
      typeTimer = null;
    }
    text.setText(fullText);
    typing = false;
    hint.setVisible(true);
    scheduleAuto();
  };

  const scheduleAuto = () => {
    autoTimer?.remove(false);
    autoTimer = null;
    const ms = getControls().dialogAutoAdvanceMs;
    if (ms > 0 && !typing && active) {
      autoTimer = scene.time.delayedCall(ms, () => next());
    }
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
        const ch = s[n - 1];
        if (n % 2 === 0 && ch && ch !== " ") getAudio().sfx("dialog");
        if (n >= s.length) {
          typing = false;
          hint.setVisible(true);
          typeTimer = null;
          scheduleAuto();
        }
      },
    });
  };

  const cleanupKb = () => {
    window.removeEventListener("keydown", onKey);
  };

  const next = () => {
    if (!active) return;
    if (typing) {
      finishTyping();
      return;
    }
    autoTimer?.remove(false);
    autoTimer = null;
    if (i >= lines.length) {
      active = false;
      if (typeTimer) typeTimer.remove(false);
      box.destroy();
      who.destroy();
      text.destroy();
      hint.destroy();
      cleanupKb();
      scene.events.off("vinput-action", next);
      scene.input.off("pointerdown", next);
      onDone?.();
      return;
    }
    who.setText(lines[i].who.toUpperCase());
    startTyping(lines[i].text.toUpperCase());
    i++;
  };

  // Skip = jump straight to end of all lines.
  const skipAll = () => {
    if (!active) return;
    i = lines.length;
    if (typeTimer) typeTimer.remove(false);
    typing = false;
    next();
  };

  const onKey = (e: KeyboardEvent) => {
    const name = normalizeKeyEvent(e);
    if (!name) return;
    const c = getControls();
    if (name === c.bindings.action.primary || name === c.bindings.action.secondary) next();
    else if (name === c.bindings.skip.primary || name === c.bindings.skip.secondary) skipAll();
  };

  next();
  window.addEventListener("keydown", onKey);
  scene.events.on("vinput-action", next);
  scene.time.delayedCall(120, () => {
    if (active) scene.input.on("pointerdown", next);
  });

  return { dismiss: () => next() };
}
