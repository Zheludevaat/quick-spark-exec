import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, fitSingleLineText } from "../gbcArt";
import {
  getControls,
  setBinding,
  setTouchLayout,
  setButtonSize,
  setHaptics,
  setLeftHanded,
  setDialogAutoAdvance,
  setInterfaceMode,
  resetControls,
  keyLabel,
  normalizeKeyEvent,
  type GameAction,
  type TouchLayout,
  type ButtonSize,
  type InterfaceMode,
} from "../controls";
import { getAudio } from "../audio";

/**
 * Full-screen settings overlay rendered inside the active scene.
 *
 * Pages:
 *   1) MAIN — touch layout, button size, left-handed, haptics, auto-advance, audio mute, LCD
 *   2) KEYS — rebind every game action (press a key to assign primary; B to clear secondary)
 */

type Page = "main" | "keys";

const ACTION_ORDER: GameAction[] = [
  "up",
  "down",
  "left",
  "right",
  "action",
  "cancel",
  "lore",
  "settings",
  "skip",
  "mute",
  "lcd",
];
const ACTION_LABEL: Record<GameAction, string> = {
  up: "MOVE UP",
  down: "MOVE DOWN",
  left: "MOVE LEFT",
  right: "MOVE RIGHT",
  action: "A / CONFIRM",
  cancel: "B / WITNESS",
  lore: "LORE LOG",
  settings: "SETTINGS",
  skip: "SKIP DIALOG",
  mute: "MUTE",
  lcd: "CRT OVERLAY",
};

