import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../gbcArt";
import {
  getControls, setBinding, setTouchLayout, setButtonSize, setHaptics,
  setLeftHanded, setDialogAutoAdvance, resetControls,
  keyLabel, normalizeKeyEvent, type GameAction, type TouchLayout, type ButtonSize,
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
  "up", "down", "left", "right", "action", "cancel", "lore", "settings", "skip", "mute", "lcd",
];
const ACTION_LABEL: Record<GameAction, string> = {
  up: "MOVE UP", down: "MOVE DOWN", left: "MOVE LEFT", right: "MOVE RIGHT",
  action: "A / CONFIRM", cancel: "B / WITNESS",
  lore: "LORE LOG", settings: "SETTINGS",
  skip: "SKIP DIALOG", mute: "MUTE", lcd: "CRT OVERLAY",
};

export function openSettings(scene: Phaser.Scene, onClose?: () => void) {
  let page: Page = "main";
  let cursor = 0;
  let rebindAction: GameAction | null = null;
  let rebindSlot: "primary" | "secondary" = "primary";

  const dim = scene.add.rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0.86)
    .setOrigin(0, 0).setScrollFactor(0).setDepth(950).setInteractive();
  const box = drawGBCBox(scene, 4, 12, GBC_W - 8, GBC_H - 24, 951);
  const title = new GBCText(scene, 8, 16, "SETTINGS", { color: COLOR.textAccent, depth: 952, scrollFactor: 0 });
  const tabHint = new GBCText(scene, GBC_W - 70, 16, "← → TABS", { color: COLOR.textDim, depth: 952, scrollFactor: 0 });
  const closeHint = new GBCText(scene, 8, GBC_H - 18, "B/ESC: CLOSE", { color: COLOR.textDim, depth: 952, scrollFactor: 0 });

  // Page body: re-built on each render
  const bodyObjs: Phaser.GameObjects.GameObject[] = [];
  const clearBody = () => { bodyObjs.forEach(o => { try { o.destroy(); } catch { /* ignore */ } }); bodyObjs.length = 0; };

  const render = () => {
    clearBody();
    const c = getControls();
    if (page === "main") {
      title.setText("SETTINGS · DISPLAY & TOUCH");
      const rows: { label: string; value: string }[] = [
        { label: "TOUCH LAYOUT",    value: c.touchLayout.toUpperCase() },
        { label: "BUTTON SIZE",     value: c.buttonSize.toUpperCase() },
        { label: "LEFT-HANDED",     value: c.leftHanded ? "ON" : "OFF" },
        { label: "HAPTICS",         value: c.haptics ? "ON" : "OFF" },
        { label: "DIALOG AUTO-ADV", value: c.dialogAutoAdvanceMs === 0 ? "OFF" : `${c.dialogAutoAdvanceMs}MS` },
        { label: "REBIND KEYS →",   value: "" },
        { label: "RESET DEFAULTS",  value: "" },
      ];
      cursor = Math.max(0, Math.min(cursor, rows.length - 1));
      rows.forEach((r, idx) => {
        const y = 30 + idx * 11;
        const isCur = idx === cursor;
        const arrow = new GBCText(scene, 8, y, isCur ? "▶" : " ", {
          color: COLOR.textAccent, depth: 952, scrollFactor: 0,
        });
        const lbl = new GBCText(scene, 16, y, r.label, {
          color: isCur ? COLOR.textAccent : COLOR.textLight, depth: 952, scrollFactor: 0,
        });
        const val = new GBCText(scene, GBC_W - 50, y, r.value, {
          color: COLOR.textGold, depth: 952, scrollFactor: 0,
        });
        bodyObjs.push(arrow.obj, lbl.obj, val.obj);
      });
      const hint = new GBCText(scene, 8, GBC_H - 28, "↑↓ NAV  ←→ CHANGE  A SELECT", {
        color: COLOR.textDim, depth: 952, scrollFactor: 0,
      });
      bodyObjs.push(hint.obj);
    } else if (page === "keys") {
      title.setText("SETTINGS · KEYS");
      cursor = Math.max(0, Math.min(cursor, ACTION_ORDER.length - 1));
      ACTION_ORDER.forEach((a, idx) => {
        const y = 26 + idx * 8;
        const isCur = idx === cursor;
        const b = c.bindings[a];
        const arrow = new GBCText(scene, 6, y, isCur ? "▶" : " ", {
          color: COLOR.textAccent, depth: 952, scrollFactor: 0,
        });
        const lbl = new GBCText(scene, 13, y, ACTION_LABEL[a], {
          color: isCur ? COLOR.textAccent : COLOR.textLight, depth: 952, scrollFactor: 0,
        });
        const right = `${keyLabel(b.primary)}${b.secondary ? ` / ${keyLabel(b.secondary)}` : ""}`;
        const val = new GBCText(scene, GBC_W - 64, y, right, {
          color: COLOR.textGold, depth: 952, scrollFactor: 0,
        });
        bodyObjs.push(arrow.obj, lbl.obj, val.obj);
      });
      const hint = new GBCText(scene, 6, GBC_H - 28,
        rebindAction ? `PRESS A KEY FOR ${ACTION_LABEL[rebindAction]} (${rebindSlot.toUpperCase()})` : "A: REBIND PRIMARY  TAB: SECONDARY",
        { color: rebindAction ? COLOR.textAccent : COLOR.textDim, depth: 952, scrollFactor: 0, maxWidthPx: GBC_W - 12 },
      );
      bodyObjs.push(hint.obj);
    }
  };
  render();

  // ---- Input ----
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

  const adjustMain = (dir: 1 | -1) => {
    switch (cursor) {
      case 0: cycleLayout(dir); break;
      case 1: cycleSize(dir); break;
      case 2: setLeftHanded(!getControls().leftHanded); break;
      case 3: setHaptics(!getControls().haptics); break;
      case 4: cycleAuto(dir); break;
    }
    getAudio().sfx("cursor");
    render();
  };

  const activateMain = () => {
    switch (cursor) {
      case 5: page = "keys"; cursor = 0; break;
      case 6: resetControls(); break;
      default: adjustMain(1); return;
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
    dim.destroy(); box.destroy(); title.destroy(); tabHint.destroy(); closeHint.destroy();
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
    if (rebindAction) { rebindAction = null; render(); return; }
    if (page === "keys") { page = "main"; cursor = 5; render(); return; }
    close();
  };
  const onDir = (d: string) => {
    if (rebindAction) return;
    if (d === "up") { cursor = Math.max(0, cursor - 1); getAudio().sfx("cursor"); render(); }
    else if (d === "down") {
      const max = page === "main" ? 6 : ACTION_ORDER.length - 1;
      cursor = Math.min(max, cursor + 1); getAudio().sfx("cursor"); render();
    } else if (d === "left") {
      if (page === "main") adjustMain(-1);
      else { page = "main"; cursor = 0; render(); }
    } else if (d === "right") {
      if (page === "main") adjustMain(1);
      else { /* already on keys */ }
    }
  };

  const onKey = (e: KeyboardEvent) => {
    const name = normalizeKeyEvent(e); if (!name) return;
    // Rebinding mode swallows all keys.
    if (rebindAction) {
      e.preventDefault();
      if (name === "ESC") { rebindAction = null; render(); return; }
      const cur = getControls().bindings[rebindAction];
      if (rebindSlot === "primary") setBinding(rebindAction, name, cur.secondary);
      else setBinding(rebindAction, cur.primary, name);
      rebindAction = null;
      getAudio().sfx("confirm");
      render();
      return;
    }
    const c = getControls();
    if (name === c.bindings.cancel.primary || name === c.bindings.cancel.secondary || name === "ESC") { onCancel(); return; }
    if (name === c.bindings.action.primary || name === c.bindings.action.secondary) { onAction(); return; }
    if (name === c.bindings.up.primary    || name === c.bindings.up.secondary)    { onDir("up"); return; }
    if (name === c.bindings.down.primary  || name === c.bindings.down.secondary)  { onDir("down"); return; }
    if (name === c.bindings.left.primary  || name === c.bindings.left.secondary)  { onDir("left"); return; }
    if (name === c.bindings.right.primary || name === c.bindings.right.secondary) { onDir("right"); return; }
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
}
