import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  drawGBCPlate,
  STAT_ICON_FRAME,
  toggleLcd,
  reapplyLcd,
  textHeightPx,
  fitSingleLineText,
} from "../gbcArt";
import type { SaveSlot, Stats } from "../types";
import { ACT_BY_SCENE, SCENE_LABEL } from "../types";
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
import {
  HUD_EVENTS,
  type StatChangedPayload,
  type FragmentChangedPayload,
  type ShardGainedPayload,
  type StatKey,
} from "../ui/hudSignals";
import { openSettings } from "./settings";
import {
  setHudSnapshot,
  setSceneSnapshot,
  setOverlaySnapshot,
  setDialogSnapshot,
  clearDialogSnapshot,
} from "../gameUiBridge";
import {
  subscribeVirtualInput,
  getVirtualState,
  clearVirtualInput,
} from "../virtualInput";

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

  // --- Top stats bar (framed plate, icons + numbers) ---
  const BAR_H = 13;
  const plate = drawGBCPlate(scene, 0, 0, GBC_W, BAR_H, 200, "dark");
  void plate;

  const STAT_KEYS: StatKey[] = ["clarity", "compassion", "courage"];
  const groups: Record<StatKey, { icon: Phaser.GameObjects.Image; num: GBCText; cx: number }> =
    {} as never;
  STAT_KEYS.forEach((k, i) => {
    const cx = 4 + i * 22;
    const icon = scene.add
      .image(cx, 3, "stat_icons", STAT_ICON_FRAME[k])
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(201);
    const num = new GBCText(scene, cx + 8, 3, "0", {
      color: COLOR.textLight,
      depth: 201,
      scrollFactor: 0,
    });
    groups[k] = { icon, num, cx };
  });

  const refresh = () => {
    const s = getStats();
    groups.clarity.num.setText(String(s.clarity));
    groups.compassion.num.setText(String(s.compassion));
    groups.courage.num.setText(String(s.courage));
  };
  refresh();
  scene.events.on("stats-changed", refresh);

  // Animate ONLY on explicit hud-stat-changed event (not on first paint).
  const onStatChanged = (p: StatChangedPayload) => {
    refresh();
    const g = groups[p.stat];
    if (!g) return;
    // icon flash to gold
    const origTint = 0xffffff;
    g.icon.setTint(0xffe098);
    scene.time.delayedCall(280, () => g.icon.setTint(origTint));
    // number bump
    g.num.obj.setScale(1);
    scene.tweens.add({
      targets: g.num.obj,
      scaleX: { from: 1.6, to: 1 },
      scaleY: { from: 1.6, to: 1 },
      duration: 260,
      ease: "Back.out",
    });
  };
  scene.events.on(HUD_EVENTS.statChanged, onStatChanged);

  // --- "SAVED" indicator (top-right) ---
  const savedText = new GBCText(scene, GBC_W - 24, 3, "", {
    color: COLOR.textGold,
    depth: 202,
    scrollFactor: 0,
  });
  let savedTween: Phaser.Tweens.Tween | null = null;
  let lastSavedAt = 0;
  const onSaved = () => {
    const now = Date.now();
    if (now - lastSavedAt < 800) return;
    lastSavedAt = now;
    savedText.setText("SAVED");
    savedText.obj.setAlpha(1);
    savedTween?.stop();
    savedTween = scene.tweens.add({
      targets: savedText.obj,
      alpha: 0,
      duration: 1400,
      delay: 600,
      onComplete: () => savedText.setText(""),
    });
  };
  window.addEventListener("hermetic-saved", onSaved);
  scene.events.once("shutdown", () => {
    window.removeEventListener("hermetic-saved", onSaved);
    scene.events.off(HUD_EVENTS.statChanged, onStatChanged);
  });
  scene.events.once("destroy", () => {
    window.removeEventListener("hermetic-saved", onSaved);
    scene.events.off(HUD_EVENTS.statChanged, onStatChanged);
  });

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

  // --- ART UPGRADE: Player "Illusion of Life" (idle breathing) ---
  const idleBop = scene.tweens.add({
    targets: sprite,
    scaleY: 1.04,
    scaleX: 0.98,
    y: sprite.y - 0.5,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });
  c.setData("idleBop", idleBop);
  // --- END ART UPGRADE ---

  // --- ART UPGRADE: Contextual Footsteps ---
  if (!scene.textures.exists("footstep_dust")) {
    const gr = scene.make.graphics({ x: 0, y: 0 }, false);
    gr.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 1);
    gr.generateTexture("footstep_dust", 2, 1);
    gr.destroy();
  }

  const footsteps = scene.add
    .particles(0, 0, "footstep_dust", {
      scale: { start: 1, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 350,
      speedY: { min: -5, max: 0 },
      speedX: { min: -2, max: 2 },
      blendMode: "ADD",
      frequency: -1,
    })
    .setDepth(c.depth - 1);

  c.setData("footsteps", footsteps);
  c.setData("lastTrail", 0);
  c.setData("walkTimer", 0);
  // --- END ART UPGRADE ---

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
  if (accs) {
    Object.values(accs).forEach((a) => {
      a.setVisible(skin === "living");
      a.setAlpha(1);
      a.clearTint();
    });
  }
  c.setData("transitionAmount", skin === "soul" ? 1 : 0);
}