export function openSettings(scene: Phaser.Scene, onClose?: () => void) {
  let page: Page = "main";
  let cursor = 0;
  let rebindAction: GameAction | null = null;
  let rebindSlot: "primary" | "secondary" = "primary";

  const dim = scene.add
    .rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0.86)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(950)
    .setInteractive();
  const box = drawGBCBox(scene, 4, 12, GBC_W - 8, GBC_H - 24, 951);
  // Row 1: static title + tab hint
  const title = new GBCText(scene, 8, 16, "SETTINGS", {
    color: COLOR.textAccent,
    depth: 952,
    scrollFactor: 0,
  });
  const tabHint = new GBCText(scene, GBC_W - 56, 16, "← → TABS", {
    color: COLOR.textDim,
    depth: 952,
    scrollFactor: 0,
  });
  // Row 2: page subtitle (re-targeted in render())
  const subtitle = new GBCText(scene, 8, 26, "", {
    color: COLOR.textGold,
    depth: 952,
    scrollFactor: 0,
  });
  const closeHint = new GBCText(scene, 8, GBC_H - 18, "B/ESC: CLOSE", {
    color: COLOR.textDim,
    depth: 952,
    scrollFactor: 0,
  });

  // Reserved column geometry for left labels and right values.
  const LEFT_X = 16;
  const LEFT_W = 78;
  const RIGHT_X = GBC_W - 56;
  const RIGHT_W = 48;
  const HINT_W = GBC_W - 12;

  // Page body: re-built on each render
  const bodyObjs: Phaser.GameObjects.GameObject[] = [];
  /** Labels of the main page rows in their currently-rendered order.
   *  Dispatch routes by label so dynamic rows (e.g. legacy TOUCH OVERLAY) can
   *  appear/disappear without index drift. */
  let mainRowLabels: string[] = [];
  const clearBody = () => {
    bodyObjs.forEach((o) => {
      try {
        o.destroy();
      } catch {
        /* ignore */
      }
    });
    bodyObjs.length = 0;
  };

  const render = () => {
    clearBody();
    const c = getControls();
    if (page === "main") {
      subtitle.setText("DISPLAY & TOUCH");
      const audio = getAudio();
      const volPct = Math.round(audio.volume * 100);
      const isTouchMode = c.interfaceMode === "touch_landscape";
      const rows: { label: string; value: string }[] = [
        {
          label: "INTERFACE MODE",
          value: isTouchMode ? "TOUCH" : "DESKTOP",
        },
        { label: "BUTTON SIZE", value: c.buttonSize.toUpperCase() },
        { label: "LEFT-HANDED", value: c.leftHanded ? "ON" : "OFF" },
        { label: "HAPTICS", value: c.haptics ? "ON" : "OFF" },
        {
          label: "DIALOG AUTO-ADV",
          value: c.dialogAutoAdvanceMs === 0 ? "OFF" : `${c.dialogAutoAdvanceMs}MS`,
        },
        { label: "VOLUME", value: audio.muted ? "MUTED" : `${volPct}%` },
        { label: "AUDIO", value: audio.muted ? "OFF" : "ON" },
        // Legacy in-canvas touch overlay — only relevant when not in the
        // shell-driven touch_landscape mode.
        ...(isTouchMode
          ? []
          : [{ label: "TOUCH OVERLAY (LEGACY)", value: c.touchLayout.toUpperCase() }]),
        { label: "REBIND KEYS →", value: "" },
        { label: "RESET DEFAULTS", value: "" },
      ];
      cursor = Math.max(0, Math.min(cursor, rows.length - 1));
      rows.forEach((r, idx) => {
        const y = 38 + idx * 9;
        const isCur = idx === cursor;
        const arrow = new GBCText(scene, 8, y, isCur ? "▶" : " ", {
          color: COLOR.textAccent,
          depth: 952,
          scrollFactor: 0,
        });
        const lbl = new GBCText(scene, LEFT_X, y, fitSingleLineText(r.label, LEFT_W), {
          color: isCur ? COLOR.textAccent : COLOR.textLight,
          depth: 952,
          scrollFactor: 0,
        });
        const val = new GBCText(scene, RIGHT_X, y, fitSingleLineText(r.value, RIGHT_W), {
          color: COLOR.textGold,
          depth: 952,
          scrollFactor: 0,
        });
        bodyObjs.push(arrow.obj, lbl.obj, val.obj);
      });
      // Remember current rows for activate/adjust dispatch.
      mainRowLabels = rows.map((r) => r.label);
      const hint = new GBCText(
        scene,
        8,
        GBC_H - 28,
        fitSingleLineText("↑↓ NAV  ←→ CHANGE  A SELECT", HINT_W),
        {
          color: COLOR.textDim,
          depth: 952,
          scrollFactor: 0,
        },
      );
      bodyObjs.push(hint.obj);
    } else if (page === "keys") {
      subtitle.setText("KEY BINDINGS");
      cursor = Math.max(0, Math.min(cursor, ACTION_ORDER.length - 1));
      ACTION_ORDER.forEach((a, idx) => {
        const y = 38 + idx * 9;
        const isCur = idx === cursor;
        const b = c.bindings[a];
        const arrow = new GBCText(scene, 6, y, isCur ? "▶" : " ", {
          color: COLOR.textAccent,
          depth: 952,
          scrollFactor: 0,
        });
        const lbl = new GBCText(scene, LEFT_X - 3, y, fitSingleLineText(ACTION_LABEL[a], LEFT_W), {
          color: isCur ? COLOR.textAccent : COLOR.textLight,
          depth: 952,
          scrollFactor: 0,
        });
        const right = `${keyLabel(b.primary)}${b.secondary ? `/${keyLabel(b.secondary)}` : ""}`;
        const val = new GBCText(scene, RIGHT_X, y, fitSingleLineText(right, RIGHT_W), {
          color: COLOR.textGold,
          depth: 952,
          scrollFactor: 0,
        });
        bodyObjs.push(arrow.obj, lbl.obj, val.obj);
      });
      const hintText = rebindAction
        ? `PRESS KEY: ${ACTION_LABEL[rebindAction]} (${rebindSlot.toUpperCase()})`
        : "A: REBIND PRIMARY  TAB: SECONDARY";
      const hint = new GBCText(scene, 6, GBC_H - 28, fitSingleLineText(hintText, HINT_W), {
        color: rebindAction ? COLOR.textAccent : COLOR.textDim,
        depth: 952,
        scrollFactor: 0,
      });
      bodyObjs.push(hint.obj);
    }
  };
  render();

  // ---- Input ----
  const cycleInterfaceMode = () => {
    const order: InterfaceMode[] = ["desktop", "touch_landscape"];
    const i = order.indexOf(getControls().interfaceMode);
    setInterfaceMode(order[(i + 1) % order.length]);
  };
  const cycleLayout = (dir: 1 | -1) => {
    const order: TouchLayout[] = ["dpad", "swipe", "hybrid", "off"];
    const i = order.indexOf(getControls().touchLayout);
    setTouchLayout(order[(i + dir + order.length) % order.length]);
  };
  const cycleSize = (dir: 1 | -1) => {
    const order: ButtonSize[] = ["s", "m", "l", "xl"];
    const i = order.indexOf(getControls().buttonSize);
    setButtonSize(order[(i + dir + order.length) % order.length]);
  };
  const cycleAuto = (dir: 1 | -1) => {
    const order = [0, 1500, 2500, 4000];
    const i = order.indexOf(getControls().dialogAutoAdvanceMs);
    const next = order[((i < 0 ? 0 : i) + dir + order.length) % order.length];
    setDialogAutoAdvance(next);
  };

  /** Dispatch a left/right (dir) on the focused main-page row by label. */
  const adjustMain = (dir: 1 | -1) => {
    const label = mainRowLabels[cursor];
    switch (label) {
      case "INTERFACE MODE":
        cycleInterfaceMode();
        break;
      case "BUTTON SIZE":
        cycleSize(dir);
        break;
      case "LEFT-HANDED":
        setLeftHanded(!getControls().leftHanded);
        break;
      case "HAPTICS":
        setHaptics(!getControls().haptics);
        break;
      case "DIALOG AUTO-ADV":
        cycleAuto(dir);
        break;
      case "VOLUME": {
        const a = getAudio();
        if (a.muted) a.setMuted(false);
        a.setVolume(a.volume + dir * 0.1);
        break;
      }
      case "AUDIO": {
        const a = getAudio();
        a.setMuted(!a.muted);
        break;
      }
      case "TOUCH OVERLAY (LEGACY)":
        cycleLayout(dir);
        break;
      default:
        break;
    }
    getAudio().sfx("cursor");
    render();
  };

  /** Activate (A) on the focused main-page row by label. */
  const activateMain = () => {
    const label = mainRowLabels[cursor];
    if (label === "REBIND KEYS →") {
      page = "keys";
      cursor = 0;
    } else if (label === "RESET DEFAULTS") {
      resetControls();
    } else {
      adjustMain(1);
      return;
    }
    getAudio().sfx("confirm");
    render();
  };

  const close = () => {
    getAudio().sfx("cancel");
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener("keydown", onKey);
    scene.events.off("vinput-action", onAction);
    scene.events.off("vinput-cancel", onCancel);
    scene.events.off("vinput-down", onDir);
    dim.destroy();
    box.destroy();
    title.destroy();
    tabHint.destroy();
    subtitle.destroy();
    closeHint.destroy();
    clearBody();
    onClose?.();
  };

  const onAction = () => {
    if (rebindAction) return; // ignore A while waiting for a key
    if (page === "main") activateMain();
    else if (page === "keys") {
      rebindAction = ACTION_ORDER[cursor];
      rebindSlot = "primary";
      render();
    }
  };
  const onCancel = () => {
    if (rebindAction) {
      rebindAction = null;
      render();
      return;
    }
    if (page === "keys") {
      page = "main";
      cursor = 7;
      render();
      return;
    }
    close();
  };
  const onDir = (d: string) => {
    if (rebindAction) return;
    if (d === "up") {
      cursor = Math.max(0, cursor - 1);
      getAudio().sfx("cursor");
      render();
    } else if (d === "down") {
      const max = page === "main" ? 8 : ACTION_ORDER.length - 1;
      cursor = Math.min(max, cursor + 1);
      getAudio().sfx("cursor");
      render();
    } else if (d === "left") {
      if (page === "main") adjustMain(-1);
      else {
        page = "main";
        cursor = 0;
        render();
      }
    } else if (d === "right") {
      if (page === "main") adjustMain(1);
      else {
        /* already on keys */
      }
    }
  };

  const onKey = (e: KeyboardEvent) => {
    const name = normalizeKeyEvent(e);
    if (!name) return;
    // Rebinding mode swallows all keys.
    if (rebindAction) {
      e.preventDefault();
      if (name === "ESC") {
        rebindAction = null;
        render();
        return;
      }
      const cur = getControls().bindings[rebindAction];
      if (rebindSlot === "primary") setBinding(rebindAction, name, cur.secondary);
      else setBinding(rebindAction, cur.primary, name);
      rebindAction = null;
      getAudio().sfx("confirm");
      render();
      return;
    }
    const c = getControls();
    if (
      name === c.bindings.cancel.primary ||
      name === c.bindings.cancel.secondary ||
      name === "ESC"
    ) {
      onCancel();
      return;
    }
    if (name === c.bindings.action.primary || name === c.bindings.action.secondary) {
      onAction();
      return;
    }
    if (name === c.bindings.up.primary || name === c.bindings.up.secondary) {
      onDir("up");
      return;
    }
    if (name === c.bindings.down.primary || name === c.bindings.down.secondary) {
      onDir("down");
      return;
    }
    if (name === c.bindings.left.primary || name === c.bindings.left.secondary) {
      onDir("left");
      return;
    }
    if (name === c.bindings.right.primary || name === c.bindings.right.secondary) {
      onDir("right");
      return;
    }
    if (name === "TAB" && page === "keys" && !rebindAction) {
      e.preventDefault();
      rebindAction = ACTION_ORDER[cursor];
      rebindSlot = "secondary";
      render();
    }
  };

  window.addEventListener("keydown", onKey);
  scene.events.on("vinput-action", onAction);
  scene.events.on("vinput-cancel", onCancel);
  scene.events.on("vinput-down", onDir);

  // Safety net: if the scene shuts down (e.g. user triggers a scene change
  // via a touch button while settings is open), make sure we drop the DOM
  // listener so it doesn't leak across scenes.
  const safetyCleanup = () => {
    window.removeEventListener("keydown", onKey);
  };
  scene.events.once("shutdown", safetyCleanup);
  scene.events.once("destroy", safetyCleanup);
}
