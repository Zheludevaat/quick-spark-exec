import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCPlate,
  STAT_ICON_FRAME,
  toggleLcd,
  reapplyLcd,
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
  isTouchLandscapeMode,
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
  setModalSnapshot,
  clearModalSnapshot,
  getGameUiSnapshot,
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

  // Resolve presentation mode for this HUD instance — must match the route shell.
  const isTouchShell = isTouchLandscapeMode();

  // Publish scene metadata to React shell.
  const sceneKey = scene.scene.key;
  const sceneLabel = (SCENE_LABEL as Record<string, string>)[sceneKey] ?? sceneKey;
  const act = (ACT_BY_SCENE as Record<string, number>)[sceneKey] ?? 1;
  setSceneSnapshot({ key: sceneKey, label: sceneLabel, act, zone: null, nodes: null, marker: null });

  let loreOpen = false;
  let settingsOpen = false;
  let activeSettingsCloseHandler: (() => void) | null = null;
  let activeLoreCloseHandler: (() => void) | null = null;

  const removeSettingsCloseListener = () => {
    if (activeSettingsCloseHandler) {
      window.removeEventListener("hermetic-settings-close", activeSettingsCloseHandler);
      activeSettingsCloseHandler = null;
    }
  };

  const removeLoreCloseListener = () => {
    if (activeLoreCloseHandler) {
      window.removeEventListener("hermetic-lore-close", activeLoreCloseHandler);
      activeLoreCloseHandler = null;
    }
  };

  const forceCloseShellOwnedSurfaces = () => {
    removeSettingsCloseListener();
    removeLoreCloseListener();

    settingsOpen = false;
    loreOpen = false;
    scene.data.set("__settingsOpen", false);
    scene.data.set("__loreOpen", false);
    setOverlaySnapshot({ settingsOpen: false, loreOpen: false });

    const surface = getGameUiSnapshot().modal.surface;
    if (surface === "settings" || surface === "lore") {
      clearModalSnapshot();
    }
  };

  const openSettingsGuarded = () => {
    if (settingsOpen) return;
    settingsOpen = true;
    scene.data.set("__settingsOpen", true);
    // Patch only our own flag — let the shell derive modalLock from
    // the composite overlay state (settings | lore | inventory).
    setOverlaySnapshot({ settingsOpen: true });
    clearVirtualInput();

    if (!isTouchShell) {
      // Desktop: shell owns the rendering. Publish modal surface and let
      // DesktopModalHost render the React settings panel. We listen for
      // a window event the shell fires when the user closes it.
      setModalSnapshot({
        surface: "settings",
        mode: "shell",
        title: "SETTINGS",
        subtitle: null,
        blocking: true,
      });
      removeSettingsCloseListener();
      activeSettingsCloseHandler = () => {
        removeSettingsCloseListener();
        settingsOpen = false;
        scene.data.set("__settingsOpen", false);
        setOverlaySnapshot({ settingsOpen: false });
        if (getGameUiSnapshot().modal.surface === "settings") {
          clearModalSnapshot();
        }
        rebuildPad();
      };
      window.addEventListener("hermetic-settings-close", activeSettingsCloseHandler);
      return;
    }

    openSettings(scene, () => {
      settingsOpen = false;
      scene.data.set("__settingsOpen", false);
      setOverlaySnapshot({ settingsOpen: false });
      rebuildPad();
    });
  };
  const openLoreGuarded = () => {
    if (loreOpen || settingsOpen) return;
    const s: SaveSlot | null = loadSave();
    if (!s) return;
    loreOpen = true;
    scene.data.set("__loreOpen", true);
    setOverlaySnapshot({ loreOpen: true });
    clearVirtualInput();

    if (!isTouchShell) {
      // Desktop: shell-owned lore log.
      setModalSnapshot({
        surface: "lore",
        mode: "shell",
        title: "LORE LOG",
        subtitle: null,
        blocking: true,
      });
      removeLoreCloseListener();
      activeLoreCloseHandler = () => {
        removeLoreCloseListener();
        loreOpen = false;
        scene.data.set("__loreOpen", false);
        setOverlaySnapshot({ loreOpen: false });
        if (getGameUiSnapshot().modal.surface === "lore") {
          clearModalSnapshot();
        }
      };
      window.addEventListener("hermetic-lore-close", activeLoreCloseHandler);
      return;
    }

    openLoreLog(scene, s, () => {
      loreOpen = false;
      scene.data.set("__loreOpen", false);
      setOverlaySnapshot({ loreOpen: false });
    });
  };
  const returnToTitleGuarded = () => {
    if (scene.scene.key === "Title") return;

    forceCloseShellOwnedSurfaces();

    // Release shell-owned modal/overlay state first so the desktop shell
    // does not remain visually "stuck" during the scene transition.
    settingsOpen = false;
    loreOpen = false;
    scene.data.set("__settingsOpen", false);
    scene.data.set("__loreOpen", false);
    setOverlaySnapshot({
      settingsOpen: false,
      loreOpen: false,
      inventoryOpen: false,
      inquiryActive: false,
      playerHubOpen: false,
    });
    clearDialogSnapshot();
    clearModalSnapshot();
    clearVirtualInput();

    // Stop current music and leave the current run cleanly.
    const audio = getAudio();
    audio.music.stop();

    scene.scene.start("Title");
  };

  // Expose for gear / lore touch buttons.
  scene.data.set("__openSettingsGuarded", openSettingsGuarded);
  scene.data.set("__openLoreGuarded", openLoreGuarded);
  // Expose globally so the React shell can trigger them too.
  if (typeof window !== "undefined") {
    const w = window as unknown as Record<string, unknown>;
    w.__hermeticOpenSettings = openSettingsGuarded;
    w.__hermeticOpenLore = openLoreGuarded;
    w.__hermeticReturnToTitle = returnToTitleGuarded;
  }
  // Clear our globals on shutdown ONLY if they still point to this scene's
  // handlers — avoid clobbering a newer scene that has already replaced them.
  const cleanupShellOpenersAndListeners = () => {
    forceCloseShellOwnedSurfaces();

    if (typeof window === "undefined") return;
    const w = window as unknown as Record<string, unknown>;
    if (w.__hermeticOpenSettings === openSettingsGuarded) delete w.__hermeticOpenSettings;
    if (w.__hermeticOpenLore === openLoreGuarded) delete w.__hermeticOpenLore;
    if (w.__hermeticReturnToTitle === returnToTitleGuarded) delete w.__hermeticReturnToTitle;
  };
  scene.events.once("shutdown", cleanupShellOpenersAndListeners);
  scene.events.once("destroy", cleanupShellOpenersAndListeners);

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
  // In touch_landscape mode the React shell renders the stats strip; we
  // suppress the in-canvas bar to avoid duplication, but still wire the
  // bridge for stat snapshots.
  const STAT_KEYS: StatKey[] = ["clarity", "compassion", "courage"];
  const groups: Record<StatKey, { icon: Phaser.GameObjects.Image; num: GBCText; cx: number }> =
    {} as never;
  if (!isTouchShell) {
    const BAR_H = 13;
    const plate = drawGBCPlate(scene, 0, 0, GBC_W, BAR_H, 200, "dark");
    void plate;
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
  }

  const refresh = () => {
    const s = getStats();
    if (!isTouchShell) {
      groups.clarity.num.setText(String(s.clarity));
      groups.compassion.num.setText(String(s.compassion));
      groups.courage.num.setText(String(s.courage));
    }
    setHudSnapshot({ stats: { clarity: s.clarity, compassion: s.compassion, courage: s.courage } });
  };
  refresh();
  scene.events.on("stats-changed", refresh);

  // Animate ONLY on explicit hud-stat-changed event (not on first paint).
  const onStatChanged = (p: StatChangedPayload) => {
    refresh();
    if (isTouchShell) return;
    const g = groups[p.stat];
    if (!g) return;
    const origTint = 0xffffff;
    g.icon.setTint(0xffe098);
    scene.time.delayedCall(280, () => g.icon.setTint(origTint));
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
  const savedText = isTouchShell
    ? null
    : new GBCText(scene, GBC_W - 24, 3, "", {
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
    setHudSnapshot({ savedAt: now });
    if (savedText) {
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
    }
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

  // --- Virtual input bridge: forward DOM shell input → scene events ---
  const vinputUnsub = subscribeVirtualInput((e) => {
    if (e.type === "down") {
      if (e.action === "action") scene.events.emit("vinput-action");
      else if (e.action === "cancel") scene.events.emit("vinput-cancel");
      else scene.events.emit("vinput-down", e.action);
    } else if (e.type === "up") {
      if (e.action !== "action" && e.action !== "cancel") {
        scene.events.emit("vinput-up", e.action);
      }
    } else if (e.type === "pulse") {
      if (e.action === "action") scene.events.emit("vinput-action");
      else if (e.action === "cancel") scene.events.emit("vinput-cancel");
    } else if (e.type === "clear") {
      (["up", "down", "left", "right"] as const).forEach((d) =>
        scene.events.emit("vinput-up", d),
      );
    }
  });
  scene.events.once("shutdown", () => {
    vinputUnsub();
    clearVirtualInput();
  });
  scene.events.once("destroy", () => {
    vinputUnsub();
    clearVirtualInput();
  });
  void getVirtualState;

  // --- Touch pad (legacy in-canvas controls) ---
  // Suppressed entirely in touch_landscape mode — the React shell owns input.
  let pad: TouchPadHandle | null = null;
  const rebuildPad = () => {
    pad?.destroy();
    pad = null;
    const c = getControls();
    if (isTouchLandscapeMode()) return;
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
// Rowan helpers — layered living/soul sprites with per-skin animation sets.
// ============================================================================
export type RowanSkin = "living" | "soul";

function rowanAnimKey(skin: RowanSkin, dir: string, idle = false) {
  return `rowan_${skin}_${dir}${idle ? "_idle" : ""}`;
}

function getRowanSprites(c: Phaser.GameObjects.Container) {
  return {
    living: c.getData("livingSprite") as Phaser.GameObjects.Sprite | undefined,
    soul: c.getData("soulSprite") as Phaser.GameObjects.Sprite | undefined,
  };
}

function playRowanPose(
  c: Phaser.GameObjects.Container,
  dir: string,
  moving: boolean,
) {
  const { living, soul } = getRowanSprites(c);
  const anims = c.scene.anims;
  if (living) {
    const key = rowanAnimKey("living", dir, !moving);
    if (anims.exists(key) && living.anims.currentAnim?.key !== key) {
      living.play(key);
    }
  }
  if (soul) {
    const key = rowanAnimKey("soul", dir, !moving);
    if (anims.exists(key) && soul.anims.currentAnim?.key !== key) {
      soul.play(key);
    }
  }
}

export function makeRowan(
  scene: Phaser.Scene,
  x: number,
  y: number,
  skin: RowanSkin = "living",
) {
  const c = scene.add.container(x, y);

  const livingSprite = scene.add
    .sprite(0, 0, "rowan_living", 0)
    .setOrigin(0.5, 0.7);
  const soulSprite = scene.add
    .sprite(0, 0, "rowan_soul", 0)
    .setOrigin(0.5, 0.7);

  if (scene.anims.exists(rowanAnimKey("living", "down", true))) {
    livingSprite.play(rowanAnimKey("living", "down", true));
  }
  if (scene.anims.exists(rowanAnimKey("soul", "down", true))) {
    soulSprite.play(rowanAnimKey("soul", "down", true));
  }

  livingSprite.setAlpha(skin === "living" ? 1 : 0);
  soulSprite.setAlpha(skin === "soul" ? 0.85 : 0);
  soulSprite.setTint(0xeaf2ff);

  c.add([livingSprite, soulSprite]);
  c.setSize(16, 24);
  c.setData("livingSprite", livingSprite);
  c.setData("soulSprite", soulSprite);
  c.setData("sprite", skin === "soul" ? soulSprite : livingSprite);
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

  // --- ART UPGRADE: idle breathing for both layers ---
  const idleBopLiving = scene.tweens.add({
    targets: livingSprite,
    scaleY: 1.04,
    scaleX: 0.98,
    y: livingSprite.y - 0.5,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });
  const idleBopSoul = scene.tweens.add({
    targets: soulSprite,
    scaleY: 1.04,
    scaleX: 0.98,
    y: soulSprite.y - 0.5,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });
  c.setData("idleBops", [idleBopLiving, idleBopSoul]);

  // --- ART UPGRADE: contextual footsteps ---
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
  const { living, soul } = getRowanSprites(c);
  if (!living || !soul) return;

  c.setData("skin", skin);

  living.setAlpha(skin === "living" ? 1 : 0);
  living.clearTint();

  soul.setAlpha(skin === "soul" ? 0.85 : 0);
  soul.setTint(0xeaf2ff);

  const accs = c.getData("accessories") as
    | Record<string, Phaser.GameObjects.Sprite>
    | undefined;
  if (accs) {
    Object.values(accs).forEach((a) => {
      a.setVisible(skin === "living");
      a.setAlpha(1);
      a.clearTint();
    });
  }

  c.setData("transitionAmount", skin === "soul" ? 1 : 0);
  c.setData("sprite", skin === "soul" ? soul : living);
  c.setData("lastTrail", 0);

  const dir = (c.getData("dir") as string) ?? "down";
  playRowanPose(c, dir, false);
}

export function setRowanTransition(
  c: Phaser.GameObjects.Container,
  amount: number,
) {
  const a = Phaser.Math.Clamp(amount, 0, 1);
  const { living, soul } = getRowanSprites(c);
  if (!living || !soul) return;

  living.setAlpha(Phaser.Math.Linear(1, 0, a));
  living.clearTint();

  const r = Math.round(Phaser.Math.Linear(220, 240, a));
  const g = Math.round(Phaser.Math.Linear(232, 252, a));
  const b = Math.round(Phaser.Math.Linear(245, 255, a));
  const soulTint = Phaser.Display.Color.GetColor(r, g, b);

  soul.setAlpha(Phaser.Math.Linear(0, 0.85, a));
  soul.setTint(soulTint);

  const accs = c.getData("accessories") as
    | Record<string, Phaser.GameObjects.Sprite>
    | undefined;
  if (accs) {
    Object.values(accs).forEach((acc) => {
      if (!acc.visible) return;
      acc.setAlpha(Phaser.Math.Linear(1, 0.3, a));
      acc.setTint(soulTint);
    });
  }

  c.setData("transitionAmount", a);
  c.setData("sprite", a >= 0.5 ? soul : living);
  c.setData("lastTrail", 0);

  const dir = (c.getData("dir") as string) ?? "down";
  playRowanPose(c, dir, false);
}

export function animateRowan(
  c: Phaser.GameObjects.Container,
  dx: number,
  dy: number,
) {
  const { living, soul } = getRowanSprites(c);
  if (!living || !soul) return;

  const scene = c.scene;
  let dir = c.getData("dir") as string;
  const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
  const transitionAmount = (c.getData("transitionAmount") as number) ?? 0;
  const active =
    transitionAmount >= 0.5 || c.getData("skin") === "soul" ? soul : living;

  if (moving) {
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
    else dir = dy > 0 ? "down" : "up";
    c.setData("dir", dir);

    playRowanPose(c, dir, true);

    const idleBops = c.getData("idleBops") as
      | Phaser.Tweens.Tween[]
      | undefined;
    idleBops?.forEach((t) => {
      if (t.isPlaying()) t.pause();
    });

    const now = scene.time.now;

    const skin = (c.getData("skin") as RowanSkin | undefined) ?? "living";
    const shouldEmitGhostTrail =
      skin === "soul" || transitionAmount >= 0.55;

    // Ethereal ghost trails only belong to soul / near-soul states.
    if (shouldEmitGhostTrail && now - ((c.getData("lastTrail") as number) || 0) > 120) {
      c.setData("lastTrail", now);
      const ghost = scene.add
        .sprite(c.x, c.y, active.texture.key, active.frame.name)
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

    const footsteps = c.getData("footsteps") as
      | Phaser.GameObjects.Particles.ParticleEmitter
      | undefined;
    if (footsteps && now % 250 < 30) {
      const isWater = ["Albedo", "Nigredo", "ImaginalRealm"].includes(
        scene.scene.key,
      );
      footsteps.particleTint = isWater ? 0x88c0e8 : 0xd8a060;
      footsteps.emitParticleAt(c.x, c.y + 8, 1);
    }

    let walkTimer = (c.getData("walkTimer") as number) || 0;
    walkTimer += scene.game.loop.delta;
    c.setData("walkTimer", walkTimer);

    const bopSpeed = 0.015;
    const yOff = Math.sin(walkTimer * bopSpeed) * 1.5;
    const sy = 1 + Math.sin(walkTimer * bopSpeed) * 0.04;
    const sx = 1 - Math.sin(walkTimer * bopSpeed) * 0.02;
    [living, soul].forEach((sprite) => {
      sprite.y = yOff;
      sprite.scaleY = sy;
      sprite.scaleX = sx;
    });
  } else {
    playRowanPose(c, dir, false);

    if ((c.getData("walkTimer") as number) !== 0) {
      c.setData("walkTimer", 0);
      scene.tweens.add({
        targets: [living, soul],
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: "Sine.out",
        onComplete: () => {
          const idleBops = c.getData("idleBops") as
            | Phaser.Tweens.Tween[]
            | undefined;
          idleBops?.forEach((t) => {
            if (t.isPaused()) t.resume();
          });
        },
      });
    }
  }

  const accs = c.getData("accessories") as
    | Record<string, Phaser.GameObjects.Sprite>
    | undefined;
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
  let i = 0;
  let active = true;
  let typing = false;
  let fullText = "";
  let currentWho = "";
  let typeTimer: Phaser.Time.TimerEvent | null = null;
  let autoTimer: Phaser.Time.TimerEvent | null = null;

  const publishDialog = (visibleText: string) => {
    setDialogSnapshot({
      open: true,
      speaker: currentWho,
      text: visibleText,
      fullText,
      typing,
      waitingForConfirm: !typing,
    });
    // Promote dialogue to the shell modal stack on desktop. Touch shell
    // already routes dialogue through the same tray, so this is a safe
    // single-source-of-truth signal for both presentation modes.
    setModalSnapshot({
      surface: "dialog",
      mode: "shell",
      title: currentWho || null,
      subtitle: null,
      blocking: true,
    });
  };

  const scheduleAuto = () => {
    autoTimer?.remove(false);
    autoTimer = null;
    const ms = getControls().dialogAutoAdvanceMs;
    if (ms > 0 && !typing && active) {
      autoTimer = scene.time.delayedCall(ms, () => next());
    }
  };

  const finishTyping = () => {
    if (typeTimer) {
      typeTimer.remove(false);
      typeTimer = null;
    }
    typing = false;
    publishDialog(fullText);
    scheduleAuto();
  };

  const startTyping = (s: string) => {
    fullText = s;
    typing = true;
    let n = 0;
    publishDialog("");
    if (typeTimer) typeTimer.remove(false);
    typeTimer = scene.time.addEvent({
      delay: 28,
      repeat: s.length - 1,
      callback: () => {
        n++;
        const slice = s.slice(0, n);
        publishDialog(slice);
        const ch = s[n - 1];
        if (n % 4 === 0 && ch && ch !== " ") getAudio().sfx("dialog");
        if (n >= s.length) {
          typing = false;
          typeTimer = null;
          publishDialog(fullText);
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
      cleanupKb();
      scene.events.off("vinput-action", next);
      clearDialogSnapshot();
      // Release the modal stack only if it still belongs to dialog —
      // otherwise an inquiry/settings/lore handoff already replaced it.
      if (getGameUiSnapshot().modal.surface === "dialog") {
        clearModalSnapshot();
      }
      onDone?.();
      return;
    }
    const line = lines[i];
    currentWho = line.who;
    startTyping(line.text.toUpperCase());
    i++;
  };

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