export function setRowanTransition(c: Phaser.GameObjects.Container, amount: number) {
  const a = Phaser.Math.Clamp(amount, 0, 1);
  const sprite = c.getData("sprite") as Phaser.GameObjects.Sprite | undefined;
  if (!sprite) return;

  const r = Math.round(Phaser.Math.Linear(255, 234, a));
  const g = Math.round(Phaser.Math.Linear(255, 242, a));
  const b = Math.round(Phaser.Math.Linear(255, 255, a));
  const tint = Phaser.Display.Color.GetColor(r, g, b);

  sprite.setAlpha(Phaser.Math.Linear(1, 0.84, a));
  sprite.setTint(tint);

  const accs = c.getData("accessories") as Record<string, Phaser.GameObjects.Sprite> | undefined;
  if (accs) {
    Object.values(accs).forEach((acc) => {
      if (!acc.visible) return;
      acc.setAlpha(Phaser.Math.Linear(1, 0.3, a));
      acc.setTint(tint);
    });
  }

  c.setData("transitionAmount", a);
}

export function animateRowan(c: Phaser.GameObjects.Container, dx: number, dy: number) {
  const sprite = c.getData("sprite") as Phaser.GameObjects.Sprite | undefined;
  if (!sprite) return;
  const scene = c.scene;
  let dir = c.getData("dir") as string;
  const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
  const anims = sprite.scene.anims;

  if (moving) {
    // 1. Base directional animation (preserve existing rowan_<dir> keys)
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
    else dir = dy > 0 ? "down" : "up";
    c.setData("dir", dir);
    const key = `rowan_${dir}`;
    if (anims.exists(key) && sprite.anims.currentAnim?.key !== key) sprite.play(key);

    // Pause the idle breathing tween so the procedural walk-bop owns the sprite.
    const idleBop = c.getData("idleBop") as Phaser.Tweens.Tween | undefined;
    if (idleBop && idleBop.isPlaying()) idleBop.pause();

    const now = scene.time.now;

    // 2. Ethereal Ghost Trails
    if (now - ((c.getData("lastTrail") as number) || 0) > 120) {
      c.setData("lastTrail", now);
      const ghost = scene.add
        .sprite(c.x, c.y, sprite.texture.key, sprite.frame.name)
        .setOrigin(0.5, 0.7)
        .setDepth(c.depth - 1)
        .setTint(0x88c0e8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.4);

      scene.tweens.add({
        targets: ghost,
        alpha: 0,
        scaleX: 1.15,
        scaleY: 1.15,
        y: ghost.y - 6,
        duration: 500,
        ease: "Quad.out",
        onComplete: () => ghost.destroy(),
      });
    }

    // 3. Contextual Footstep Particles
    const footsteps = c.getData("footsteps") as Phaser.GameObjects.Particles.ParticleEmitter | undefined;
    if (footsteps && now % 250 < 30) {
      const isWater = ["Albedo", "Nigredo", "ImaginalRealm"].includes(scene.scene.key);
      footsteps.particleTint = isWater ? 0x88c0e8 : 0xd8a060;
      footsteps.emitParticleAt(c.x, c.y + 8, 1);
    }

    // 4. Procedural Walk Bop (Squash & Stretch)
    let walkTimer = (c.getData("walkTimer") as number) || 0;
    walkTimer += scene.game.loop.delta;
    c.setData("walkTimer", walkTimer);

    const bopSpeed = 0.015;
    sprite.y = Math.sin(walkTimer * bopSpeed) * 1.5;
    sprite.scaleY = 1 + Math.sin(walkTimer * bopSpeed) * 0.04;
    sprite.scaleX = 1 - Math.sin(walkTimer * bopSpeed) * 0.02;
  } else {
    const key = `rowan_${dir}_idle`;
    if (anims.exists(key) && sprite.anims.currentAnim?.key !== key) sprite.play(key);

    // Smoothly reset the procedural bop and resume the idle breathing tween.
    if ((c.getData("walkTimer") as number) !== 0) {
      c.setData("walkTimer", 0);
      scene.tweens.add({
        targets: sprite,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: "Sine.out",
        onComplete: () => {
          const idleBop = c.getData("idleBop") as Phaser.Tweens.Tween | undefined;
          if (idleBop && idleBop.isPaused()) idleBop.resume();
        },
      });
    }
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
  const boxX = 4;
  const boxW = GBC_W - 8;
  const innerW = boxW - 16;
  const MIN_H = 44;
  const MAX_H = 64;

  // Box + text are recreated whenever a new line advances so the box can
  // resize to fit the wrapped body.
  let box: ReturnType<typeof drawGBCBox> | null = null;
  let who: GBCText | null = null;
  let text: GBCText | null = null;
  let hint: GBCText | null = null;
  let hintTween: Phaser.Tweens.Tween | null = null;

  const destroyChrome = () => {
    box?.destroy();
    who?.destroy();
    text?.destroy();
    hint?.destroy();
    hintTween?.stop();
    box = null;
    who = null;
    text = null;
    hint = null;
    hintTween = null;
  };

  const buildChromeFor = (whoLine: string, bodyLine: string) => {
    destroyChrome();
    const bodyH = textHeightPx(bodyLine.toUpperCase(), innerW);
    const boxH = Math.max(MIN_H, Math.min(MAX_H, bodyH + 22));
    const boxY = GBC_H - boxH - 2;
    box = drawGBCBox(scene, boxX, boxY, boxW, boxH, 250);
    who = new GBCText(scene, boxX + 6, boxY + 4, fitSingleLineText(whoLine, innerW), {
      color: COLOR.textAccent,
      depth: 251,
      scrollFactor: 0,
    });
    text = new GBCText(scene, boxX + 6, boxY + 14, "", {
      color: COLOR.textLight,
      depth: 251,
      scrollFactor: 0,
      maxWidthPx: innerW,
    });
    hint = new GBCText(scene, boxX + boxW - 10, boxY + boxH - 8, "▼", {
      color: COLOR.textAccent,
      depth: 251,
      scrollFactor: 0,
    });
    hintTween = scene.tweens.add({
      targets: hint.obj,
      alpha: 0.25,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  };

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
    text?.setText(fullText);
    typing = false;
    hint?.setVisible(true);
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
    hint?.setVisible(false);
    let n = 0;
    text?.setText("");
    if (typeTimer) typeTimer.remove(false);
    typeTimer = scene.time.addEvent({
      delay: 28,
      repeat: s.length - 1,
      callback: () => {
        n++;
        text?.setText(s.slice(0, n));
        const ch = s[n - 1];
        if (n % 4 === 0 && ch && ch !== " ") getAudio().sfx("dialog");
        if (n >= s.length) {
          typing = false;
          hint?.setVisible(true);
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
      destroyChrome();
      cleanupKb();
      scene.events.off("vinput-action", next);
      scene.input.off("pointerdown", next);
      onDone?.();
      return;
    }
    const line = lines[i];
    buildChromeFor(line.who, line.text);
    startTyping(line.text.toUpperCase());
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

// ============================================================================
// Imaginal-only progress badge — small upper-right plate with fragment pips
// (0..3) and current full-shard count. Driven entirely by HUD events.
// ============================================================================
export type ImaginalBadgeHandle = { destroy: () => void };

export function mountImaginalProgressBadge(
  scene: Phaser.Scene,
  initial: { fragments: number; shards: number },
): ImaginalBadgeHandle {
  const W = 50;
  const H = 11;
  const X = GBC_W - W - 2;
  const Y = 15;
  const plate = drawGBCPlate(scene, X, Y, W, H, 198, "dark");
  const pips: Phaser.GameObjects.Arc[] = [];
  for (let i = 0; i < 3; i++) {
    const dot = scene.add
      .circle(X + 4 + i * 4, Y + 5, 1.4, 0xe8c860, 0)
      .setStrokeStyle(0.5, 0xa87830, 1)
      .setScrollFactor(0)
      .setDepth(199);
    pips.push(dot);
  }
  const label = new GBCText(scene, X + 18, Y + 2, "", {
    color: COLOR.textLight,
    depth: 199,
    scrollFactor: 0,
  });
  const paint = (frag: number, sh: number) => {
    for (let i = 0; i < 3; i++) pips[i].setFillStyle(0xe8c860, i < frag ? 1 : 0);
    label.setText(`SHD ${sh}`);
  };
  paint(initial.fragments, initial.shards);
  const onFrag = (p: FragmentChangedPayload) => {
    paint(p.fragments, p.shards);
    const idx = Math.max(0, Math.min(2, p.fragments - 1));
    const dot = pips[idx];
    if (dot && p.fragments > 0) {
      dot.setScale(1);
      scene.tweens.add({
        targets: dot,
        scaleX: { from: 2.2, to: 1 },
        scaleY: { from: 2.2, to: 1 },
        duration: 320,
        ease: "Back.out",
      });
    }
  };
  const onShard = (p: ShardGainedPayload) => {
    paint(0, p.shards);
    const chip = new GBCText(scene, X + 6, Y + 1, "+1 SHD", {
      color: COLOR.textGold,
      depth: 230,
      scrollFactor: 0,
    });
    scene.tweens.add({
      targets: chip.obj,
      y: Y - 8,
      alpha: { from: 1, to: 0 },
      duration: 1100,
      ease: "Sine.out",
      onComplete: () => chip.destroy(),
    });
  };
  scene.events.on(HUD_EVENTS.fragmentChanged, onFrag);
  scene.events.on(HUD_EVENTS.shardGained, onShard);
  const destroy = () => {
    scene.events.off(HUD_EVENTS.fragmentChanged, onFrag);
    scene.events.off(HUD_EVENTS.shardGained, onShard);
    pips.forEach((p) => p.destroy());
    label.destroy();
    plate.destroy();
  };
  scene.events.once("shutdown", destroy);
  scene.events.once("destroy", destroy);
  return { destroy };
}
